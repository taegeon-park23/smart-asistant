# Phase 1 코드 리팩토링 및 단위 테스트 가이드

Phase 1에서 구현된 백엔드 코드에 대해, 추천된 **Feature-Based Folder Structure**와 **Module-Based Approach**를 적용하여 리팩토링하고 단위 테스트를 진행합니다. 이를 통해 코드 품질, 구조, 유지보수성 및 테스트 용이성을 향상시키는 것을 목표로 합니다.

## 1단계: 코드 구조 변경 및 리팩토링

- **Feature-Based 폴더 구조 적용:**
  - 기존 코드 구조를 기능(Feature) 중심으로 재구성합니다. 제공된 예시 구조를 참고하여 폴더를 생성하고 관련 파일들을 이동시킵니다.

```
src/
├── app/ (Next.js app router - API 핸들러는 매우 얇게 유지)
│   └── api/
├── features/
│   ├── files/       # 파일 업로드, 목록, 삭제 관련
│   │   ├── api/       # (선택적) 파일 관련 API 핸들러 위치
│   │   ├── services.ts  # 핵심 비즈니스 로직 (예: uploadFile, listFiles, deleteFile)
│   │   ├── storage.ts   # S3 관련 로직 (services.ts에서 호출) 또는 DB 메타데이터 저장 로직
│   │   └── types.ts     # 파일 관련 타입 정의
│   ├── documents/   # 문서 처리 (텍스트 추출, 임베딩 생성 등)
│   │   ├── textExtraction.ts
│   │   ├── chunking.ts (필요시)
│   │   └── vectorization.ts (임베딩 생성 및 DB 저장 로직)
│   └── chat/        # RAG 질의응답 관련
│       ├── api/       # (선택적) 채팅 API 핸들러 위치
│       ├── search.ts    # 벡터 검색 로직
│       ├── generation.ts # 프롬프트 구성 및 LLM 호출 로직
│       └── cache.ts     # 캐싱 관련 로직
└── shared/        # 여러 기능에서 공통으로 사용하는 모듈
    ├── db.ts        # SQLite DB 초기화 및 클라이언트 관련
    ├── openai.ts    # OpenAI 클라이언트 초기화 및 어댑터
    ├── s3.ts        # S3 클라이언트 초기화 및 어댑터
    └── config.ts    # 환경 변수 기반 설정 객체
```

- **Module-Based 접근 방식 적용 (캡슐화):**

  - 각 기능 폴더 내의 `services.ts` (또는 유사 파일)에 해당 기능의 핵심 로직을 함수로 구현합니다.
  - 외부(주로 API 핸들러)에서 사용해야 하는 함수만 `export` 하고, 내부적으로만 사용되는 헬퍼 함수 등은 `export` 하지 않아 모듈 내부 구현을 숨깁니다. (제공된 `features/files/services.ts` 예시 참고)

- **Thin API Handlers:**

  - `app/api/` 또는 각 `features/.../api/` 폴더의 라우트 핸들러는 요청 유효성 검사, 인증(필요시), 그리고 해당 기능의 `services.ts` 함수 호출 및 응답 처리 등 최소한의 역할만 수행하도록 리팩토링합니다. (제공된 `app/api/files/route.ts` 예시 참고)

- **Shared Modules 구현:**

  - 데이터베이스 연결 설정, S3 클라이언트 설정, OpenAI 클라이언트 설정 등 인프라 관련 코드는 `shared/` 폴더로 이동시키고, 설정 객체(`shared/config.ts`)나 어댑터 패턴(`shared/openai.ts` 예시 참고)을 활용하여 중앙에서 관리합니다.

- **기존 리팩토링 항목 적용:**
  - **가독성 및 유지보수성:** 명확한 네이밍, 일관된 코딩 스타일(ESLint/Prettier) 적용.
  - **오류 처리 강화:** `try...catch` 사용, 명확한 오류 응답 반환.
  - **설정 관리 확인:** `.env.local` 및 `shared/config.ts`를 통한 설정 관리 확인.
  - **타입 안정성 (TypeScript):** 명확한 타입 정의 및 사용, `any` 최소화.
  - **비동기 처리:** `async/await` 올바른 사용.

## 2단계: 단위 테스트 환경 설정

**테스트 프레임워크 설치:** 프로젝트 계획에 따라 Jest를 설치하고 설정합니다.

```bash
npm install --save-dev jest @types/jest ts-jest
```

또는

```bash
yarn add --dev jest @types/jest ts-jest
```

**Jest 설정 파일 생성:** 프로젝트 루트에 `jest.config.js` 파일을 생성하고, TypeScript 프로젝트를 위한 설정을 추가합니다. (예: `preset: 'ts-jest'`)

```javascript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // 필요한 경우 추가 설정 (moduleNameMapper 등)
};
```

**테스트 스크립트 추가:** `package.json` 파일의 `scripts` 섹션에 테스트 실행 스크립트를 추가합니다.

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest" // 테스트 스크립트 추가
  }
}
```

## 3단계: 단위 테스트 작성

- **테스트 대상 식별:**

  - **주요 대상:** 각 `features/.../services.ts` 파일에서 `export` 된 함수들 (예: `uploadFile`, `listFiles`, `deleteFile`, `generateChatResponse` 등). 이 함수들이 핵심 비즈니스 로직을 포함합니다.
  - **기타 대상:** `features/documents/` 내의 텍스트 추출, 벡터화 함수, `features/chat/` 내의 검색, 생성 함수, 그리고 `shared/` 폴더 내의 유틸리티 함수나 어댑터 함수 등 순수 로직을 포함하는 함수들.

- **의존성 모킹(Mocking):**

  - **모킹 대상:** 테스트 대상 함수가 의존하는 다른 모듈이나 외부 서비스. 주로 `shared/` 폴더에서 import 하는 모듈(S3 클라이언트, OpenAI 클라이언트, DB 클라이언트 등)이나 다른 `features/` 폴더의 함수가 됩니다.
  - **모킹 방법:** Jest의 `jest.fn()`, `jest.mock()` 등을 사용하여 모킹합니다. 예를 들어, `files/services.ts`의 `uploadFile` 함수를 테스트할 때는 `shared/s3.ts`의 `uploadToS3` 함수와 `features/files/storage.ts`의 `saveMetadata` 함수 등을 모킹합니다.

- **테스트 케이스 작성:** (이전 가이드와 동일) 각 함수에 대해 정상 케이스, 엣지 케이스, 오류 케이스를 포함하여 테스트 케이스를 작성합니다.

- **주요 테스트 영역:**
  - `files/services.ts`의 파일 처리 로직 (S3, DB 모킹)
  - `documents/textExtraction.ts`의 텍스트 추출 로직
  - `documents/vectorization.ts`의 임베딩 생성 및 저장 로직 (OpenAI, DB 모킹)
  - `chat/search.ts`의 벡터 검색 로직 (DB 모킹)
  - `chat/generation.ts`의 LLM 호출 및 프롬프트 생성 로직 (OpenAI, 검색 함수 모킹)
  - `chat/cache.ts`의 캐싱 로직
  - `shared/` 폴더 내 유틸리티 함수

## 4단계: 테스트 실행 및 반복 개선

- (이전 가이드와 동일) `npm test` 또는 `yarn test`로 테스트 실행, 실패 시 디버깅 및 코드 수정, 테스트 용이성을 위한 추가 리팩토링 고려.

## 5단계: Git Hooks 설정 (Husky + lint-staged)

코드 커밋(commit) 전에 자동으로 린트 검사(lint)와 코드 포맷팅(format)을 실행하여 코드 스타일과 품질을 일관되게 유지하도록 설정합니다. push 전에 실행하는 것보다, 문제가 있는 코드가 커밋되는 것을 방지하기 위해 commit 전에 실행하는 것이 일반적이고 권장되는 방식입니다.

- **필요 패키지 설치:** Husky와 lint-staged를 개발 의존성(dev dependencies)으로 설치합니다.

```bash
npm install --save-dev husky lint-staged
# 또는
yarn add --dev husky lint-staged
```

- **Husky 설정:** Husky를 활성화하고 Git hooks를 사용할 수 있도록 설정합니다.

```bash
npx husky init
```

이 명령은 `.husky/` 디렉토리를 생성하고 기본적인 pre-commit 훅 파일을 만듭니다.

- **lint-staged 설정:** `package.json` 파일에 lint-staged 설정을 추가합니다. 이 설정은 Git에 스테이징(staged)된 파일들에 대해 어떤 명령을 실행할지 정의합니다.

```json
// package.json
{
  // ... 기존 내용 ...
  "scripts": {
    // ... 기존 스크립트 ...
    "test": "jest",
    "lint": "next lint",
    "format": "prettier --write ." // 전체 포맷팅 스크립트 (선택적)
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix", // ESLint 실행 및 자동 수정
      "prettier --write" // Prettier 실행하여 포맷팅
    ],
    "*.{json,md,css,scss,yml,yaml}": [
      "prettier --write" // 기타 파일 포맷팅
    ]
  }
  // ... 나머지 내용 ...
}
```

위 설정은 `.js`, `.jsx`, `.ts`, `.tsx` 확장자를 가진 스테이징된 파일에 대해 `eslint --fix`와 `prettier --write`를 순차적으로 실행합니다.
다른 확장자 파일에 대해서는 `prettier --write`만 실행합니다.

- **pre-commit 훅 설정:** `.husky/pre-commit` 파일을 열고 아래 내용으로 수정하거나 확인합니다. 이 훅은 `git commit` 명령 실행 시 lint-staged를 실행하도록 합니다.

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# lint-staged 실행
npx lint-staged
```

파일 저장 후, 실행 권한이 설정되어 있는지 확인합니다 (`chmod +x .husky/pre-commit`). `husky init` 시 보통 자동으로 설정됩니다.

- **(선택적) pre-push 훅 설정 (테스트 실행):** push 하기 전에 단위 테스트가 통과하는지 확인하고 싶다면, pre-push 훅을 설정할 수 있습니다.

pre-push 훅 파일 생성:

```bash
npx husky add .husky/pre-push "npm test"
# 또는 yarn 사용 시:
# npx husky add .husky/pre-push "yarn test"
```

생성된 `.husky/pre-push` 파일 내용을 확인하고 필요시 수정합니다.

이제 설정이 완료되었습니다. `git commit`을 시도할 때마다 스테이징된 파일들에 대해 자동으로 ESLint와 Prettier가 실행되어 코드 품질을 검사하고 포맷팅을 적용합니다. 문제가 있으면 커밋이 중단됩니다. (선택적으로 pre-push 훅을 설정했다면, `git push` 시 테스트가 실행됩니다.)

이 Git Hooks 설정을 통해 코드베이스 전체의 일관성을 유지하고 잠재적인 오류를 조기에 발견하는 데 도움이 됩니다. 이제 Phase 2 (프론트엔드 UI 개발 및 통합)를 진행할 준비가 되었습니다.
