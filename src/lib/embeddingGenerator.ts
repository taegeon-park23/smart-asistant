// src/lib/embeddingGenerator.ts
import openai from "./openaiClient"; // 위에서 설정한 클라이언트 import

const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * 주어진 텍스트에 대한 OpenAI 임베딩 벡터를 생성합니다.
 * @param text - 임베딩을 생성할 텍스트 문자열. 비어있지 않아야 합니다.
 * @returns 임베딩 벡터 배열 (number[]).
 * @throws API 호출 실패 또는 응답 형식 오류 시 에러 throw.
 */
export async function getEmbeddings(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    // OpenAI API는 빈 문자열 입력 시 오류를 반환하므로 미리 처리
    console.warn("Attempted to get embeddings for empty text.");
    // 빈 배열을 반환하거나 에러를 throw 할 수 있습니다. 요구사항에 따라 결정.
    // 여기서는 빈 배열을 반환하여 호출 측에서 처리하도록 합니다.
    return [];
    // 또는 throw new Error("Input text cannot be empty.");
  }

  // API는 입력 문자열의 개행 문자를 이스케이프 처리하는 것이 좋습니다.
  const inputText = text.replace(/\n/g, " ");

  try {
    console.log(
      `Requesting embeddings for text (first 50 chars): "${inputText.substring(0, 50)}..."`
    );
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: inputText,
      // encoding_format: "float", // 기본값은 float
      // dimensions: 1536 // text-embedding-3-small의 기본/최대 차원. 명시적으로 지정 가능.
    });

    // 응답 구조 확인 및 임베딩 추출
    if (
      response.data &&
      response.data.length > 0 &&
      response.data[0].embedding
    ) {
      console.log(
        `Embeddings received successfully. Dimension: ${response.data[0].embedding.length}`
      );
      return response.data[0].embedding;
    } else {
      // 예상치 못한 응답 형식
      console.error(
        "Invalid response structure from OpenAI Embeddings API:",
        response
      );
      throw new Error("Invalid response structure from OpenAI Embeddings API.");
    }
  } catch (error) {
    console.error("Error getting embeddings from OpenAI:", error);
    // API 키 오류, 네트워크 오류, Rate Limit 등 다양한 에러 처리
    throw new Error(
      `Failed to get embeddings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
