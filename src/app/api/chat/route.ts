// 예시: /api/chat/route.ts (간략화된 흐름)
import { NextRequest, NextResponse } from "next/server";
import { SearchResult, searchSimilarChunks } from "@/lib/vectorSearch"; // 벡터 검색 함수 import
import openai from "@/lib/openaiClient"; // OpenAI 클라이언트
import { ChatCompletionMessageParam } from "openai/src/resources.js";
import crypto from "crypto"; // 캐시 키 생성을 위한 해시 사용
import cache from "@/lib/cache";

const LLM_MODEL = "gpt-4o-mini";
const LLM_CACHE_KEY_PREFIX = "llm_answer_";

// 간단한 해시 함수 (캐시 키 생성용)
function generateCacheKey(message: string, context: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(message + "||" + context); // 메시지와 컨텍스트 조합
  return `${LLM_CACHE_KEY_PREFIX}${hash.digest("hex")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Message is required and must be a non-empty string" },
        { status: 400 },
      );
    }
    console.log(`Received chat message: ${message}`);

    let searchResults: SearchResult[] = [];
    try {
      searchResults = await searchSimilarChunks(message, 3); // 상위 3개 검색
      console.log(`Found ${searchResults.length} relevant chunks.`);
    } catch (searchError) {
      console.error("Error during vector search:", searchError);
      return NextResponse.json(
        { error: "Failed to search relevant documents" },
        { status: 500 },
      );
    }

    const contextText =
      searchResults.length > 0
        ? searchResults
            .map(
              (r, i) =>
                `[참고 ${i + 1} - 문서: ${r.doc_name}]\n${r.chunk_text}`,
            ) // 출처 명시 개선
            .join("\n\n---\n\n") // 청크 구분 명확화
        : "관련된 참고 문서를 찾지 못했습니다.";

    const llmCacheKey = generateCacheKey(message, contextText);

    const cachedAnswer = cache.get<string>(llmCacheKey);
    if (cachedAnswer) {
      console.log(
        `Cache hit for LLM answer: Query="${message.substring(0, 30)}..."`,
      );
      return NextResponse.json({ answer: cachedAnswer });
    }

    // 3. LLM 프롬프트 구성
    // 참고 문서에 질문과 관련된 내용이 전혀 없거나 부족할 경우, "문서에서 관련 내용을 찾을 수 없습니다." 또는 "정보가 부족하여 답변하기 어렵습니다." 와 같이 솔직하게 답변해주세요. 내용을 추측하거나 일반적인 지식을 기반으로 답변하지 마세요.
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `당신은 사용자가 업로드한 문서를 기반으로 질문에 답변하는 AI 어시스턴트입니다. 제공되는 [참고 문서] 내용을 바탕으로 사용자의 [질문]에 대해 명확하고 간결하게 한국어로 답변해야 합니다.`,
      },
      {
        role: "user",
        content: `\n[참고 문서]\n${contextText}\n\n---\n\n[질문]\n${message}\n`,
      },
    ];
    console.log(messages);

    let llmAnswer = "답변 생성 중 오류가 발생했습니다."; // 기본 오류 메시지
    try {
      const completion = await openai.chat.completions.create({
        model: LLM_MODEL,
        messages: messages,
        temperature: 0.3, // RAG에서는 낮은 temperature가 일반적으로 더 좋음 (사실 기반 응답)
        // max_tokens: 500, // 필요시 최대 토큰 제한
      });

      llmAnswer = completion.choices[0]?.message?.content?.trim() || llmAnswer; // 응답 추출, 실패 시 기본 메시지 유지
      cache.set(llmCacheKey, llmAnswer);
      console.log(`Stored LLM answer in cache: Key=${llmCacheKey}`);
    } catch (llmError) {
      console.error("Error calling OpenAI API:", llmError);
      return NextResponse.json(
        { error: "AI model interaction failed" },
        { status: 500 },
      );
    }

    console.log(`Generated Answer: ${llmAnswer}`);
    return NextResponse.json({
      answer: llmAnswer,
      // context: searchResults // 디버깅 완료 후 제거 고려
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 },
    );
  }
}
