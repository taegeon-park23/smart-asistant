// src/features/documents/services.ts
import { getDb } from "@/shared/db";
import { extractTextFromFile } from "./textExtraction";
import { simpleChunkText } from "./chunking";
import { storeChunksAndEmbeddings } from "./vectorization";
import { AppError } from "@/shared/errors";

/**
 * 문서를 처리하는 전체 파이프라인 (텍스트 추출, 청킹, 임베딩 저장).
 * 오류 발생 시 로그를 남기고 에러를 throw 합니다.
 * @param docId - 처리할 문서의 ID
 * @param fileBuffer - 파일 내용 버퍼
 * @param fileType - 파일 MIME 타입
 * @param fileName - 파일 이름 (로깅용)
 */
export async function processDocument(
  docId: string,
  fileBuffer: Buffer,
  fileType: string,
  fileName: string,
): Promise<void> {
  console.log(`Starting document processing pipeline for ID: ${docId}`);
  try {
    // 1. 텍스트 추출
    const extractedText = await extractTextFromFile(
      fileBuffer,
      fileType,
      fileName,
    );

    if (!extractedText || extractedText.trim().length === 0) {
      console.log(
        `No text extracted or text is empty for ${fileName}. Skipping further processing.`,
      );
      return; // 텍스트 없으면 처리 중단
    }

    // 2. 텍스트 청킹
    const chunks = simpleChunkText(extractedText); // TODO: 더 나은 청킹 전략 사용 고려

    if (chunks.length === 0) {
      console.log(`No chunks generated for ${fileName}. Skipping embedding.`);
      return; // 청크 없으면 처리 중단
    }

    // 3. 임베딩 생성 및 DB 저장
    const db = getDb();
    await storeChunksAndEmbeddings(db, docId, chunks);

    console.log(
      `Document processing pipeline finished successfully for ID: ${docId}`,
    );
  } catch (error) {
    console.error(
      `Error in document processing pipeline for ID ${docId}:`,
      error,
    );
    // 여기서 발생한 에러는 uploadFile의 catch 블록으로 전달됨
    if (error instanceof AppError || error instanceof Error) {
      throw new AppError(
        `Document processing failed for ${fileName}: ${error.message}`,
      );
    } else {
      throw new AppError(
        `An unknown error occurred while processing ${fileName}.`,
      );
    }
  }
}
