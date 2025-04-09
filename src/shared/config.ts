// src/shared/config.ts

/**
 * 환경 변수 기반 설정 객체
 */
const config = {
  // S3/MinIO Configuration
  s3: {
    bucketName: process.env.S3_BUCKET_NAME || "",
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT_URL, // MinIO 사용 시 http://minio:9000 등
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "", // MinIO 또는 AWS Access Key
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "", // MinIO 또는 AWS Secret Key
    uploadPrefix: "uploads/", // S3 내 업로드 경로 접두사
    forcePathStyle: !!process.env.S3_ENDPOINT_URL, // 엔드포인트 사용 시 true
  },
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    embeddingModel: "text-embedding-3-small",
    chatModel: "gpt-4o-mini",
    embeddingDimension: 1536, // text-embedding-3-small의 차원
    temperature: 0.3,
  },
  // Database Configuration
  db: {
    directory: ".db", // 프로젝트 루트 기준 디렉토리 (컨테이너 내부)
    fileName: "database.sqlite",
  },
  // Cache Configuration
  cache: {
    stdTTL: 300, // 기본 TTL 5분 (초)
    checkperiod: 60, // 만료 체크 주기 (초)
  },
  // LLM Configuration
  llm: {
    cachePrefix: "llm_answer_",
    temperature: 0.3, // RAG에 적합한 낮은 온도
  },
  // Vector Search Configuration
  vectorSearch: {
    defaultLimit: 3, // 기본 검색 결과 수
  },
  // Text Processing
  textProcessing: {
    chunkSize: 1000, // 예시 청크 크기 (문자 수 기준, 실제로는 토큰 기반 권장)
    chunkOverlap: 100, // 예시 청크 겹침 크기
  },
} as const; // Readonly 타입으로 만듦

// 필수 환경 변수 검증 (애플리케이션 시작 시 확인)
function validateConfig(cfg: typeof config) {
  if (!cfg.s3.bucketName) {
    console.warn("Warning: S3_BUCKET_NAME environment variable is not set.");
    // throw new Error("S3_BUCKET_NAME environment variable is required.");
  }
  if (!cfg.openai.apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required.");
  }
  // MinIO 사용 시 키 검증 (선택적)
  if (cfg.s3.endpoint && (!cfg.s3.accessKeyId || !cfg.s3.secretAccessKey)) {
    console.warn(
      "Warning: S3_ENDPOINT_URL is set, but AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is missing for S3 compatible storage.",
    );
  }
}

// 애플리케이션 시작 시 한 번 검증 실행
validateConfig(config);

export default config;
