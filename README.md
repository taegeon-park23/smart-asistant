# 초저비용($5 목표) 및 Docker 기반 스마트 스터디 어시스턴트

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) 

## 1. 프로젝트 개요

본 프로젝트는 AWS 클라우드 환경에서 **월 $5 미만의 초저비용**으로 개인화된 학습 보조 AI 플랫폼의 핵심 기능(MVP)을 구현하고, **Docker 컨테이너 기반의 배포 환경 구축 및 운영 경험 습득**을 목표로 합니다.

최신 웹 기술(Next.js 15)과 비용 효율적인 AI 모델(OpenAI GPT-4o mini)을 활용하며, 특히 비용 절감을 위해 외부 DB 대신 **컨테이너 내 SQLite와 Vector Extension**을 사용합니다. 이로 인해 **컨테이너 재시작 시 데이터는 소실될 수 있습니다.**

**주요 목표:**

* 월 AWS 총비용 **$5 미만** 달성 (가장 중요)
* MVP 핵심 기능 구현 및 2-3명 대상 단기 테스트
* Docker 컨테이너 기반 AWS 배포(Fargate/EC2) 및 CI/CD 파이프라인 구축 경험 습득
* 비용 최적화 전략 적용 및 학습

**관련 문서:**
* [프로덕트 요구사항 문서 (PRD)](./docs/PRD.md) 
* [프로젝트 계획서](./docs/ProjectPlan.md) 
* [AWS 비용 최적화 연구](./docs/CostOptimizationResearch.md) 
* [배포 구성도](./docs/DeploymentDiagram.pdf) 

## 2. 핵심 기능 (MVP)
* **문서 업로드:** PDF, TXT 형식의 학습 자료 업로드
* **문서 관리:** 업로드된 문서 목록 조회 및 삭제
* **RAG 질의응답:** 업로드된 문서를 기반으로 한 기본적인 질문-답변 (OpenAI GPT-4o mini 활용)
* **접근 제어:** 간단한 하드코딩된 테스트 코드를 이용한 사용자 접근 제어

## 3. 기술 스택

* **프레임워크/언어:** Next.js 15 (App Router), TypeScript
* **스타일링:** Tailwind CSS
* **상태 관리:** Zustand
* **컨테이너화:** Docker
* **데이터베이스:** SQLite + Vector Extension (sqlite-vss) - 컨테이너 내 실행 (비영속적)
* **파일 스토리지:** Amazon S3 (Standard-IA 또는 Glacier Instant Retrieval 클래스 + Lifecycle Policy)
* **AI 모델:** OpenAI API (GPT-4o mini, text-embedding-3-small)
* **클라우드/배포:** AWS Fargate 또는 EC2 (t4g.nano/micro 등 저사양, **Spot 인스턴스 우선 활용**)
* **CI/CD:** GitHub Actions
* **인프라 관리:** Terraform 또는 AWS CDK

## 4. 아키텍처 개요

* 애플리케이션은 Docker 컨테이너로 패키징됩니다.
* 데이터베이스는 비용 절감을 위해 컨테이너 내 SQLite를 사용합니다. (데이터 비영속성)
* 파일은 Amazon S3에 저장됩니다.
* 배포는 GitHub Actions를 통해 자동화되며, AWS Fargate 또는 EC2 (Spot 인스턴스 활용)에 배포됩니다.
* 개발 환경과 운영 환경은 분리되어 관리됩니다. (상세 내용은 [배포 구성도](./path/to/DeploymentDiagram.pdf) 참조)

## 5. 시작하기 (로컬 개발 환경)

### 5.1. 사전 요구 사항

* Node.js (버전 18 이상 권장)
* npm 또는 yarn
* Docker Desktop

### 5.2. 설치

1.  **리포지토리 클론:**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```
2.  **의존성 설치:**
    ```bash
    npm install
    # 또는
    yarn install
    ```

### 5.3. 환경 변수 설정

1.  프로젝트 루트에 `.env.local` 파일을 생성합니다.
2.  `.env.example` 파일을 참고하여 필요한 환경 변수를 `.env.local` 파일에 추가합니다. (예: OpenAI API 키)
    ```plaintext
    # .env.local 예시
    OPENAI_API_KEY=sk-your-openai-api-key
    # AWS 관련 자격 증명 (로컬 테스트 시 필요하다면)
    # AWS_ACCESS_KEY_ID=...
    # AWS_SECRET_ACCESS_KEY=...
    # AWS_REGION=us-east-1
    ```
3.  **주의:** `.env.local` 파일은 민감한 정보를 포함하므로 `.gitignore`에 반드시 추가하여 버전 관리에서 제외해야 합니다.

### 5.4. 로컬에서 실행 (Docker 사용)

1.  Docker Desktop이 실행 중인지 확인합니다.
2.  다음 명령어를 사용하여 Docker 컨테이너를 빌드하고 실행합니다.
    ```bash
    docker-compose up --build
    ```
3.  웹 브라우저에서 `http://localhost:3000` (또는 docker-compose.yml에 설정된 포트)으로 접속합니다.

## 6. 배포

* **CI/CD:** GitHub Actions 워크플로우를 사용하여 구현됩니다.
    * `develop` 브랜치에 푸시 시 개발 환경에 자동 배포됩니다.
    * `main` 브랜치로 Pull Request 병합 시 운영 환경에 무중단 배포가 시도됩니다. (상세 내용은 배포 구성도 및 GitHub Actions 워크플로우 파일 참조)
* **인프라:** AWS 리소스는 Terraform 또는 AWS CDK 코드를 통해 관리됩니다 (`infrastructure` 폴더 등 참조).
* **🚨 중요: 비용 관리를 위한 리소스 중지 🚨**
    * 이 프로젝트는 월 $5 비용 목표를 가지고 있습니다.
    * **테스트 또는 사용하지 않을 때에는 반드시 AWS 콘솔 또는 자동화 스크립트를 통해 Fargate Task 또는 EC2 인스턴스를 중지해야 합니다.**
    * 리소스 중지/시작 절차는 별도 문서([리소스 관리 가이드](./path/to/ResourceManagementGuide.md) 등)를 참조하십시오. ## 7. 비용 최적화 초점

이 프로젝트의 가장 중요한 목표는 **비용 최적화**입니다. 다음과 같은 주요 전략이 적용되었습니다.

* **컴퓨팅:** AWS Fargate/EC2 Spot 인스턴스 적극 활용
* **데이터베이스:** 외부 관리형 DB 대신 컨테이너 내 SQLite 사용 (데이터 비영속성 감수)
* **스토리지:** Amazon S3 저비용 스토리지 클래스 및 Lifecycle Policy 활용
* **AI 모델:** OpenAI의 가장 저렴한 모델 사용 및 인메모리 캐싱을 통한 API 호출 최소화
* **리소스 관리:** 사용하지 않는 리소스는 반드시 중지

## 8. (선택 사항) 프로젝트 구조
```
.
├── .github/workflows/        # GitHub Actions 워크플로우
├── public/                   # 정적 파일
├── src/                      # 소스 코드
│   ├── app/                  # Next.js App Router 페이지 및 레이아웃
│   ├── components/           # React 컴포넌트
│   ├── lib/                  # 유틸리티 함수, API 클라이언트 등
│   └── store/                # Zustand 스토어
├── .env.example              # 환경 변수 템플릿
├── .eslintrc.json            # ESLint 설정
├── .gitignore                # Git 무시 파일 목록
├── docker-compose.yml        # Docker Compose 설정 (로컬 개발용)
├── Dockerfile                # Docker 이미지 빌드 설정
├── next.config.mjs           # Next.js 설정
├── package.json              # 프로젝트 의존성 및 스크립트
├── postcss.config.js         # PostCSS 설정 (Tailwind)
├── prettier.config.js        # Prettier 설정 (또는 .prettierrc.json)
├── README.md                 # 프로젝트 설명 (이 파일)
├── tailwind.config.ts        # Tailwind CSS 설정
└── tsconfig.json             # TypeScript 설정
```

## 9. (선택 사항) 기여하기

## 10. (선택 사항) 라이선스

이 프로젝트는 [MIT 라이선스](./LICENSE) 하에 배포됩니다. ```