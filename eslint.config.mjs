// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import globals from "globals";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 무시할 파일/폴더 목록 정의
const ignores = [
  ".next/**",
  "node_modules/**",
  ".db/**",
  "dist/**", // 빌드 결과 폴더가 있다면 추가
];

/** @type {import('eslint').Linter.FlatConfig[]} */
const eslintConfig = [
  // 1. 전역 무시 설정 및 기본 언어 옵션
  {
    ignores: ignores, // 설정 배열의 시작 부분에서 무시 패턴 적용
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // 전역 변수
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: "readonly",
      },
    },
  },

  // 2. TypeScript 파일 (.ts, .tsx) 설정 + 타입 기반 린팅
  {
    files: ["**/*.ts", "**/*.tsx"], // 모든 .ts, .tsx 파일 대상
    // ignores: ignores, // 여기서 다시 명시할 필요는 없음 (상위에서 이미 적용됨)
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json", // 타입 정보 사용 설정
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // 필요한 다른 TS 규칙...
    },
    settings: { react: { version: "detect" } },
  },

  // 3. JavaScript 파일 (.js, .mjs) 설정 (타입 정보 불필요)
  {
    files: ["**/*.js", "**/*.mjs"], // 모든 .js, .mjs 파일 대상
    // ignores: ignores, // 여기서 다시 명시할 필요는 없음
    // languageOptions에는 parserOptions.project가 없음
    // 필요한 경우 기본 JS 규칙 적용
    // rules: { ... }
  },
];

export default eslintConfig;
