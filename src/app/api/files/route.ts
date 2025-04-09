// src/app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listFiles, uploadFile } from "@/features/files/services"; // 서비스 계층 함수 import
import { FileMetadata } from "@/features/files/types";
import { AppError, BadRequestError } from "@/shared/errors";

// GET /api/files - 파일 목록 조회
export async function GET(_req: NextRequest) {
  try {
    const files = await listFiles(); // 서비스 함수 호출
    return NextResponse.json(files);
  } catch (error) {
    console.error("[API GET /files] Error fetching file list:", error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch file list";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

// POST /api/files - 파일 업로드
export async function POST(req: NextRequest) {
  try {
    // 1. 요청에서 파일 정보 추출
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new BadRequestError("No file provided in the request.");
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileType = file.type || "application/octet-stream"; // 타입 없으면 기본값
    const fileSize = file.size;

    // 입력 유효성 검사 (예: 파일 크기 제한, 허용된 타입)
    // if (fileSize > MAX_FILE_SIZE) throw new BadRequestError("File size exceeds limit.");
    // if (!ALLOWED_FILE_TYPES.includes(fileType)) throw new BadRequestError("File type not allowed.");

    // 2. 서비스 계층 함수 호출
    const metadata: FileMetadata = await uploadFile(
      fileBuffer,
      fileName,
      fileType,
      fileSize,
    );

    // 3. 성공 응답 반환
    return NextResponse.json(
      {
        message: "File uploaded successfully. Processing started.",
        fileId: metadata.id,
        metadata: {
          // API 응답에 필요한 메타데이터만 포함
          id: metadata.id,
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          s3Key: metadata.s3Key,
          createdAt: metadata.createdAt, // DB에서 설정된 값 포함 (선택적)
        },
      },
      { status: 201 }, // 201 Created
    );
  } catch (error: unknown) {
    console.error("[API POST /files] Error processing file upload:", error);

    // 에러 타입에 따른 상태 코드 및 메시지 설정
    let statusCode = 500;
    let message = "Failed to process file upload";

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      message = error.message;
    } else if (error instanceof Error) {
      // 예상치 못한 내부 오류
      message = `Internal server error: ${error.message}`;
    }

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
