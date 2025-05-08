import { BaseError } from "./baseError";

/**
 * Error thrown when validation fails
 */
export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", true, context);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 404, "NOT_FOUND_ERROR", true, context);
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 401, "AUTHENTICATION_ERROR", true, context);
  }
}

/**
 * Error thrown when authorization fails
 */
export class AuthorizationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 403, "AUTHORIZATION_ERROR", true, context);
  }
}

/**
 * Error thrown when there's an issue with API requests
 */
export class ApiError extends BaseError {
  constructor(message: string, statusCode = 500, context?: Record<string, unknown>) {
    super(message, statusCode, "API_ERROR", true, context);
  }
}

/**
 * Error thrown when there's an issue with Twitter operations
 */
export class TwitterError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, "TWITTER_ERROR", true, context);
  }
}

/**
 * Error thrown when there's an issue with token operations
 */
export class TokenError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, "TOKEN_ERROR", true, context);
  }
}

/**
 * Error thrown when there's a configuration issue
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, "CONFIGURATION_ERROR", true, context);
  }
}

/**
 * Error thrown when there's an unexpected error
 */
export class UnexpectedError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, "UNEXPECTED_ERROR", false, context);
  }
}