# 프로젝트 가이드: Phase 1 핵심 백엔드 및 RAG 파이프라인 구축

Phase 0 완료 후 진행하는 이 단계에서는 파일 관리, 텍스트 추출, 벡터 데이터베이스 연동, RAG 질의응답 등 애플리케이션의 핵심 백엔드 기능을 구현합니다.

## 1단계: 파일 관리 API 구현

### API 라우트 정의

Next.js 프로젝트의 src/app/api/ 디렉토리 내에 파일 관리를 위한 라우트 핸들러를 생성합니다.

- `src/app/api/files/route.ts`: 파일 목록 조회(GET), 파일 업로드(POST) 처리
- `src/app/api/files/[fileId]/route.ts`: 특정 파일 삭제(DELETE) 처리

### 핸들러 구현

각 HTTP 메소드(GET, POST, DELETE)에 맞는 로직을 구현합니다.

- **파일 업로드(POST)**: 요청 본문에서 파일 데이터를 받습니다. (multipart/form-data 처리 필요 - formidable 라이브러리 사용 또는 Next.js 기능 활용) 초기에는 파일 메타데이터를 메모리에 임시 저장하거나 간단한 구조로 관리합니다.
- **파일 목록(GET)**: 저장된 파일 메타데이터 목록을 반환합니다.
- **파일 삭제(DELETE)**: 지정된 ID의 파일 메타데이터를 삭제합니다.

#### Test

```bash
$ curl -X POST -F "file=@C:\dev\smart-asistant\docs\DeploymentDiagram.pdf" http://localhost:3000/api/files
{"message":"File uploaded successfully","fileId":"1743943687753-p2rchmu","metadata":{"id":"1743943687753-p2rchmu","name":"DeploymentDiagram.pdf","type":"application/pdf","size":351261}}

$ curl http://localhost:3000/api/files
[{"id":"1743943687753-p2rchmu","name":"DeploymentDiagram.pdf","type":"application/pdf","size":351261}]

$ curl -X DELETE http://localhost:3000/api/files/1743943687753-p2rchmu
{"message":"File 'DeploymentDiagram.pdf' (ID: 1743943687753-p2rchmu) deleted successfully"}
```

## 2단계: Amazon S3 연동 (파일 저장/삭제)

### AWS SDK 설치

AWS SDK v3의 S3 클라이언트를 설치합니다.

```bash
npm install @aws-sdk/client-s3
```

### AWS 자격 증명 설정

로컬 개발 환경에서는 .env.local 파일에 저장된 AWS 자격 증명(Access Key ID, Secret Access Key, Region)을 사용하도록 설정합니다. (실제 배포 시에는 IAM 역할 등을 사용합니다.)

### S3 연동 함수 구현

- 파일을 S3 버킷에 업로드하는 함수를 구현합니다. (PRD에 명시된 저비용 클래스 옵션 고려)
- S3 버킷에서 파일을 삭제하는 함수를 구현합니다.

### API 핸들러 통합

1단계에서 구현한 파일 업로드(POST) 및 삭제(DELETE) API 핸들러 내에서 위 S3 연동 함수를 호출하여 실제 파일이 S3에 저장되고 삭제되도록 로직을 연결합니다.

### (로컬 테스트용) MinIO 연동

PRD 및 계획에 따라 로컬 테스트 시 MinIO를 사용한다면, S3 클라이언트 설정 시 엔드포인트를 MinIO 주소로 지정하도록 환경 변수 등을 통해 분기 처리합니다.

```
# .env.local (MinIO 사용 시)

# MinIO 엔드포인트 URL (docker-compose 외부에서 next dev 실행 시 localhost 사용)
S3_ENDPOINT_URL=http://localhost:9000
# (참고: 만약 nextjs-app 컨테이너 내부에서 실행한다면 'http://minio:9000' 사용)

# MinIO 접속 정보 (docker-compose.yml에 설정된 값 사용)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin

# AWS SDK는 리전 값이 필요할 수 있으므로 기본값 설정 (MinIO 자체는 리전 개념 약함)
AWS_REGION=us-east-1

# MinIO 내에서 사용할 버킷 이름 (MinIO 콘솔/mc CLI로 미리 생성 필요)
S3_BUCKET_NAME=my-local-bucket
```

#### MinIO 버킷 생성

MinIO가 Docker Compose로 실행 중일 때, .env.local에서 S3_BUCKET_NAME으로 지정한 버킷(예: my-local-bucket)을 생성해야 합니다. MinIO 웹 콘솔(http://localhost:9001)에 접속하거나 mc (MinIO Client) CLI 도구를 사용하여 버킷을 미리 생성하세요.

웹 콘솔: http://localhost:9001 접속 -> minioadmin / minioadmin 로그인 -> Buckets 메뉴 -> Create Bucket
mc CLI 사용 예시 (별도 설치 필요):
Bash

1. MinIO 서버 별칭 설정 (최초 1회)
   mc alias set localminio http://localhost:9000 minioadmin minioadmin

2. 버킷 생성
   mc mb localminio/my-local-bucket
   작동 방식:

Next.js 개발 서버(npm run dev)가 시작될 때 .env.local 파일을 읽어 환경 변수를 설정합니다.
src/lib/s3Client.ts 파일이 로드될 때 process.env.S3_ENDPOINT_URL 값을 확인합니다.
S3_ENDPOINT_URL 값이 존재하면 (MinIO 사용 시), s3Config 객체에 endpoint와 forcePathStyle: true를 추가합니다. .env.local에 설정된 AWS_ACCESS_KEY_ID와 AWS_SECRET_ACCESS_KEY (이 경우 MinIO의 minioadmin/minioadmin)가 credentials로 사용됩니다.
S3_ENDPOINT_URL 값이 없거나 비어있으면 (AWS S3 사용 시), endpoint나 forcePathStyle 없이 기본 설정으로 클라이언트가 생성됩니다. SDK는 환경 변수나 ~/.aws/credentials 파일 등에서 AWS 자격 증명을 찾아 사용합니다.
API 라우트 핸들러 (route.ts)들은 이렇게 조건부로 설정된 s3Client 인스턴스를 import 하여 사용하므로, 추가적인 코드 변경 없이 MinIO와 AWS S3 간 전환이 가능해집니다.
이제 .env.local 파일의 S3_ENDPOINT_URL 설정 여부에 따라 로컬 테스트 시 MinIO를 사용하거나 실제 AWS S3를 사용하도록 제어할 수 있습니다.

## 3단계: 텍스트 추출 로직 구현

### 라이브러리 설치

- **PDF 파싱**: pdf-parse 라이브러리를 설치합니다.
  ```bash
  npm install pdf-parse
  ```
- **TXT**: Node.js 내장 fs 모듈을 사용하거나, 파일 스트림을 직접 처리합니다.

### 텍스트 추출 함수 구현

파일 버퍼(Buffer)나 임시 파일 경로를 입력받아 해당 파일(PDF 또는 TXT)의 텍스트 내용을 추출하여 반환하는 함수를 구현합니다.

### 업로드 프로세스 통합

파일 업로드 API(POST) 처리 로직 중 파일을 S3에 성공적으로 저장한 후, 이 텍스트 추출 함수를 호출하여 내용을 얻도록 구현합니다.

## 4단계: SQLite 및 Vector Extension 설정

### SQLite 라이브러리 설치

Node.js 환경에 맞는 SQLite 라이브러리를 설치합니다. (예: better-sqlite3)

```bash
npm install better-sqlite3
# better-sqlite3 사용 시 개발 의존성으로 @types/better-sqlite3 설치
npm install --save-dev @types/better-sqlite3
```

### Vector Extension (sqlite-vss) 준비

- sqlite-vss를 직접 사용하거나, 이를 포함하는 라이브러리를 찾습니다.
- **중요**: 이 확장 기능은 Docker 컨테이너 환경에 설치되어야 합니다. Dockerfile에 sqlite-vss를 다운로드하고 로드하는 단계를 추가해야 할 수 있습니다. (예: apt-get으로 관련 패키지 설치 또는 직접 빌드/다운로드)

### 데이터베이스 초기화 로직 구현

- 애플리케이션 시작 시 또는 필요할 때 SQLite 데이터베이스 파일(예: 컨테이너 내 /app/db/database.sqlite)을 열거나 생성하는 코드를 작성합니다.
- sqlite-vss 확장 기능을 로드하는 SQL 명령(SELECT load_extension(...))을 실행합니다.
- 필요한 테이블을 생성하는 SQL을 실행합니다. (예: documents 테이블 - id, filename, s3_path 등 / vectors 테이블 - sqlite-vss가 관리)

## 5단계: OpenAI API 연동 (임베딩 생성)

### OpenAI 라이브러리 설치

```bash
npm install openai
```

### 클라이언트 설정

.env.local 파일의 OPENAI_API_KEY를 사용하여 OpenAI 클라이언트를 초기화합니다.

### 임베딩 생성 함수 구현

텍스트 문자열을 입력받아 OpenAI Embeddings API (text-embedding-3-small 모델)를 호출하고 결과 벡터 임베딩을 반환하는 비동기 함수를 구현합니다. API 오류 처리를 포함합니다.

## 6단계: 벡터 저장 및 검색 로직 구현 (SQLite + VSS)

### 벡터 저장

파일 업로드 과정에서 텍스트 추출 및 임베딩 생성이 완료된 후, 해당 문서의 메타데이터와 생성된 벡터 임베딩을 4단계에서 설정한 SQLite 데이터베이스에 저장합니다. sqlite-vss에서 제공하는 가상 테이블(virtual table) 및 관련 함수(예: vss_store, INSERT INTO ...)를 사용합니다.

### 벡터 검색

사용자 쿼리에 대해 유사한 문서를 찾는 함수를 구현합니다.

- 사용자 쿼리 텍스트를 5단계에서 만든 함수를 이용해 임베딩 벡터로 변환합니다.
- 변환된 쿼리 벡터를 사용하여 SQLite 데이터베이스에서 sqlite-vss의 검색 함수(예: vss_search, vss_search_params)를 호출하여 가장 유사한 문서 벡터(및 관련 메타데이터)를 검색합니다.

## 7단계: 기본 RAG 질의응답 API 구현

### API 라우트 생성

질의응답을 위한 새 API 라우트(예: src/app/api/chat/route.ts)를 생성합니다.

### RAG 로직 구현 (POST 핸들러)

- 요청 본문에서 사용자 질문(query)을 받습니다.
- 6단계에서 구현한 벡터 검색 함수를 사용하여 사용자 질문과 관련된 문서 조각(context)을 SQLite DB에서 검색합니다.
- 검색된 컨텍스트와 사용자 질문을 포함하는 프롬프트를 구성합니다.
- OpenAI Chat Completions API (gpt-4o-mini 모델)를 호출하여 최종 답변을 생성합니다. (5단계에서 설정한 OpenAI 클라이언트 사용)
- API 오류를 처리하고 생성된 답변을 클라이언트에 반환합니다.

## 8단계: 인메모리 캐싱 구현

### 캐시 구현

간단한 인메모리 캐시를 구현합니다. Node.js의 Map 객체를 사용하거나 node-cache 같은 라이브러리를 사용할 수 있습니다.

```bash
npm install node-cache
```

### 캐싱 적용

비용이 많이 들거나 시간이 오래 걸리는 작업의 결과를 캐싱합니다.

- **LLM 응답 캐싱**: 동일한 질문과 컨텍스트 조합에 대한 LLM API 응답을 캐싱합니다. (캐시 키: 질문 + 컨텍스트 해시 등)
- **(선택적) 임베딩 캐싱**: 동일한 텍스트 조각에 대한 임베딩 결과를 캐싱할 수도 있습니다.

### 캐시 전략

적절한 캐시 키 생성 방식과 만료 시간(TTL) 또는 간단한 캐시 크기 제한 및 교체 정책(LRU 등)을 정의합니다. 이는 비용 최적화에 매우 중요합니다.

---

이 단계들을 완료하면 스마트 스터디 어시스턴트의 핵심 백엔드 로직과 RAG 파이프라인의 기본 골격이 완성됩니다. 각 단계를 진행하면서 단위 테스트를 작성하는 것이 좋습니다. 다음 단계는 Phase 2: 프론트엔드 UI 개발 및 통합입니다.
