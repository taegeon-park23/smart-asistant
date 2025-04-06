// 예시: S3 클라이언트를 생성하는 파일 (e.g., src/lib/s3Client.ts)
import { S3Client } from "@aws-sdk/client-s3";

// .env.local 파일에 설정된 AWS_REGION 값을 사용합니다.
const region = process.env.AWS_REGION;

// 환경 변수가 설정되어 있다면 SDK가 자동으로 인식하므로,
// credentials 객체를 명시적으로 전달할 필요가 없습니다.
// region은 명시적으로 전달하는 것이 좋습니다.
const s3Client = new S3Client({
  region: region,
  // credentials: { // 이 부분을 명시적으로 작성할 필요 없음 (환경변수 사용 시)
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  // }
});

// 필요한 경우 환경 변수가 제대로 로드되었는지 확인하는 로직 추가
if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY ||
  !region
) {
  console.warn(
    "Local Development: AWS credentials or region might not be fully set in .env.local. SDK will try other credential sources."
  );

  // 개발 초기 단계에서는 오류를 발생시켜 설정을 강제할 수도 있습니다.
  throw new Error("Missing AWS configuration in .env.local for development.");
}

export default s3Client;
