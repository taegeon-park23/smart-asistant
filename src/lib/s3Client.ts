// src/lib/s3Client.ts
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";

// 환경 변수 읽기
const region = process.env.AWS_REGION;
const endpoint = process.env.S3_ENDPOINT_URL; // MinIO 엔드포인트 URL
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// S3 클라이언트 설정을 담을 객체
const s3Config: S3ClientConfig = {
  region: region || "us-east-1", // 리전은 필수값에 가까우므로 기본값 설정
};

// MinIO 엔드포인트 URL이 설정되어 있는지 확인
if (endpoint) {
  console.log(`Using S3 compatible endpoint: ${endpoint}`);
  s3Config.endpoint = endpoint;
  // MinIO나 다른 S3 호환 스토리지 사용 시 path-style 액세스가 필요할 수 있음
  s3Config.forcePathStyle = true;

  // MinIO의 경우에도 AWS 표준 환경 변수(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)를
  // 사용하여 credentials를 설정할 수 있음. .env.local에 MinIO 값으로 설정.
  if (accessKeyId && secretAccessKey) {
    s3Config.credentials = {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    };
  } else {
    console.warn(
      "MinIO endpoint specified, but AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not found in environment variables.",
    );
  }
} else {
  console.log(`Using default AWS S3 endpoint for region: ${s3Config.region}`);
  // AWS S3를 사용하는 경우, SDK는 환경 변수, ~/.aws/credentials, IAM 역할 등을
  // 자동으로 탐색하므로 credentials를 명시적으로 설정할 필요가 없을 수 있음.
  // 만약 .env.local에 AWS 키를 설정했다면 여기서 자동으로 사용됨.
  if (!accessKeyId || !secretAccessKey) {
    console.warn(
      "Using default AWS S3 endpoint. AWS credentials not found in environment variables. SDK will attempt other methods (e.g., ~/.aws/credentials, IAM role).",
    );
  }
  // 환경 변수에 키가 있다면 명시적으로 전달해도 무방
  // else {
  //     s3Config.credentials = {
  //         accessKeyId: accessKeyId,
  //         secretAccessKey: secretAccessKey,
  //     };
  // }
}

// 설정 객체를 사용하여 S3 클라이언트 인스턴스 생성
const s3Client = new S3Client(s3Config);

export default s3Client;
