// src/shared/errors.ts

/**
 * 일반적인 애플리케이션 오류
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    // Error.captureStackTrace(this, this.constructor); // Node.js 환경에서 스택 트레이스 개선
  }
}

/**
 * 리소스를 찾을 수 없을 때 발생하는 오류
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

/**
 * 유효하지 않은 입력 오류
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(message, 400);
  }
}

/**
 * 설정 오류
 */
export class ConfigError extends AppError {
  constructor(message: string = "Configuration error") {
    super(message, 500);
  }
}

/**
 * 외부 서비스 오류 (S3, OpenAI 등)
 */
export class ExternalServiceError extends AppError {
  constructor(message: string = "External service error") {
    super(message, 503); // Service Unavailable
  }
}
