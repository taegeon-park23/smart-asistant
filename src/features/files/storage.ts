// src/features/files/storage.ts
import { getDb } from "@/shared/db";
import { listObjects, deleteObject as deleteS3Object } from "@/shared/s3"; // renamed deleteObject to avoid conflict
import config from "@/shared/config";
import { FileMetadata, S3ListObject } from "./types";
import { AppError, ExternalServiceError, NotFoundError } from "@/shared/errors";

const { uploadPrefix } = config.s3;

/**
 * DB에서 파일 메타데이터 목록을 조회합니다.
 * @returns FileMetadata[] Promise
 */
export async function listFileMetadataFromDb(): Promise<FileMetadata[]> {
  try {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT id, name, type, size, s3Key, createdAt FROM documents ORDER BY createdAt DESC",
    );
    // all() 메서드는 동기적으로 실행되지만, 함수 시그니처는 async 유지 (향후 변경 대비)
    const rows = stmt.all() as FileMetadata[];
    return rows;
  } catch (error) {
    console.error("Error listing file metadata from DB:", error);
    throw new AppError("Failed to retrieve file list from database.");
  }
}

/**
 * S3에서 파일 목록을 조회하고 메타데이터 형태로 변환합니다. (Type 정보는 없음)
 * @returns Omit<FileMetadata, 'type' | 'createdAt'>[] Promise
 */
export async function listFilesFromS3(): Promise<
  Omit<FileMetadata, "type" | "createdAt">[]
> {
  try {
    const s3Response = await listObjects({ Prefix: uploadPrefix });

    const files = (s3Response.Contents ?? [])
      .filter(
        (obj: S3ListObject): obj is Required<S3ListObject> =>
          Boolean(obj.Key) &&
          obj.Key !== uploadPrefix &&
          obj.Size !== undefined,
      )
      .map((obj) => {
        const key = obj.Key;
        const size = obj.Size;
        // S3 Key 형식: uploads/{fileId}-{fileName}
        const keyWithoutPrefix = key.substring(uploadPrefix.length);
        const firstHyphenIndex = keyWithoutPrefix.indexOf("-");

        let id = "unknown-id";
        let name = keyWithoutPrefix; // 기본값

        if (firstHyphenIndex > 0) {
          id = keyWithoutPrefix.substring(0, firstHyphenIndex);
          name = keyWithoutPrefix.substring(firstHyphenIndex + 1);
        } else {
          console.warn(`Could not parse fileId and name from S3 key: ${key}`);
        }

        return {
          id: id,
          name: name,
          size: size,
          s3Key: key,
        };
      });
    return files;
  } catch (error) {
    // listObjects에서 ExternalServiceError를 던짐
    console.error("Error listing files from S3:", error);
    if (error instanceof ExternalServiceError) throw error;
    throw new ExternalServiceError("Failed to list files from storage.");
  }
}

/**
 * DB에서 특정 파일 ID에 해당하는 S3 키를 조회합니다.
 * @param fileId - 삭제할 파일의 ID
 * @returns S3 Key 문자열
 * @throws {NotFoundError} 해당 파일 ID가 DB에 없을 경우
 * @throws {AppError} DB 조회 중 오류 발생 시
 */
export async function getS3KeyById(fileId: string): Promise<string> {
  try {
    const db = getDb();
    const stmt = db.prepare("SELECT s3Key FROM documents WHERE id = ?");
    const result = stmt.get(fileId) as { s3Key: string } | undefined;

    if (!result) {
      throw new NotFoundError(`File metadata not found for ID: ${fileId}`);
    }
    return result.s3Key;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error(`Error retrieving S3 key for file ID ${fileId}:`, error);
    throw new AppError("Failed to retrieve file information from database.");
  }
}

/**
 * DB에서 특정 파일 메타데이터를 삭제합니다.
 * @param fileId - 삭제할 파일의 ID
 * @returns 삭제된 행의 수 (보통 1 또는 0)
 * @throws {AppError} DB 삭제 중 오류 발생 시
 */
export async function deleteFileMetadataFromDb(
  fileId: string,
): Promise<number> {
  try {
    const db = getDb();
    const stmt = db.prepare("DELETE FROM documents WHERE id = ?");
    const result = stmt.run(fileId);
    if (result.changes === 0) {
      console.warn(`No metadata found to delete in DB for file ID: ${fileId}`);
    } else {
      console.log(`Metadata deleted from DB for file ID: ${fileId}`);
    }
    return result.changes;
  } catch (error) {
    console.error(
      `Error deleting metadata from DB for file ID ${fileId}:`,
      error,
    );
    throw new AppError("Failed to delete file metadata from database.");
  }
}

/**
 * S3에서 파일을 삭제합니다. (shared/s3의 deleteObject 사용)
 * @param s3Key - 삭제할 파일의 S3 키
 * @throws {ExternalServiceError} S3 삭제 중 오류 발생 시 (NoSuchKey 제외)
 */
export async function deleteFileFromS3(s3Key: string): Promise<void> {
  try {
    await deleteS3Object({ Key: s3Key });
  } catch (error) {
    // deleteS3Object가 ExternalServiceError를 던지거나 NoSuchKey 시 정상 반환
    if (error instanceof ExternalServiceError) {
      console.error(`Error deleting file from S3 (Key: ${s3Key}):`, error);
      throw error; // 에러 재발생
    }
    // NoSuchKey의 경우 deleteS3Object에서 이미 처리됨
  }
}

/**
 * DB에 문서 메타데이터를 저장합니다.
 * @param metadata - 저장할 파일 메타데이터
 * @throws {AppError} DB 저장 실패 시
 */
export function storeDocumentMetadata(metadata: FileMetadata): void {
  try {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO documents (id, name, type, size, s3Key, createdAt) VALUES (@id, @name, @type, @size, @s3Key, datetime('now'))",
    );
    stmt.run(metadata); // 객체를 직접 바인딩
    console.log(
      `Metadata for ${metadata.name} (ID: ${metadata.id}) saved to DB.`,
    );
  } catch (error) {
    console.error("Error saving document metadata to DB:", error);
    throw new AppError("Failed to save document metadata.");
  }
}
