import pdf from "pdf-parse"; // pdf-parse 라이브러리 import
import { Buffer } from "buffer"; // Node.js Buffer 타입

/**
 * 파일 버퍼와 MIME 타입(혹은 파일명)을 받아 텍스트 내용을 추출합니다.
 * @param fileBuffer - 파일 내용이 담긴 Buffer 객체
 * @param mimeType - 파일의 MIME 타입 (예: 'application/pdf', 'text/plain')
 * @returns 추출된 텍스트 문자열을 담은 Promise
 * @throws 지원하지 않는 파일 타입이거나 파싱 오류 발생 시 에러 throw
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  console.log(`Attempting to extract text for MIME type: ${mimeType}`);
  try {
    if (mimeType === "application/pdf") {
      const data = await pdf(fileBuffer);
      console.log(`Successfully extracted ${data.numpages} pages from PDF.`);
      return data.text;
    } else if (mimeType === "text/plain") {
      const text = fileBuffer.toString("utf-8");
      console.log(`Successfully read text file (length: ${text.length}).`);
      return text;
    } else {
      console.warn(`Unsupported file type for text extraction: ${mimeType}`);
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Error extracting text for ${mimeType}:`, error);
    throw new Error(
      `Failed to extract text from file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
