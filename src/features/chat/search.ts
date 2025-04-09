// src/features/chat/search.ts
import { Buffer } from "buffer";
import { getDb } from "@/shared/db";
// **** generateEmbeddingWithCache import 경로 및 사용 확인 ****
import { generateEmbeddingWithCache } from "../documents/vectorization"; // 캐싱 기능 포함된 임베딩 함수 사용
import { SearchResult } from "./types";
import config from "@/shared/config";
import { AppError, ExternalServiceError } from "@/shared/errors";

/**
 * 사용자 쿼리와 유사한 텍스트 청크를 데이터베이스에서 검색합니다.
 * @param query - 사용자의 검색 쿼리 문자열
 * @param limit - 반환할 최대 결과 수 (기본값: 설정 파일 값)
 * @returns 검색 결과 배열 (SearchResult[]) Promise
 * @throws {AppError | ExternalServiceError} 임베딩 생성 또는 DB 검색 실패 시
 */
export async function searchSimilarChunks(
  query: string,
  limit: number = config.vectorSearch.defaultLimit,
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    console.log("Search query is empty.");
    return [];
  }

  try {
    // 1. 사용자 쿼리 텍스트를 임베딩 벡터로 변환 (캐싱 사용)
    const queryEmbedding = await generateEmbeddingWithCache(query); // Correctly uses the imported function

    // 임베딩 벡터를 SQLite BLOB으로 저장하기 위해 Buffer로 변환
    const queryVectorBuffer = Buffer.from(
      new Float32Array(queryEmbedding).buffer,
    );

    // 2. 데이터베이스에서 유사 벡터 검색 (sqlite-vss 사용)
    const db = getDb();
    const searchQuery = `
      SELECT
          c.id,
          c.doc_id,
          c.chunk_text,
          v_search.distance,
          d.name as doc_name
      FROM
          (
              SELECT rowid, distance
              FROM vss_chunks
              WHERE vss_search(embedding, vss_search_params(?, ?))
              ORDER BY distance ASC
              LIMIT ?
          ) AS v_search
      JOIN chunks c ON c.id = v_search.rowid
      JOIN documents d ON d.id = c.doc_id
      ORDER BY v_search.distance ASC;
    `;

    const stmt = db.prepare(searchQuery);
    const internalLimit = Math.max(limit * 5, 10);
    const results = stmt.all(
      queryVectorBuffer,
      internalLimit,
      limit,
    ) as SearchResult[];

    console.log(
      `Found ${results.length} similar chunks for query: "${query.substring(0, 50)}..."`,
    );
    return results;
  } catch (error) {
    console.error("Error during similarity search:", error);
    if (error instanceof ExternalServiceError) {
      throw error;
    } else if (error instanceof Error) {
      throw new AppError(`Similarity search failed: ${error.message}`);
    } else {
      throw new AppError("An unknown error occurred during similarity search.");
    }
  }
}
