// src/app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
// fileMetadataStore는 POST에서 임시로 사용될 수 있으나 GET은 S3 직접 조회
import { fileMetadataStore, FileMetadata } from "./fileStore";
import s3Client from "@/lib/s3Client"; // Adjust path to your s3Client setup
// Import necessary S3 commands
import {
  PutObjectCommand,
  ListObjectsV2Command,
  S3Object, // _Object 대신 S3Object 사용 (SDK v3 스타일)
} from "@aws-sdk/client-s3";
import { extractTextFromFile } from "@/lib/textExtractor"; // Import text extraction function
import { getDb } from "@/lib/db";
import { getEmbeddings } from "@/lib/embeddingGenerator";

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const UPLOAD_PREFIX = "uploads/"; // Define the prefix where files are stored

// GET /api/files - Retrieve list of files directly from S3 (사용자가 제공한 버전 유지)
export async function GET(req: NextRequest) {
  if (!BUCKET_NAME) {
    console.error("S3_BUCKET_NAME environment variable is not set.");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: UPLOAD_PREFIX, // Only list objects within the 'uploads/' directory
    });

    const s3Response = await s3Client.send(listCommand);

    // Process the S3 response to create the metadata list
    const files: Omit<FileMetadata, "type">[] = (s3Response.Contents ?? [])
      // Filter out the directory marker if present and ensure Key exists
      .filter(
        (obj: S3Object) =>
          obj.Key && obj.Key !== UPLOAD_PREFIX && obj.Size !== undefined
      )
      .map((obj: S3Object) => {
        const key = obj.Key!;
        const size = obj.Size!;
        let id = "unknown-id";
        let name = key.replace(UPLOAD_PREFIX, ""); // Default name if parsing fails

        // Attempt to parse id and name from the key (format: uploads/fileId-fileName)
        const keyWithoutPrefix = key.substring(UPLOAD_PREFIX.length);
        const splitKeys = (keyWithoutPrefix as string).split("-");
        if (splitKeys.length > 2) {
          id = `${splitKeys[0]}-${splitKeys[1]}`;
          name = splitKeys[2];
        } else {
          console.warn(`Could not parse fileId and name from S3 key: ${key}`);
        }

        return {
          id: id,
          name: name,
          size: size,
          s3Key: key,
          // NOTE: 'type' (ContentType) is NOT available from ListObjectsV2
          // To get it, a separate HeadObjectCommand per file would be needed (inefficient).
        };
      });

    // Return the processed list
    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching file list from S3:", error);
    // Handle S3 specific errors if needed
    return NextResponse.json(
      { error: "Failed to fetch file list" },
      { status: 500 }
    );
  }
}

/** 1. 요청에서 파일 정보 및 버퍼 추출 */
async function getFileInfoFromRequest(req: NextRequest): Promise<{
  file: File;
  fileBuffer: Buffer;
  fileName: string;
  fileType: string;
  fileSize: number;
}> {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    throw new Error("No file provided"); // 에러 throw하여 상위에서 처리
  }
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  return {
    file,
    fileBuffer,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };
}

/** 2. S3에 파일 업로드 */
async function uploadToS3(
  key: string,
  buffer: Buffer,
  type: string
): Promise<void> {
  if (!BUCKET_NAME) throw new Error("S3_BUCKET_NAME is not configured.");
  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: type,
  });
  await s3Client.send(putCommand);
  console.log(`File uploaded successfully to S3: ${BUCKET_NAME}/${key}`);
}

/** 3. DB에 문서 메타데이터 저장 */
function storeDocumentMetadata(db: Database, metadata: FileMetadata): void {
  try {
    const stmt = db.prepare(
      "INSERT INTO documents (id, name, type, size, s3Key) VALUES (@id, @name, @type, @size, @s3Key)"
    );
    stmt.run(metadata); // 객체를 직접 바인딩 (better-sqlite3 기능)
    console.log(`Metadata for ${metadata.name} saved to database.`);
  } catch (dbError) {
    console.error("Error saving document metadata to database:", dbError);
    // TODO: DB 저장 실패 시 S3 롤백 고려?
    throw dbError; // 에러를 다시 throw하여 파이프라인 중단
  }
}

/** 4. 파일에서 텍스트 추출 */
async function extractText(
  buffer: Buffer,
  type: string,
  name: string
): Promise<string> {
  if (type === "application/pdf" || type === "text/plain") {
    try {
      const text = await extractTextFromFile(buffer, type);
      console.log(`Text extracted from ${name}. Length: ${text.length}`);
      return text;
    } catch (extractionError) {
      console.error(`Failed to extract text from ${name}:`, extractionError);
      return ""; // 추출 실패 시 빈 문자열 반환 (오류를 throw하지 않고 진행)
    }
  } else {
    console.log(`Skipping text extraction for unsupported file type: ${type}`);
    return "";
  }
}

/** 5. 텍스트 청킹 (TODO: 실제 구현 필요) */
function chunkText(text: string): string[] {
  // TODO: 실제 청킹 로직 구현 (예: Langchain RecursiveCharacterTextSplitter 사용)
  // 현재는 임시로 전체 텍스트를 하나의 청크로 반환하거나, 간단히 문단 분리 등 시도
  console.log("Chunking text (using basic placeholder)...");
  if (!text) return [];
  // 매우 기본적인 예시: 빈 줄 기준으로 나누기 (실제로는 더 정교해야 함)
  const chunks = text
    .split(/\n\s*\n/)
    .filter((chunk) => chunk.trim().length > 0);
  console.log(`Split into ${chunks.length} basic chunks.`);
  // 각 청크가 너무 길면 추가 분할 필요
  // 실제로는 토큰 기반 분할기 권장
  return chunks.length > 0 ? chunks : [text]; // 빈 텍스트 처리
}

/** 6. 임베딩 생성 및 DB 저장 */
async function generateAndStoreEmbeddings(
  db: Database,
  docId: string,
  chunks: string[]
): Promise<void> {
  if (chunks.length === 0) {
    console.log("No chunks to process for embeddings.");
    return;
  }
  console.log(
    `Generating and storing embeddings for ${chunks.length} chunks...`
  );

  // better-sqlite3는 트랜잭션 내에서 prepared statement 재사용이 효율적
  const insertChunkStmt = db.prepare(
    "INSERT INTO chunks (doc_id, chunk_text) VALUES (?, ?) RETURNING id" // RETURNING id는 better-sqlite3 v9+ 에서 사용 가능, 하위 버전은 lastInsertRowid 사용
  );
  const insertVectorStmt = db.prepare(
    "INSERT INTO vss_chunks (rowid, embedding) VALUES (?, ?)" // vss_chunks는 rowid를 직접 지정하여 삽입 가능
  );

  // 트랜잭션 시작
  db.exec("BEGIN");
  try {
    for (const chunkText of chunks) {
      let embeddingVector: number[] = [];
      try {
        embeddingVector = await getEmbeddings(chunkText);
      } catch (embeddingError) {
        console.error(
          `Failed to generate embedding for a chunk of doc ${docId}:`,
          embeddingError
        );
        // 특정 청크 임베딩 실패 시 어떻게 처리할지 결정 (예: 건너뛰기)
        continue; // 다음 청크로 넘어감
      }

      if (embeddingVector.length > 0) {
        // 1. chunks 테이블에 텍스트 삽입하고 chunk_id(rowid) 얻기
        // .run().id 는 v9+, 이전 버전은 .run().lastInsertRowid
        const chunkInsertResult = insertChunkStmt.run(docId, chunkText);
        // const chunkRowId = chunkInsertResult.lastInsertRowid;
        const chunkRowId =
          (chunkInsertResult as any).id ?? chunkInsertResult.lastInsertRowid; // 버전 호환성

        if (chunkRowId) {
          // 2. vss_chunks 테이블에 embedding 삽입 (rowid를 chunk의 rowid와 동일하게 사용)
          // 벡터는 일반적으로 Float32Array로 변환하여 저장하는 것이 효율적일 수 있음 (sqlite-vss 문서 확인 필요)
          const vectorBuffer = Buffer.from(
            new Float32Array(embeddingVector).buffer
          );
          insertVectorStmt.run(chunkRowId, vectorBuffer);
          console.log(
            `Stored chunk ${chunkRowId} and its vector for doc ${docId}`
          );
        } else {
          console.warn(
            `Could not get rowid after inserting chunk for doc ${docId}`
          );
        }
      }
    }
    // 모든 작업 성공 시 트랜잭션 커밋
    db.exec("COMMIT");
    console.log(
      `Successfully processed and stored embeddings for doc ${docId}`
    );
  } catch (error) {
    // 오류 발생 시 롤백
    console.error(
      "Error during embedding storage transaction, rolling back:",
      error
    );
    db.exec("ROLLBACK");
    throw error; // 상위 핸들러에서 처리하도록 에러 재발생
  }
}

// --- POST Handler (Refactored Pipeline) ---
export async function POST(req: NextRequest) {
  let fileId: string | null = null; // 에러 발생 시 롤백 위해 필요할 수 있음
  let s3Key: string | null = null;

  try {
    // 1. 요청에서 파일 정보 추출
    const { file, fileBuffer, fileName, fileType, fileSize } =
      await getFileInfoFromRequest(req);

    // 2. 고유 ID 및 S3 키 생성
    fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    s3Key = `${UPLOAD_PREFIX}${fileId}-${fileName}`;

    // 3. S3에 파일 업로드
    await uploadToS3(s3Key, fileBuffer, fileType);

    // 4. 문서 메타데이터 DB 저장 (S3 업로드 성공 후)
    const db = getDb(); // DB 인스턴스 가져오기 (이 시점에 초기화될 수 있음)
    const newMetadata: FileMetadata = {
      id: fileId,
      name: fileName,
      type: fileType,
      size: fileSize,
      s3Key: s3Key,
    };
    storeDocumentMetadata(db, newMetadata); // 함수 호출

    // 5. 텍스트 추출
    const extractedText = await extractText(fileBuffer, fileType, fileName);

    // 6. 텍스트 청킹 및 임베딩 생성/저장 (텍스트가 있을 경우)
    if (extractedText) {
      const chunks = chunkText(extractedText); // TODO: 실제 청킹 로직 개선 필요
      await generateAndStoreEmbeddings(db, fileId, chunks);
    }

    // 7. 성공 응답 반환
    return NextResponse.json(
      {
        message: "File processed successfully",
        fileId: fileId,
        metadata: newMetadata,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // any 대신 unknown 사용 권장 후 타입 체크
    console.error("Error processing file upload pipeline:", error);

    // TODO: 에러 단계별 롤백 로직 추가 (예: DB 저장 실패 시 S3 객체 삭제)

    // Specific error handling (e.g., file not provided)
    if (error.message === "No file provided") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Handle other known errors (S3, DB, Embeddings) if needed

    return NextResponse.json(
      { error: `Failed to process file: ${error.message}` },
      { status: 500 }
    );
  }
}
