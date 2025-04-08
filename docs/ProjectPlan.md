# 스마트 스터디 어시스턴트 프로젝트 계획

**초저비용 $5 목표 및 Docker 기반**  
**기준 문서: 초저비용($5 목표) 및 Docker 기반 스마트 스터디 어시스턴트 PRD (버전 3.0)**

## 1. 프로젝트 목표

- **핵심 목표**: 월 AWS 비용 $5 미만으로 MVP(Minimum Viable Product) 기능 구현 및 2-3명 대상 단기 테스트 완료.
- **학습 목표**: Docker 컨테이너 기반 애플리케이션을 AWS Fargate 또는 EC2에 배포하고 CI/CD 파이프라인을 구축하는 경험 습득.
- **결과물**: 기능 시연 가능한 웹 애플리케이션, Dockerfile, CI/CD 파이프라인 구성, AWS 배포 경험 및 비용 최적화 결과 문서화.

## 2. 프로젝트 범위 (MVP 기준)

- **포함 기능**:
  - PDF/TXT 문서 업로드
  - 업로드된 문서 목록 조회 및 삭제
  - 문서 기반 기본 RAG 질의응답 (OpenAI GPT-4o mini 활용)
  - 간단한 테스트 코드를 이용한 접근 제어
- **제외 기능**: 복잡한 RAG 기능(퀴즈, 요약 등), 사용자 관리 시스템, 성과 분석, 데이터 영속성 보장(DB), 고성능/고가용성 보장.
- **기술 스택**: Next.js, TypeScript, TailwindCSS, Zustand, Docker, SQLite+VSS (컨테이너 내), S3 (IA/Glacier IR), OpenAI API, AWS Fargate/EC2 (Spot 우선), GitHub Actions, Terraform/CDK.

## 3. 프로젝트 단계별 계획

### Phase 0: 환경 설정 및 계획 수립 (예상 소요: 1-2일)

- **작업 내용**:
  - 팀원 간 PRD 최종 검토 및 목표 재확인.
  - GitHub 리포지토리 생성 및 기본 설정.
  - Next.js 프로젝트 초기화 및 기본 구조 설정.
  - 필수 라이브러리 설치 (TypeScript, Tailwind, Zustand, ESLint, Prettier).
  - 기본 Dockerfile 및 docker-compose.yml 작성 (로컬 Next.js 실행용).
  - 코딩 컨벤션 및 브랜치 전략 정의 (예: GitHub Flow).
  - 작업 관리 도구 설정 (예: GitHub Issues).
- **산출물**:
  - 초기화된 GitHub 리포지토리.
  - 기본 Next.js 프로젝트 구조.
  - 로컬 개발 환경 실행 가능한 Docker 설정 초안.
  - 프로젝트 관리 보드.

### Phase 1: 핵심 백엔드 및 RAG 파이프라인 구축 (예상 소요: 3-5일)

- **작업 내용**:
  - 파일 업로드/목록/삭제 API 구현 (Next.js API Routes).
  - AWS SDK 연동하여 S3 파일 저장/삭제 로직 구현 (로컬: MinIO 연동).
  - PDF/TXT 텍스트 추출 로직 구현.
  - SQLite DB 설정 및 sqlite-vss 연동 (컨테이너 내).
  - OpenAI API 연동 (임베딩 생성: text-embedding-3-small).
  - SQLite 기반 벡터 저장/검색 로직 구현.
  - 기본 RAG 질의응답 API 구현 (검색된 컨텍스트 + gpt-4o mini).
  - 간단한 인메모리 캐싱 구현 (LLM 응답 등).
- **산출물**:
  - 파일 관리 및 RAG Q&A 기능 백엔드 API (API 클라이언트로 테스트 가능).
  - 로컬 환경에서 SQLite 기반 벡터 저장/검색 기능 구현 완료.

### Phase 2: 프론트엔드 UI 개발 및 통합 (예상 소요: 3-4일)

- **작업 내용**:
  - TailwindCSS 기반 기본 UI 레이아웃 설계 및 구현.
  - 파일 업로드 컴포넌트 구현.
  - 문서 목록 조회 및 삭제 UI 구현.
  - RAG 질의응답을 위한 채팅 인터페이스 구현.
  - Zustand를 활용하여 상태 관리 및 백엔드 API 연동.
  - 하드코딩된 테스트 코드를 이용한 간단한 접근 제어 로직 구현.
- **산출물**:
  - MVP 기능(업로드, 목록/삭제, Q&A)을 수행할 수 있는 웹 인터페이스.

### Phase 3: Dockerization 및 CI/CD 파이프라인 구축 (예상 소요: 2-3일)

- **작업 내용**:
  - 운영 환경용 Dockerfile 최적화 (Multi-stage build 적용).
  - docker-compose.yml 최종 점검 (SQLite 포함).
  - GitHub Actions 워크플로우 설정:
    - 코드 푸시 시 자동 실행 (Lint, Test - 최소 단위).
    - Docker 이미지 빌드.
    - 빌드된 이미지를 AWS ECR 또는 DockerHub에 푸시.
- **산출물**:
  - 최적화된 Dockerfile.
  - CI를 통해 Docker 이미지가 빌드되고 레지스트리에 푸시되는 자동화 워크플로우.

### Phase 4: AWS 배포 및 테스트 (예상 소요: 3-5일)

- **작업 내용**:
  - Terraform 또는 AWS CDK를 사용하여 AWS 인프라 정의 및 생성:
    - VPC, Subnet, Security Group.
    - S3 버킷 (IA/Glacier IR 클래스, Lifecycle Policy 포함).
    - ECR 리포지토리 (필요시).
    - IAM 역할 및 정책 (최소 권한 원칙).
    - Fargate Task Definition / EC2 Launch Template (Spot Instance 설정 포함).
    - ALB 또는 API Gateway (HTTP API).
  - GitHub Actions 배포 워크플로우 설정 (IaC 실행 또는 Fargate/EC2 서비스 업데이트).
  - 빌드된 Docker 이미지를 사용하여 AWS 환경에 애플리케이션 배포.
  - 2-3명의 테스터와 함께 기능 테스트 수행 (문서 업로드, Q&A 등).
  - AWS Budgets 설정 ($5 미만 알림).
  - CloudWatch 기본 대시보드 설정 (비용, CPU/Memory 사용량 등).
  - 리소스 중지/시작 절차 명확화 및 문서화 (비용 절감 핵심).
- **산출물**:
  - AWS에 배포된 애플리케이션 (테스트 가능한 URL).
  - IaC 코드 (Terraform/CDK).
  - 자동 배포 파이프라인 (GitHub Actions).
  - 비용 모니터링 설정 완료.
  - 리소스 중지/시작 가이드.

### Phase 5: 문서화 및 프로젝트 마무리 (예상 소요: 1-2일)

- **작업 내용**:
  - README 파일 작성 (프로젝트 개요, 로컬 설정 방법, 배포 방법, 사용법 등).
  - 프로젝트 기간 동안의 비용 추적 결과 및 최종 예상 비용 정리.
  - 적용된 비용 최적화 전략 및 효과 문서화.
  - Docker 및 AWS 배포 과정에서 얻은 학습 내용 정리.
  - 코드 정리 및 주석 추가.
  - 최종 코드 리뷰 및 프로젝트 회고.
- **산출물**:
  - 최종 소스 코드.
  - 프로젝트 문서 (README, 비용 분석, 학습 내용 등).
  - 프로젝트 결과 요약 보고.

## 4. 예상 타임라인

- **총 예상 기간**: 약 13 ~ 21일 (실제 개발 속도 및 이슈 발생에 따라 변동 가능)
- **단계별 예상 기간**: 위 Phase별 예상 소요 기간 참조.

## 5. 필요 리소스

- **인력**: 개발자 1명 (가정)
- **계정**:
  - AWS 계정 (Free Tier 활용 + $5 예산 내 사용)
  - GitHub 계정
  - OpenAI API 계정 (API Key 필요)
- **도구**: Docker Desktop, VS Code 등 개발 도구

## 6. 주요 위험 요소 및 대응 방안

- **위험 1**: 월 $5 예산 초과
  - **대응**: AWS Budgets 통한 철저한 모니터링 및 알림 설정, Spot 인스턴스 적극 활용, 테스트 외 시간에는 반드시 리소스 중지, 불필요 기능 추가 제거, 캐싱 강화.
- **위험 2**: Docker 및 AWS 배포 환경 설정의 어려움
  - **대응**: 충분한 학습 시간 확보, IaC(Terraform/CDK) 활용하여 재현성 확보, AWS 공식 문서 및 커뮤니티 적극 활용, 간단한 구성부터 단계적으로 접근.
- **위험 3**: SQLite 데이터 비영속성으로 인한 테스트 불편
  - **대응**: 해당 제약을 팀 내 명확히 인지하고 테스트 계획 수립, 테스트 세션 중에는 컨테이너 재시작 최소화.
- **위험 4**: OpenAI API 사용량/비용 예상 초과
  - **대응**: 인메모리 캐싱 적극 활용, 사용자 입력/쿼리 길이 제한, API 호출 수 모니터링, 필요시 기능 제한.

## 7. 성공 기준

- MVP 기능(문서 업로드/목록/삭제, 기본 RAG Q&A)이 정상적으로 동작하는가?
- Docker 이미지가 성공적으로 빌드되고 AWS Fargate 또는 EC2에 배포되는가?
- 자동화된 CI/CD 파이프라인이 구축되었는가?
- 테스트 기간 동안 월 AWS 비용이 $5 목표 범위 내에서 관리되었는가? (리소스 중지 포함 관리)
- 프로젝트 목표(비용 최적화, Docker 배포 학습) 관련 경험 및 결과가 문서화되었는가?

이 프로젝트 계획은 주어진 제약 조건 하에서 목표 달성에 초점을 맞추고 있습니다. 각 단계별 진행 상황을 면밀히 검토하고 필요에 따라 계획을 유연하게 조정하는 것이 중요합니다.
