// src/features/documents/textExtraction.ts
import pdf from "pdf-parse";
import { Buffer } from "buffer";
import { BadRequestError, AppError } from "@/shared/errors";

/**
 * 파일 버퍼와 MIME 타입을 받아 텍스트 내용을 추출합니다.
 * @param fileBuffer - 파일 내용이 담긴 Buffer 객체
 * @param mimeType - 파일의 MIME 타입 (예: 'application/pdf', 'text/plain')
 * @param fileName - (로깅용) 파일 이름
 * @returns 추출된 텍스트 문자열 Promise
 * @throws {BadRequestError} 지원하지 않는 파일 타입일 경우
 * @throws {AppError} 파싱 오류 발생 시
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  console.log(
    `Attempting to extract text from ${fileName} (Type: ${mimeType})`,
  );
  try {
    if (mimeType === "application/pdf") {
      // pdf-parse 옵션 추가 (선택적)
      const options = {
        // max: 10, // 처리할 최대 페이지 수 (0은 제한 없음)
      };
      const data = await pdf(fileBuffer, options);
      console.log(
        `Successfully extracted ${data.numpages} pages from PDF: ${fileName}`,
      );
      // 정제 로직 추가 (예: 과도한 공백 제거, 특수 문자 처리 등)
      const cleanedText = data.text.replace(/\s+/g, " ").trim();
      return cleanedText;
    } else if (mimeType === "text/plain") {
      // UTF-8 인코딩 시도, 실패 시 다른 인코딩 고려 가능성 (복잡)
      const text = fileBuffer.toString("utf-8");
      const cleanedText = text.replace(/\s+/g, " ").trim();
      console.log(
        `Successfully read text file: ${fileName} (Length: ${cleanedText.length})`,
      );
      return cleanedText;
    } else {
      // 지원하지 않는 타입은 명시적으로 에러 처리
      console.warn(
        `Unsupported file type for text extraction: ${mimeType} (${fileName})`,
      );
      throw new BadRequestError(
        `Unsupported file type for text extraction: ${mimeType}`,
      );
    }
  } catch (error) {
    console.error(`Error extracting text from ${fileName}:`, error);
    if (error instanceof BadRequestError) throw error;
    throw new AppError(
      `Failed to extract text from file ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
