// src/shared/db.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import config from "./config";
import { ConfigError } from "./errors";

const { directory: dbDirName, fileName: dbFileName } = config.db;
const embeddingDimension = config.openai.embeddingDimension;

// 데이터베이스 파일 경로 (컨테이너 내부 경로)
const dbDir = path.join(process.cwd(), dbDirName);
const dbPath = path.join(dbDir, dbFileName);

// 싱글턴 패턴으로 DB 인스턴스 관리
let dbInstance: Database.Database | null = null;

/**
 * 데이터베이스 연결을 초기화하고 필요한 확장 기능 로드 및 테이블 생성을 수행합니다.
 * @returns 초기화된 better-sqlite3 Database 인스턴스
 */
function initializeDatabase(): Database.Database {
  console.log(`Initializing database at: ${dbPath}`);

  // 1. 데이터베이스 디렉토리 생성 (없으면)
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory: ${dbDir}`);
    }
  } catch (err) {
    console.error("Error creating database directory:", err);
    throw new ConfigError(
      `Failed to create database directory: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 2. 데이터베이스 연결 (파일 없으면 자동 생성)
  let db: Database.Database;
  try {
    db = new Database(dbPath, {
      // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    });
    console.log("Database connection established.");
  } catch (connectionError) {
    console.error("Error connecting to database:", connectionError);
    throw new ConfigError(
      `Failed to connect to database: ${connectionError instanceof Error ? connectionError.message : String(connectionError)}`,
    );
  }

  // 3. sqlite-vss 확장 기능 로드 (vector0 -> vss0 순서 중요!)
  try {
    // Dockerfile에서 다운로드한 경로와 일치해야 함
    const vector0ExtensionPath = "/usr/local/lib/vector0.so"; // 실제 파일 이름 확인 필요
    const vss0ExtensionPath = "/usr/local/lib/vss0.so"; // 실제 파일 이름 확인 필요

    db.loadExtension(vector0ExtensionPath);
    console.log(
      `Successfully loaded SQLite extension from ${vector0ExtensionPath}`,
    );

    db.loadExtension(vss0ExtensionPath);
    console.log(
      `Successfully loaded SQLite extension from ${vss0ExtensionPath}`,
    );
  } catch (extensionError) {
    console.error("Failed to load SQLite vector extensions:", extensionError);
    db.close(); // 확장 로드 실패 시 연결 닫기
    throw new ConfigError(
      `Failed to load SQLite vector extensions: ${extensionError instanceof Error ? extensionError.message : String(extensionError)}`,
    );
  }

  // 4. 필요한 테이블 생성 (IF NOT EXISTS 사용으로 반복 실행 안전)
  try {
    // 문서 메타데이터 저장 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,           -- 파일 고유 ID (fileId)
        name TEXT NOT NULL,            -- 원본 파일 이름
        type TEXT,                     -- 파일 MIME 타입
        size INTEGER,                  -- 파일 크기 (bytes)
        s3Key TEXT NOT NULL UNIQUE,    -- S3 객체 키
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP -- 업로드 시간
      );
    `);

    // 텍스트 청크 테이블 (Vector ID는 이제 rowid와 동일하게 관리)
    db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY, -- 청크 고유 ID (vss_chunks의 rowid와 동일하게 사용됨)
        doc_id TEXT NOT NULL,                 -- 문서 ID (documents.id 참조)
        chunk_text TEXT NOT NULL,             -- 분할된 텍스트 내용
        FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
      );
    `);
    // doc_id에 인덱스 생성 (성능 향상)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);`);

    // sqlite-vss 벡터 저장 및 검색용 가상 테이블
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vss_chunks USING vss0(
        embedding(${embeddingDimension}) -- 벡터 차원 지정
      );
    `);

    console.log("Database tables checked/created.");
  } catch (tableError) {
    console.error("Error creating database tables:", tableError);
    db.close(); // 테이블 생성 실패 시 연결 닫기
    throw new ConfigError(
      `Failed to create database tables: ${tableError instanceof Error ? tableError.message : String(tableError)}`,
    );
  }

  // WAL 모드 활성화 (동시성 및 성능 향상에 도움될 수 있음)
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL"); // WAL 모드에서 성능 개선

  return db;
}

/**
 * 데이터베이스 인스턴스를 가져옵니다. (없으면 초기화)
 * @returns better-sqlite3 Database 인스턴스
 * @throws {ConfigError} 초기화 실패 시
 */
export function getDb(): Database.Database {
  if (!dbInstance) {
    try {
      dbInstance = initializeDatabase();
    } catch (initError) {
      console.error("Failed to initialize database instance:", initError);
      // DB 초기화 실패는 심각한 문제이므로 애플리케이션 시작을 막을 수 있음
      throw initError; // ConfigError를 다시 throw
    }
  }
  return dbInstance;
}

// 애플리케이션 종료 시 DB 연결을 닫도록 설정 (Graceful shutdown)
let isShuttingDown = false;
const cleanup = () => {
  if (!isShuttingDown && dbInstance) {
    isShuttingDown = true;
    console.log("Closing database connection due to app termination...");
    dbInstance.close();
    console.log("Database connection closed.");
    dbInstance = null; // 인스턴스 참조 제거
  }
};

// SIGINT: Ctrl+C, SIGTERM: kill 명령어 등
process.on("exit", cleanup);
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception, attempting to close DB...", err);
  cleanup();
  process.exit(1); // 비정상 종료 코드
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Optionally attempt cleanup, but be cautious as state might be unstable
  // cleanup();
  process.exit(1); // 비정상 종료 코드
});
