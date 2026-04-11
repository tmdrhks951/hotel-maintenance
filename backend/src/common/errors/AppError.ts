export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  /// 클라이언트가 분기 처리에 사용하는 머신 리더블 에러 코드
  public readonly code?: string;

  constructor(message: string, statusCode = 500, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
