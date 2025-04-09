// src/app/api/files/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/features/files/services"; // 서비스 계층 함수 import
import { AppError, NotFoundError, BadRequestError } from "@/shared/errors";

// DELETE /api/files/{fileId} - 파일 삭제
export async function DELETE(
  _req: NextRequest, // 요청 객체 사용하지 않으므로 _req로 표시
  { params }: { params: { fileId: string } },
) {
  const fileIdToDelete = params.fileId;

  try {
    // 1. 입력 유효성 검사 (fileId 존재 여부)
    if (!fileIdToDelete || typeof fileIdToDelete !== "string") {
      throw new BadRequestError("File ID is required and must be a string.");
    }

    // 2. 서비스 계층 함수 호출
    await deleteFile(fileIdToDelete);

    // 3. 성공 응답 반환
    return NextResponse.json({
      message: `File with ID '${fileIdToDelete}' deleted successfully.`,
    });
  } catch (error: unknown) {
    console.error(
      `[API DELETE /files/${fileIdToDelete}] Error deleting file:`,
      error,
    );

    // 에러 타입에 따른 상태 코드 및 메시지 설정
    let statusCode = 500;
    let message = "Failed to delete file";

    if (error instanceof NotFoundError) {
      statusCode = 404;
      message = error.message;
    } else if (error instanceof BadRequestError) {
      statusCode = 400;
      message = error.message;
    } else if (error instanceof AppError) {
      // 다른 서비스 계층 오류 (e.g., S3 접근 불가)
      statusCode = error.statusCode;
      message = error.message;
    } else if (error instanceof Error) {
      // 예상치 못한 내부 오류
      message = `Internal server error: ${error.message}`;
    }

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
