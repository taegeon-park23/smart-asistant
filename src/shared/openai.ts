// src/shared/openai.ts
import OpenAI from "openai";
import config from "./config";
import { ConfigError } from "./errors";

const { apiKey } = config.openai;

if (!apiKey) {
  // ConfigError는 서버 시작 시 발생하므로 throw 가능
  throw new ConfigError("OPENAI_API_KEY is not set in environment variables.");
}

const openai = new OpenAI({
  apiKey: apiKey,
  // 필요시 추가 설정 (e.g., timeout, maxRetries)
});

console.log("OpenAI client initialized.");

export default openai;
