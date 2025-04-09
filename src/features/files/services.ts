// src/features/files/services.ts
import * as storage from "./storage";
import { FileMetadata } from "./types";
import { NotFoundError, AppError, ExternalServiceError } from "@/shared/errors";
import { uploadObject } from "@/shared/s3"; // S3 업로드 함수 직접 사용
import config from "@/shared/config";
import { processDocument } from "../documents/services"; // 문서 처리 서비스 호출

const { uploadPrefix } = config.s3;

/**
 * 파일 목록을 조회합니다.
 * @returns FileMetadata 배열 Promise
 */
export async function listFiles(): Promise<FileMetadata[]> {
  // DB에서 메타데이터를 조회하는 것을 기본으로 함
  try {
    return await storage.listFileMetadataFromDb();
  } catch (error) {
    console.error("Service error listing files:", error);
    // UI에 표시될 정보이므로, DB 오류 시 빈 배열 반환 또는 AppError 발생 가능
    // throw new AppError("Failed to retrieve file list.");
    return []; // 일단 빈 배열 반환
  }
  // S3 직접 조회 방식 (참고용):
  // return await storage.listFilesFromS3();
}

/**
 * 특정 파일을 삭제합니다. S3에서 먼저 삭제하고 DB 메타데이터를 삭제합니다.
 * @param fileId - 삭제할 파일의 ID
 * @throws {NotFoundError} 파일을 찾을 수 없을 때
 * @throws {AppError} 삭제 과정 중 오류 발생 시
 */
export async function deleteFile(fileId: string): Promise<void> {
  console.log(`Attempting to delete file with ID: ${fileId}`);
  let s3Key: string | null = null;
  try {
    // 1. DB에서 S3 키 조회 (파일 존재 여부 확인 겸)
    s3Key = await storage.getS3KeyById(fileId);
    console.log(`Found S3 key for deletion: ${s3Key}`);

    // 2. S3에서 파일 삭제 시도
    await storage.deleteFileFromS3(s3Key);

    // 3. DB에서 메타데이터 삭제 시도 (S3 삭제 성공 또는 NoSuchKey 확인 후)
    const deletedCount = await storage.deleteFileMetadataFromDb(fileId);
    if (deletedCount === 0) {
      // S3 삭제 후 DB 삭제 실패 케이스 (일관성 문제 가능성)
      console.warn(
        `Deleted file from S3 (${s3Key}) but corresponding metadata (ID: ${fileId}) not found or deleted in DB.`,
      );
      // 이 경우 NotFoundError보다는 일반 오류가 적합할 수 있음
      // throw new AppError(`Metadata inconsistency after deleting file ${fileId}.`);
    }

    console.log(`Successfully deleted file ID: ${fileId}`);
  } catch (error) {
    console.error(`Service error deleting file ID ${fileId}:`, error);
    if (error instanceof NotFoundError) {
      throw error; // 404 에러 그대로 전달
    } else if (error instanceof AppError || error instanceof Error) {
      // ExternalServiceError 등 다른 AppError 포함
      throw new AppError(
        `Failed to delete file: ${error.message}`,
        error instanceof AppError ? error.statusCode : 500,
      );
    } else {
      throw new AppError("An unknown error occurred during file deletion.");
    }
  }
}

/**
 * 파일 업로드 및 후처리(텍스트 추출, 임베딩)를 수행합니다.
 * @param fileBuffer - 파일 내용 버퍼
 * @param fileName - 원본 파일 이름
 * @param fileType - 파일 MIME 타입
 * @param fileSize - 파일 크기
 * @returns 생성된 파일 메타데이터
 * @throws {AppError} 업로드 또는 후처리 중 오류 발생 시
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  fileSize: number,
): Promise<FileMetadata> {
  const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const s3Key = `${uploadPrefix}${fileId}-${fileName}`;

  console.log(`Starting upload process for file: ${fileName} (ID: ${fileId})`);

  try {
    // 1. S3에 파일 업로드
    await uploadObject({
      Key: s3Key,
      Body: fileBuffer,
      ContentType: fileType,
      // TODO: 필요시 ACL, Metadata 등 추가 설정
    });

    // 2. DB에 메타데이터 저장
    const metadata: FileMetadata = {
      id: fileId,
      name: fileName,
      type: fileType,
      size: fileSize,
      s3Key: s3Key,
      // createdAt은 DB에서 DEFAULT CURRENT_TIMESTAMP로 자동 설정됨
    };
    storage.storeDocumentMetadata(metadata); // 동기 함수

    // 3. 비동기 후처리 시작 (텍스트 추출 및 임베딩) - 백그라운드 실행 (fire-and-forget)
    // 중요: 에러 처리를 어떻게 할지 결정해야 함.
    //      여기서는 에러 발생 시 로그만 남기고 업로드 자체는 성공으로 간주.
    //      만약 후처리 실패 시 롤백이 필요하면 더 복잡한 로직 필요 (예: 상태 관리, 큐 시스템)
    processDocument(fileId, fileBuffer, fileType, fileName)
      .then(() => {
        console.log(
          `Background processing completed successfully for file ID: ${fileId}`,
        );
      })
      .catch((processingError) => {
        console.error(
          `Background processing failed for file ID ${fileId}:`,
          processingError,
        );
        // TODO: 실패 상태를 DB에 기록하거나, 알림을 보내는 등의 추가 작업 고려
      });

    console.log(
      `File upload successful for ID: ${fileId}. Background processing initiated.`,
    );
    return metadata; // 메타데이터 즉시 반환
  } catch (error) {
    console.error(`Service error uploading file ${fileName}:`, error);
    // S3 업로드 실패 시 롤백 필요 없음 (아직 DB 저장 전)
    // DB 저장 실패 시 S3 객체 삭제 롤백 고려 (storage.storeDocumentMetadata 에서 throw 된 경우)
    if (
      s3Key &&
      error instanceof AppError &&
      error.message.includes("Failed to save document metadata")
    ) {
      console.warn(`Rolling back S3 upload for key ${s3Key} due to DB error.`);
      try {
        await storage.deleteFileFromS3(s3Key);
      } catch (rollbackError) {
        console.error(
          `Failed to rollback S3 upload for key ${s3Key}:`,
          rollbackError,
        );
        // 롤백 실패는 심각한 문제일 수 있으므로 별도 로깅/알림 필요
      }
    }

    if (error instanceof AppError || error instanceof ExternalServiceError) {
      throw error; // 이미 AppError 형태면 그대로 던짐
    } else if (error instanceof Error) {
      throw new AppError(`File upload failed: ${error.message}`);
    } else {
      throw new AppError("An unknown error occurred during file upload.");
    }
  }
}
