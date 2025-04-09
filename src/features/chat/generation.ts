// src/features/chat/generation.ts
import openai from "@/shared/openai";
import cache from "@/shared/cache";
import config from "@/shared/config";
import { ChatCompletionMessageParam, SearchResult } from "./types";
import crypto from "crypto";
import { ExternalServiceError, AppError } from "@/shared/errors";
import OpenAI from "openai";

const { chatModel, temperature } = config.openai;
const { cachePrefix } = config.llm;

/**
 * 검색된 컨텍스트와 사용자 질문을 기반으로 LLM 프롬프트를 생성합니다.
 * @param query - 사용자 질문
 * @param searchResults - 벡터 검색 결과
 * @returns OpenAI API에 전달될 메시지 배열
 */
function buildPrompt(
  query: string,
  searchResults: SearchResult[],
): ChatCompletionMessageParam[] {
  const contextText =
    searchResults.length > 0
      ? searchResults
          .map(
            (r, i) => `[참고 ${i + 1} - 문서: ${r.doc_name}]\n${r.chunk_text}`,
          )
          .join("\n\n---\n\n")
      : "관련된 참고 문서를 찾지 못했습니다.";

  // 시스템 프롬프트 개선: 역할, 목표, 제약조건 명시
  const systemPrompt = `당신은 사용자가 업로드한 문서를 기반으로 질문에 답변하는 AI 어시스턴트입니다.
주어진 [참고 문서] 내용을 바탕으로 사용자의 [질문]에 대해 명확하고 간결하게 한국어로 답변해야 합니다.
참고 문서에 질문과 관련된 내용이 전혀 없거나 부족할 경우, "관련된 내용을 찾을 수 없습니다." 또는 "정보가 부족하여 답변하기 어렵습니다." 와 같이 솔직하게 답변해주세요.
내용을 추측하거나 일반적인 지식을 기반으로 답변하지 마세요. 답변은 참고 문서의 내용을 기반으로 해야 합니다.`;

  const userPrompt = `[참고 문서]\n${contextText}\n\n---\n\n[질문]\n${query}`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

/**
 * 캐시 키 생성을 위한 간단한 해시 함수
 */
function generateCacheKey(query: string, contextText: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(query + "||" + contextText);
  return `${cachePrefix}${hash.digest("hex")}`;
}

/**
 * 검색 결과와 사용자 질문을 바탕으로 OpenAI LLM을 호출하여 답변을 생성합니다. (캐싱 적용)
 * @param query - 사용자 질문
 * @param searchResults - 벡터 검색 결과
 * @returns 생성된 답변 문자열 Promise
 * @throws {ExternalServiceError | AppError} LLM 호출 실패 또는 응답 오류 시
 */
export async function generateLlmResponse(
  query: string,
  searchResults: SearchResult[],
): Promise<string> {
  const contextText =
    searchResults.length > 0
      ? searchResults.map((r) => r.chunk_text).join("\n\n") // 캐시 키 생성용 컨텍스트
      : "";
  const cacheKey = generateCacheKey(query, contextText);

  // 1. 캐시 확인
  const cachedAnswer = cache.get<string>(cacheKey);
  if (cachedAnswer) {
    console.log(
      `Cache hit for LLM answer: Query="${query.substring(0, 30)}..."`,
    );
    return cachedAnswer;
  }

  // 2. 프롬프트 구성
  const messages = buildPrompt(query, searchResults);
  console.log("Generated LLM Prompt:", JSON.stringify(messages, null, 2));

  // 3. LLM 호출
  try {
    const completion = await openai.chat.completions.create({
      model: chatModel,
      messages: messages,
      temperature: temperature,
      // max_tokens: 500, // 필요시 설정
    });

    const answer = completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      console.error("LLM returned empty content.");
      throw new AppError("AI model returned an empty response.");
    }

    // 4. 캐시에 저장
    cache.set(cacheKey, answer);
    console.log(`Stored LLM answer in cache: Key=${cacheKey}`);

    return answer;
  } catch (error) {
    console.error("Error calling OpenAI Chat Completions API:", error);
    if (error instanceof OpenAI.APIError) {
      // OpenAI API 에러 처리 (e.g., rate limit, auth)
      throw new ExternalServiceError(
        `OpenAI API error: ${error.status} ${error.name} ${error.message}`,
      );
    } else if (error instanceof AppError) {
      throw error; // AppError는 그대로 throw
    } else if (error instanceof Error) {
      throw new ExternalServiceError(
        `Failed to generate LLM response: ${error.message}`,
      );
    } else {
      throw new ExternalServiceError(
        "An unknown error occurred while calling the LLM.",
      );
    }
  }
}
