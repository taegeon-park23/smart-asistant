프로젝트 시작: Phase 0 환경 설정 및 계획 수립 가이드 (마크다운)
이 단계는 프로젝트 계획 문서 [source: 310-314] 에 명시된 첫 번째 단계로, 성공적인 프로젝트 진행을 위한 기반을 마련합니다. 예상 소요 기간은 1-2일입니다.

## 1단계: 프로젝트 목표 및 제약 조건 명확화

*   **PRD 최종 검토:** "초저비용($5 목표) 및 Docker 기반 스마트 스터디 어시스턴트 PRD" 문서를 다시 한번 꼼꼼히 읽어보세요. [source: 311]
*   **핵심 목표:** 월 $5 미만 비용 달성, Docker 기반 배포 경험 습득.
*   **MVP 범위:** 문서 업로드/조회/삭제, 기본 RAG Q&A 기능만 포함됨을 인지합니다.
*   **주요 제약:** 컨테이너 내 SQLite 사용으로 인한 데이터 비영속성(컨테이너 재시작 시 데이터 소실)을 명확히 이해하고 진행합니다. [source: 13]

## 2단계: 소스 코드 관리 환경 설정

*   **GitHub 리포지토리 생성:** [source: 311]
    *   GitHub에 이 프로젝트를 위한 새 비공개(Private) 또는 공개(Public) 리포지토리를 생성합니다.
    *   리포지토리 초기화 시 `README.md` 파일, Node.js 환경에 맞는 `.gitignore` 파일을 추가하는 것이 좋습니다. (GitHub에서 제공하는 Node.js 템플릿 사용 가능)

## 3단계: 로컬 개발 환경 초기 설정

*   **필수 도구 설치 확인:**
    *   Node.js 및 npm (또는 yarn)이 설치되어 있는지 확인하고, 없다면 설치합니다.
    *   Docker Desktop이 설치되어 있는지 확인하고, 없다면 설치합니다. [source: 28]
*   **Next.js 프로젝트 생성:** [source: 311]
    *   터미널을 열고 원하는 디렉토리로 이동한 후, 다음 명령어를 실행하여 Next.js 프로젝트를 생성합니다.

    ```bash
    npx create-next-app@latest your-project-name
    ```

    *   설정 과정에서 **TypeScript, ESLint, Tailwind CSS 사용 여부를 묻는 질문에 'Yes'**를 선택합니다. (App Router 사용 권장)
*   **프로젝트 구조 확인:** 생성된 프로젝트 폴더 구조를 확인하고 필요시 `components`, `lib` 등 추가 디렉토리를 계획합니다.

## 4단계: 필수 라이브러리 설치 및 설정

*   **상태 관리 라이브러리 설치:** 프로젝트 계획에 따라 Zustand를 설치합니다. [source: 12, 309]

    ```bash
    npm install zustand
    # 또는 yarn add zustand
    ```

*   **코드 포매터 설치 및 설정:** Prettier를 설치하고 설정합니다. [source: 15]

    ```bash
    npm install --save-dev --save-exact prettier
    # 또는 yarn add --dev --exact prettier
    ```

    *   프로젝트 루트에 `.prettierrc.json` 설정 파일을 생성하고 규칙을 정의합니다. (예: `{ "semi": true, "singleQuote": true }`)
    *   `.prettierignore` 파일을 생성하여 포맷팅에서 제외할 파일이나 폴더를 지정합니다.
    *   ESLint와 충돌을 방지하기 위해 `eslint-config-prettier`를 설치하고 ESLint 설정(`.eslintrc.json`)에 추가하는 것이 좋습니다.

## 5단계: 로컬 Docker 환경 구성 (초안)

*   **Dockerfile 생성:** [source: 312]
    *   프로젝트 루트에 `Dockerfile` (또는 `Dockerfile.dev`)을 생성합니다. 이 파일은 로컬 개발 환경을 위한 Next.js 애플리케이션 이미지를 빌드하는 방법을 정의합니다. (Node.js 이미지 기반, 의존성 설치, 개발 서버 실행 등)
*   **Docker Compose 파일 생성:** [source: 28, 312]
    *   프로젝트 루트에 `docker-compose.yml` 파일을 생성합니다.
    *   `nextjs-app` 서비스를 정의하고 위에서 만든 Dockerfile을 사용하도록 설정합니다. 로컬 소스 코드와 컨테이너 내부를 연결(volume mount)하고 포트를 매핑합니다.
    *   (선택 사항) 로컬 S3 테스트를 위해 MinIO 서비스를 추가할 수 있습니다. [source: 28]

## 6단계: 개발 워크플로우 정의

*   **코딩 컨벤션:** ESLint와 Prettier 설정을 통해 코드 스타일과 품질을 일관되게 유지합니다.
*   **브랜치 전략:** 프로젝트 계획에서 제안된 GitHub Flow [source: 313] (또는 다른 익숙한 전략)를 따르기로 결정합니다.
    *   `main` (또는 `master`): 배포 가능한 안정 버전 관리.
    *   기능 개발: `main` 브랜치에서 새로운 브랜치 생성 후 작업, 완료 후 Pull Request를 통해 `main`으로 병합.

## 7단계: 작업 관리 설정

*   **이슈 트래킹:** GitHub Issues [source: 314] (또는 Trello, Jira 등 선호하는 도구)를 사용하여 프로젝트 계획의 Phase 1 이후 작업들을 구체적인 이슈로 등록하고 관리합니다. 예를 들어, "파일 업로드 API 구현", "S3 연동 로직 구현" 등으로 세분화합니다.

## 8단계: 계정 및 API 키 준비

*   **필수 계정 확인:** [source: 338]
    *   AWS 계정이 준비되었는지 확인합니다. (Free Tier 활용 및 $5 예산 내 사용 계획)
    *   GitHub 계정 확인 (이미 사용 중).
    *   OpenAI API 계정을 준비하고 API 키를 발급받습니다.
*   **API 키 관리 (로컬):** [source: 28]
    *   OpenAI API 키와 같이 민감한 정보는 로컬 개발 시 `.env.local` 파일에 환경 변수로 저장합니다.
    *   `.env.local` 파일은 반드시 `.gitignore`에 추가하여 GitHub에 올라가지 않도록 합니다.

이 8단계를 완료하면 프로젝트의 기본적인 개발 환경 설정과 계획 수립이 마무리되며, 다음 단계인 "Phase 1: 핵심 백엔드 및 RAG 파이프라인 구축" [source: 315] 을 진행할 준비가 됩니다.
