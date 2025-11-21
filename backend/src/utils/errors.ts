export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ExecutionError extends AppError {
  constructor(message: string) {
    super(500, message);
    Object.setPrototypeOf(this, ExecutionError.prototype);
  }
}

export class TimeoutError extends AppError {
  constructor(message = 'Code execution timeout') {
    super(408, message);
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class HopxError extends AppError {
  constructor(message: string, statusCode = 502) {
    super(statusCode, `Hopx API Error: ${message}`);
    Object.setPrototypeOf(this, HopxError.prototype);
  }
}
