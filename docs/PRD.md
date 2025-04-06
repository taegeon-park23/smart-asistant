# 프로덕트 요구사항 문서 (PRD): 스마트 스터디 어시스턴트

**초저비용 $5 목표 및 Docker 기반**  
**버전: 3.0**  
**작성일: 2025년 4월 4일**  
**최종 수정일: 2025년 4월 4일**

## 1. 프로젝트 개요

### 1.1. 목적
본 프로젝트는 AWS 클라우드 환경에서 월 $5 미만의 초저비용으로 개인화된 학습 보조 AI 플랫폼의 핵심 기능을 구현하고, Docker 컨테이너 기반의 배포 환경 구축 및 학습을 목표로 합니다. NextJS, 최소 비용 RAG 파이프라인, 그리고 컨테이너 내 SQLite 기반 VectorDB를 활용하여 2-3명의 소규모 그룹이 단기간 테스트할 수 있는 최소 기능의 웹 애플리케이션을 개발합니다. 비용 최소화와 Docker 배포 경험 습득이 프로젝트의 최우선 목표입니다.

### 1.2. 대상 사용자
- 주요 사용자: 테스트 코드를 발급받은 소규모 학생 그룹 (2-3명, 단기 테스트)
- 관리자: 시스템 관리 및 테스트 코드 생성을 담당하는 단일 어드민 계정 (개발자가 겸임)

### 1.3. 핵심 가치 제안
- 학습 자료 기반의 기본적인 RAG 질의응답 기능을 월 $5 미만의 비용으로 시연
- Docker 컨테이너를 활용한 AWS 배포 (Fargate 또는 EC2) 경험 습득
- 최신 웹 기술(NextJS 15, TypeScript) 및 비용 효율적인 AI 모델(OpenAI GPT-4o mini) 적용
- 비용 절감을 위한 기술적 선택 (SQLite, 인메모리 캐시, 서버리스 함수 최소화) 경험

## 2. 주요 목표
- **비용 목표**: 초기 사용자 그룹(2-3명) 단기 테스트 운영 시 월 AWS 총비용 $5 미만 달성 (가장 중요한 목표)
- **핵심 기능 구현 (MVP)**:
  - 문서 업로드 (PDF, TXT)
  - 기본 RAG 기반 질의응답 (복잡한 기능 제외)
  - 업로드된 문서 목록 조회/삭제
- **배포 목표**: Docker 이미지를 빌드하고 AWS Fargate 또는 EC2에 배포하는 CI/CD 파이프라인 구축 학습
- **성능 목표**: 비용 제약 하에서 기능 구현을 우선하며, 응답 시간 등은 다소 지연될 수 있음을 감안 (예: 쿼리 응답 시간 10초 이내)

## 3. 주요 기능 요구사항 (MVP - 초저비용 초점)

### 3.1. 사용자 접근 관리 (최소화)
- 단일 어드민 계정 (개발자)
- 테스트 코드 생성/관리 (하드코딩 또는 간단한 스크립트, 별도 UI 없음)
- 테스트 코드를 이용한 학생 접근 제어 (자체 로직, DB 불필요)

### 3.2. 학습 자료 관리 (기본)
- 문서 업로드 기능 (PDF, TXT만 지원)
- 업로드된 문서 목록 조회 및 삭제 기능
- (제외) 문서 그룹화, 메타데이터 편집 등 부가 기능

### 3.3. 학습 지원 기능 (핵심 RAG만)
- 업로드된 문서를 기반으로 한 기본적인 질문-답변 인터페이스
- (제외) 핵심 개념 설명, 퀴즈 생성, 학습 계획, 평가 등 모든 고급 기능

### 3.4. 성과 분석
- (제외) 모든 성과 분석 기능

## 4. 기술 요구사항 (초저비용 및 Docker 중심)

### 4.1. 프론트엔드 & 백엔드 (통합)
- **프레임워크**: NextJS 15 (App Router)
- **언어**: TypeScript
- **스타일링**: TailwindCSS
- **상태 관리**: Zustand
- **배포**: Docker 컨테이너 이미지 빌드 후 AWS Fargate (Spot 우선) 또는 EC2 (t4g.nano 또는 micro, Spot 우선) 배포

### 4.2. 데이터베이스 및 스토리지 (비용 극소화)
- **문서 원본 저장소**: Amazon S3 (Standard-IA 또는 Glacier Instant Retrieval 고려, Lifecycle Policy 필수 적용하여 비용 최소화)
- **벡터 데이터베이스**: SQLite + Vector Extension (예: sqlite-vss)
  - 컨테이너 파일 시스템 내 저장 (비용 없음)
  - 데이터 영속성 없음: 컨테이너 재시작 시 데이터 소실 감수 (테스트 목적)
  - (대안: EFS/FSx 마운트 시 비용 발생하므로 초기 제외)
- **메타데이터/캐시 저장소**:
  - SQLite 활용 (Vector DB와 동일 파일 사용)
  - 또는 Next.js 애플리케이션 인메모리 캐시 활용 (간단한 캐싱)
  - (제외) DynamoDB, ElastiCache 등 외부 서비스 사용 안 함

### 4.3. AI/ML 컴포넌트 (비용 최소화)
- **임베딩 생성**: OpenAI Embeddings API (text-embedding-3-small) - 가장 저렴한 옵션
- **텍스트 생성 (LLM)**: OpenAI API (GPT-4o mini) - 가장 저렴한 고성능 옵션
- **RAG 파이프라인**: 최소 기능 커스텀 구현
  - 캐싱: 인메모리 캐시 적극 활용 (LLM 응답, 임베딩 결과 등)
  - API 호출 최소화: 동일/유사 질문 시 캐시 우선 활용, 불필요한 호출 방지
  - 프롬프트 최적화: 최소 토큰 사용
  - (제외) 배치 처리, 리랭킹 등 고급 최적화 (단순화)

### 4.4. 개발 및 배포 요구사항
- **CI/CD**: GitHub Actions (Docker 이미지 빌드 및 AWS Fargate/EC2 배포 자동화 학습)
- **로컬 개발 환경**: Docker Compose (Next.js 앱 + SQLite 환경 구성)
- **테스트 자동화**: Jest (최소 단위 테스트)
- **코드 품질**: ESLint, Prettier
- **배포 환경**: 단일 개발/테스트 환경 운영 (비용 절감), 사용하지 않을 시 반드시 리소스 중지
- **인프라 관리**: AWS CloudFormation 또는 Terraform (IaC 학습 목적)

## 5. 비용 최적화 전략 요약 ($5 목표)
- **목표**: 월 $5 미만
- **핵심 전략**:
  - 컨테이너 기반 배포: Docker 이미지를 AWS Fargate 또는 EC2 Spot 인스턴스에 배포하여 컴퓨팅 비용 최소화.
  - 데이터베이스 비용 제거: 외부 DB 대신 컨테이너 내 SQLite 사용 (데이터 비영속성 감수).
  - 스토리지 비용 최소화: S3 저비용 클래스(Standard-IA, Glacier IR) 및 Lifecycle Policy 적극 활용.
  - AI 비용 최소화: 가장 저렴한 OpenAI 모델(GPT-4o mini, text-embedding-3-small) 사용, 인메모리 캐싱으로 API 호출 극소화.
  - 기능 단순화: MVP 핵심 기능만 구현하여 리소스 사용량 및 개발 비용 절감.
  - 리소스 중지: 테스트 외 시간에는 Fargate Task 또는 EC2 인스턴스 반드시 중지.
  - 서버리스 함수 최소화: 가능하면 Next.js 백엔드 API 내에서 처리. 꼭 필요한 비동기 작업만 Lambda(ARM) 사용 고려.
  - 모니터링: AWS Budgets ($5 미만 알림 설정), Cost Explorer 통한 철저한 비용 추적.

## 6. 성능 및 확장성 요구사항
- **초기 사용자 수**: 2-3명 (단기 테스트)
- **성능 목표**: 비용 제약으로 인해 성능 저하 가능성 있음. 기능 구현 및 비용 목표 달성이 우선.
- **확장성 계획**: 본 버전은 확장성을 고려하지 않음. 추후 예산 확보 시 아키텍처 재설계 필요 (RDS, DynamoDB, 서버리스 VectorDB 등 도입).

## 7. 유지보수 및 모니터링
- **모니터링**: AWS Budgets ($5 목표), Cost Explorer 필수 사용. CloudWatch 기본 로그/메트릭.
- **유지보수**: 단기 테스트 목적이므로 최소한의 유지보수만 고려.

## 8. 환경 구성 (Architecture & Tools Focus)

### 8.1. 로컬 환경
- **목표**: Docker 기반 일관된 개발 환경 제공
- **도구**: Docker Desktop, Docker Compose
- **구성 (docker-compose.yml)**:
  - nextjs-app: Next.js 개발 서버 컨테이너 (Node.js, TypeScript 환경 포함), SQLite 및 Vector Extension 포함. 로컬 소스 코드 볼륨 마운트.
  - minio (선택적): 로컬 S3 호환 스토리지 에뮬레이션.
- **설정**: .env 파일을 통한 환경 변수 관리 (API 키 등)

### 8.2. 개발/테스트 환경 (AWS - 단일 환경, $5 목표)
- **목표**: 빌드된 Docker 이미지 배포 및 기능 테스트, 월 $5 미만 비용 유지 (미사용 시 중지 필수)
- **AWS 리전**: us-east-1 (일반적으로 비용이 가장 저렴)
- **주요 도구**: AWS CLI, Terraform 또는 AWS CDK, GitHub Actions, DockerHub 또는 AWS ECR
- **아키텍처**:
  - **컨테이너 오케스트레이션**:
    - AWS Fargate (Spot Task 우선): 서버리스 컨테이너 실행. 관리 오버헤드 적음. Spot 사용 시 비용 절감 극대화.
    - (대안) Amazon EC2 (t4g.nano 또는 micro, Spot Instance 우선): Graviton 기반 인스턴스 + Docker 직접 실행. 비용 저렴하나 관리 필요. Spot 사용 시 비용 절감.
  - **컨테이너 레지스트리**: AWS ECR (Public 또는 Private) 또는 DockerHub
  - **애플리케이션**: GitHub Actions에서 빌드된 Next.js Docker 컨테이너 실행 (SQLite 포함).
  - **스토리지**: Amazon S3 버킷 (Standard-IA 또는 Glacier IR 클래스, Lifecycle Policy 설정)
  - **데이터베이스**: 컨테이너 내 SQLite 파일 (데이터 비영속적)
  - **AI 서비스**: OpenAI API (API 키는 Secrets Manager 또는 Parameter Store 관리 고려)
  - **네트워킹**: Application Load Balancer (ALB) 또는 API Gateway (HTTP API - 저비용) + VPC, Security Groups (최소 포트만 허용)
  - **CI/CD**: GitHub Actions -> Docker 이미지 빌드 -> ECR/DockerHub Push -> Terraform/CDK apply 또는 Fargate/EC2 서비스 업데이트.
- **핵심 비용 관리**:
  - 미사용 시 Fargate Task 또는 EC2 인스턴스 중지 자동화/수동 관리.
  - Spot 인스턴스 적극 활용.
  - S3 Lifecycle Policy 설정.
  - API 호출 최소화 (캐싱).
  - AWS Budgets 알림 설정 ($3, $4 등 단계적 알림).