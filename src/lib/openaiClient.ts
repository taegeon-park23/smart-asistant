// src/lib/openaiClient.ts
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  // 실제 운영 환경에서는 더 정교한 에러 처리나 로깅이 필요할 수 있습니다.
  // 로컬 개발 중에는 키가 없으면 에러를 발생시켜 설정을 강제하는 것이 좋습니다.
  throw new Error("OPENAI_API_KEY is not set in environment variables.");
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export default openai;
