// src/features/chat/services.ts
import { searchSimilarChunks } from "./search";
import { generateLlmResponse } from "./generation";
import { ChatResponse } from "./types";
import { AppError } from "@/shared/errors";

/**
 * 사용자 메시지를 받아 관련 문서를 검색하고 LLM을 통해 답변을 생성합니다.
 * @param message - 사용자 질문
 * @returns 생성된 답변과 컨텍스트 정보 Promise
 * @throws {AppError} 검색 또는 생성 과정 중 오류 발생 시
 */
export async function generateChatResponse(
  message: string,
): Promise<ChatResponse> {
  console.log(`Generating chat response for: "${message.substring(0, 50)}..."`);
  try {
    // 1. 유사 문서 검색
    const searchResults = await searchSimilarChunks(message); // search 모듈 사용

    // 2. LLM 답변 생성
    const answer = await generateLlmResponse(message, searchResults); // generation 모듈 사용

    return {
      answer: answer,
      // context: searchResults // 필요시 디버깅용으로 컨텍스트 포함
    };
  } catch (error) {
    console.error(`Error generating chat response for "${message}":`, error);
    // search 및 generation 모듈에서 AppError 또는 ExternalServiceError를 던짐
    if (error instanceof AppError) {
      throw error;
    } else if (error instanceof Error) {
      // 예상치 못한 내부 오류
      throw new AppError(`Failed to generate chat response: ${error.message}`);
    } else {
      throw new AppError(
        "An unknown error occurred while generating the chat response.",
      );
    }
  }
}
