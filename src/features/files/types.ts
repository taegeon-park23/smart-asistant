// src/features/files/types.ts

/**
 * 파일 메타데이터 타입 정의
 */
export interface FileMetadata {
  id: string; // 고유 파일 ID
  name: string; // 원본 파일 이름
  type?: string; // MIME 타입 (선택적, ListObjectsV2에서는 제공 안됨)
  size?: number; // 파일 크기 (bytes) (선택적)
  s3Key: string; // S3 객체 키
  createdAt?: string | Date; // 생성/업로드 시간 (선택적)
}

/**
 * S3에서 ListObjectsV2로 조회 시 사용될 수 있는 객체 타입 (부분)
 */
export interface S3ListObject {
  Key?: string;
  Size?: number;
  LastModified?: Date;
  ETag?: string;
}
