// src/lib/vectorSearch.ts

import { getDb } from "./db"; // DB 인스턴스 가져오기
import { getEmbeddings } from "./embeddingGenerator"; // 임베딩 생성 함수
import type { Database } from "better-sqlite3";

// 검색 결과의 타입을 정의하는 인터페이스
export interface SearchResult {
  id: number; // chunks 테이블의 ID (벡터의 rowid와 동일)
  doc_id: string; // 원본 문서의 ID
  chunk_text: string; // 검색된 유사 텍스트 청크
  distance: number; // 쿼리 벡터와의 거리 (유사도 척도, 낮을수록 유사)
  doc_name: string; // 원본 문서의 이름
}

/**
 * 사용자 쿼리와 유사한 텍스트 청크를 데이터베이스에서 검색합니다.
 * @param query - 사용자의 검색 쿼리 문자열
 * @param limit - 반환할 최대 결과 수 (기본값: 3)
 * @returns 검색 결과 배열 (SearchResult[]) Promise
 */
export async function searchSimilarChunks(
  query: string,
  limit: number = 3 // 기본적으로 상위 3개 결과 반환
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    console.log("Search query is empty.");
    return [];
  }

  try {
    // 1. 사용자 쿼리 텍스트를 임베딩 벡터로 변환
    const queryEmbedding = await getEmbeddings(query);
    if (queryEmbedding.length === 0) {
      console.log("Could not generate embedding for the query.");
      return [];
    }

    // 임베딩 벡터를 SQLite BLOB으로 저장하기 위해 Buffer로 변환
    const queryVectorBuffer = Buffer.from(
      new Float32Array(queryEmbedding).buffer
    );

    // 2. 데이터베이스에서 유사 벡터 검색 (sqlite-vss 사용)
    const db = getDb();

    // SQL 쿼리 준비:
    // - vss_chunks 테이블에서 vss_search 함수로 유사 벡터 검색 (rowid, distance 반환)
    // - 찾은 rowid를 사용해 chunks 테이블과 JOIN하여 chunk_text, doc_id 얻기
    // - chunks.doc_id를 사용해 documents 테이블과 JOIN하여 원본 문서 이름(doc_name) 얻기
    // - distance 기준으로 정렬하여 가장 유사한 순서대로 반환
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
            WHERE vss_search(embedding, vss_search_params(?, ?)) -- param 1: vector, param 2: internal limit
            ORDER BY distance ASC
            LIMIT ? -- param 3: final limit
        ) AS v_search
    JOIN chunks c ON c.id = v_search.rowid
    JOIN documents d ON d.id = c.doc_id
    ORDER BY v_search.distance ASC;
  `;

    const stmt = db.prepare(searchQuery);

    // 쿼리 실행: 파라미터 바인딩 (쿼리 벡터 버퍼, 검색 제한 수, 최종 제한 수)
    const results = stmt.all(queryVectorBuffer, limit, limit) as SearchResult[];

    console.log(
      `Found ${results.length} similar chunks for query: "${query.substring(0, 50)}..."`
    );
    // console.log(results); // 필요시 결과 로깅

    return results;
  } catch (error) {
    console.error("Error during similarity search:", error);
    // 검색 중 오류 발생 시 빈 배열 반환 또는 에러 throw
    // throw error;
    return [];
  }
}
