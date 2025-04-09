// src/shared/s3.ts
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import config from "./config";
import { ConfigError, ExternalServiceError } from "./errors";

const {
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  bucketName,
  forcePathStyle,
} = config.s3;

if (!bucketName) {
  // 버킷 이름은 필수
  console.warn("Warning: S3_BUCKET_NAME environment variable is not set.");
  // throw new ConfigError("S3_BUCKET_NAME environment variable is required.");
}

const s3Config: S3ClientConfig = {
  region,
};

if (endpoint) {
  console.log(`Using S3 compatible endpoint: ${endpoint}`);
  s3Config.endpoint = endpoint;
  s3Config.forcePathStyle = forcePathStyle;

  if (accessKeyId && secretAccessKey) {
    s3Config.credentials = { accessKeyId, secretAccessKey };
  } else {
    console.warn(
      "S3 compatible endpoint specified, but credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) might be missing.",
    );
  }
} else {
  console.log(`Using default AWS S3 endpoint for region: ${region}`);
  // AWS 환경에서는 SDK가 자동으로 자격 증명 탐색 (IAM 역할, 환경변수, 자격증명 파일 등)
  if (!accessKeyId || !secretAccessKey) {
    console.warn(
      "Using default AWS S3 endpoint. Credentials not explicitly found in env vars. SDK will attempt auto-discovery.",
    );
  }
}

const s3Client = new S3Client(s3Config);

console.log("S3 client initialized.");

export { s3Client };

// --- S3 Adapter Functions ---

/**
 * S3 버킷에 객체를 업로드합니다.
 * @param input - PutObjectCommandInput (Bucket, Key, Body, ContentType 등)
 * @throws {ExternalServiceError} S3 업로드 실패 시
 */
export async function uploadObject(
  input: Omit<PutObjectCommandInput, "Bucket">,
): Promise<void> {
  if (!config.s3.bucketName)
    throw new ConfigError("S3_BUCKET_NAME is not configured.");
  const command = new PutObjectCommand({
    Bucket: config.s3.bucketName,
    ...input,
  });
  try {
    await s3Client.send(command);
    console.log(
      `Successfully uploaded to S3: ${config.s3.bucketName}/${input.Key}`,
    );
  } catch (error) {
    console.error(`S3 Upload Error (${input.Key}):`, error);
    throw new ExternalServiceError(
      `Failed to upload ${input.Key} to S3: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * S3 버킷에서 객체를 삭제합니다.
 * @param input - DeleteObjectCommandInput (Key 등)
 * @throws {ExternalServiceError} S3 삭제 실패 시 (NoSuchKey 에러는 무시될 수 있음)
 */
export async function deleteObject(
  input: Omit<DeleteObjectCommandInput, "Bucket">,
): Promise<void> {
  if (!config.s3.bucketName)
    throw new ConfigError("S3_BUCKET_NAME is not configured.");
  const command = new DeleteObjectCommand({
    Bucket: config.s3.bucketName,
    ...input,
  });
  try {
    await s3Client.send(command);
    console.log(
      `Successfully deleted from S3: ${config.s3.bucketName}/${input.Key}`,
    );
  } catch (error: unknown) {
    // NoSuchKey 오류는 이미 삭제된 상태이므로 성공으로 간주할 수 있음
    if (error instanceof Error && error.name === "NoSuchKey") {
      console.warn(
        `Object ${input.Key} not found in S3 during deletion, assuming already deleted.`,
      );
      return; // 성공으로 처리
    }
    console.error(`S3 Delete Error (${input.Key}):`, error);
    throw new ExternalServiceError(
      `Failed to delete ${input.Key} from S3: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * S3 버킷의 객체 목록을 조회합니다.
 * @param input - ListObjectsV2CommandInput (Prefix 등)
 * @returns ListObjectsV2CommandOutput Promise
 * @throws {ExternalServiceError} S3 목록 조회 실패 시
 */
export async function listObjects(
  input: Omit<ListObjectsV2CommandInput, "Bucket">,
): Promise<ListObjectsV2CommandOutput> {
  if (!config.s3.bucketName)
    throw new ConfigError("S3_BUCKET_NAME is not configured.");
  const command = new ListObjectsV2Command({
    Bucket: config.s3.bucketName,
    ...input,
  });
  try {
    const output = await s3Client.send(command);
    console.log(
      `Listed objects from S3 with prefix '${input.Prefix || ""}'. Found ${output.KeyCount || 0}.`,
    );
    return output;
  } catch (error) {
    console.error(
      `S3 ListObjects Error (Prefix: ${input.Prefix || ""}):`,
      error,
    );
    throw new ExternalServiceError(
      `Failed to list objects from S3: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
