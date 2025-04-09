// src/features/chat/types.ts

/**
 * 벡터 검색 결과 타입 정의
 */
export interface SearchResult {
  id: number; // chunks 테이블의 ID
  doc_id: string; // 원본 문서의 ID
  chunk_text: string; // 검색된 유사 텍스트 청크
  distance: number; // 쿼리 벡터와의 거리 (낮을수록 유사)
  doc_name: string; // 원본 문서의 이름
}

/**
 * LLM 호출 시 사용될 메시지 타입 (OpenAI 기준)
 */
export interface ChatCompletionMessageParam {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 채팅 API 응답 타입
 */
export interface ChatResponse {
  answer: string;
  // context?: SearchResult[]; // 필요시 컨텍스트 정보 포함
}
