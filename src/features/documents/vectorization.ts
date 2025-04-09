// src/features/documents/vectorization.ts
import Database from "better-sqlite3";
import openai from "@/shared/openai";
import config from "@/shared/config";
import cache from "@/shared/cache"; // 캐시 import
import { AppError, ExternalServiceError } from "@/shared/errors";

const { embeddingModel } = config.openai;
const EMBEDDING_CACHE_PREFIX = "embedding_"; // 임베딩 캐시 키 접두사

/**
 * 주어진 텍스트 청크에 대한 OpenAI 임베딩 벡터를 생성합니다. (캐싱 적용)
 * @param textChunk - 임베딩을 생성할 텍스트 조각.
 * @returns 임베딩 벡터 배열 (number[]).
 * @throws {AppError | ExternalServiceError} API 호출 실패 또는 응답 오류 시.
 */
export async function generateEmbeddingWithCache(
  textChunk: string
): Promise<number[]> {
  if (!textChunk || textChunk.trim().length === 0) {
    throw new AppError("Input text chunk cannot be empty.");
  }

  const cacheKey = `${EMBEDDING_CACHE_PREFIX}${textChunk.substring(0, 100)}`;
  const cachedEmbedding = cache.get<number[]>(cacheKey);
  if (cachedEmbedding) {
    console.log(`Cache hit for embedding: "${textChunk.substring(0, 30)}..."`);
    return cachedEmbedding;
  }

  try {
    const inputText = textChunk.replace(/\n/g, " ");
    console.log(
      `Requesting embeddings for chunk (first 30 chars): "${inputText.substring(0, 30)}..."`
    );
    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: inputText,
    });

    if (
      response.data &&
      response.data.length > 0 &&
      response.data[0].embedding
    ) {
      const embeddingVector = response.data[0].embedding;
      console.log(`Embedding received. Dimension: ${embeddingVector.length}`);
      cache.set(cacheKey, embeddingVector);
      return embeddingVector;
    } else {
      console.error(
        "Invalid response structure from OpenAI Embeddings API:",
        response
      );
      throw new ExternalServiceError(
        "Invalid response structure from OpenAI Embeddings API."
      );
    }
  } catch (error) {
    console.error("Error getting embeddings from OpenAI:", error);
    throw new ExternalServiceError(
      `Failed to get embeddings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 텍스트 청크와 해당 벡터를 DB에 저장합니다.
 * @param db - better-sqlite3 데이터베이스 인스턴스
 * @param docId - 문서 ID
 * @param chunks - 텍스트 청크 배열
 * @throws {AppError | ExternalServiceError} 임베딩 생성 또는 DB 저장 실패 시
 */
export async function storeChunksAndEmbeddings(
  db: Database.Database,
  docId: string,
  chunks: string[]
): Promise<void> {
  if (chunks.length === 0) {
    console.log(`No chunks to process for document ${docId}.`);
    return;
  }
  console.log(
    `Storing ${chunks.length} chunks and embeddings for document ${docId}...`
  );

  const insertChunkStmt = db.prepare(
    "INSERT INTO chunks (doc_id, chunk_text) VALUES (?, ?) RETURNING id"
  );
  const insertVectorStmt = db.prepare(
    "INSERT INTO vss_chunks (rowid, embedding) VALUES (?, ?)"
  );

  db.exec("BEGIN");
  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      let embeddingVector: number[] = [];

      try {
        embeddingVector = await generateEmbeddingWithCache(chunkText);
      } catch (embeddingError) {
        console.error(
          `Failed to generate embedding for chunk ${i + 1}/${chunks.length} of doc ${docId}. Skipping chunk. Error:`,
          embeddingError
        );
        continue;
      }

      if (embeddingVector.length > 0) {
        // 1. chunks 테이블에 텍스트 삽입하고 chunk_id(rowid) 얻기
        const chunkInsertResult = insertChunkStmt.run(docId, chunkText);

        // **** 타입 오류 수정: 명시적 타입 확인 추가 ****
        let chunkRowId: number | bigint | undefined = undefined;
        if (
          "id" in chunkInsertResult &&
          (typeof chunkInsertResult.id === "number" ||
            typeof chunkInsertResult.id === "bigint")
        ) {
          chunkRowId = chunkInsertResult.id;
        } else if (
          "lastInsertRowid" in chunkInsertResult &&
          (typeof chunkInsertResult.lastInsertRowid === "number" ||
            typeof chunkInsertResult.lastInsertRowid === "bigint")
        ) {
          chunkRowId = chunkInsertResult.lastInsertRowid;
        }
        // **** 수정 끝 ****

        if (chunkRowId !== undefined) {
          const chunkIdNum = Number(chunkRowId); // bigint일 수 있으므로 number로 변환

          // 2. vss_chunks 테이블에 embedding 삽입 (rowid를 chunk의 rowid와 동일하게 사용)
          const vectorBuffer = Buffer.from(
            new Float32Array(embeddingVector).buffer
          );
          insertVectorStmt.run(chunkIdNum, vectorBuffer);

          console.log(`Stored chunk ${chunkIdNum} and vector for doc ${docId}`);
        } else {
          console.warn(
            `Could not get rowid after inserting chunk ${i + 1} for doc ${docId}`
          );
        }
      }
    }
    db.exec("COMMIT");
    console.log(`Successfully stored chunks and embeddings for doc ${docId}`);
  } catch (error) {
    console.error(
      `Error during chunk/embedding storage transaction for doc ${docId}. Rolling back...`,
      error
    );
    db.exec("ROLLBACK");
    if (error instanceof AppError || error instanceof ExternalServiceError) {
      throw error;
    } else if (error instanceof Error) {
      throw new AppError(
        `Database error during embedding storage: ${error.message}`
      );
    } else {
      throw new AppError("Unknown database error during embedding storage.");
    }
  }
}
