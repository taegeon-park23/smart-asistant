// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse } from "@/features/chat/services"; // 서비스 계층 함수 import
import { AppError, BadRequestError } from "@/shared/errors";

// POST /api/chat - 채팅 메시지 처리
export async function POST(req: NextRequest) {
  try {
    // 1. 요청 본문 파싱 및 유효성 검사
    const body = await req.json();
    const message = body.message;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      throw new BadRequestError(
        "Message is required and must be a non-empty string.",
      );
    }

    // 입력 길이 제한 등 추가 검사 가능
    // if (message.length > MAX_QUERY_LENGTH) throw new BadRequestError("Message is too long.");

    console.log(
      `[API POST /chat] Received message: ${message.substring(0, 100)}...`,
    );

    // 2. 서비스 계층 함수 호출
    const response = await generateChatResponse(message);

    // 3. 성공 응답 반환
    return NextResponse.json(response); // { answer: "..." } 형태
  } catch (error: unknown) {
    console.error("[API POST /chat] Error processing chat message:", error);

    // 에러 타입에 따른 상태 코드 및 메시지 설정
    let statusCode = 500;
    let message = "Failed to process chat message";

    if (error instanceof BadRequestError) {
      statusCode = 400;
      message = error.message;
    } else if (error instanceof AppError) {
      // 서비스 계층에서 발생한 오류 (DB, S3, OpenAI 등)
      statusCode = error.statusCode;
      message = error.message;
    } else if (error instanceof Error) {
      // 예상치 못한 내부 오류
      message = `Internal server error: ${error.message}`;
    }

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
