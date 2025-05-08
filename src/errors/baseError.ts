/**
 * Base error class for all application errors
 * Extends the native Error class with additional properties
 */
export class BaseError extends Error {
  /** HTTP status code associated with the error */
  public readonly statusCode: number;
  
  /** Error code for identifying the error type */
  public readonly errorCode: string;
  
  /** Whether the error is operational (expected) or programming (unexpected) */
  public readonly isOperational: boolean;
  
  /** Additional context or data related to the error */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new BaseError instance
   * 
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (default: 500)
   * @param errorCode - Error code for identification (default: 'INTERNAL_ERROR')
   * @param isOperational - Whether the error is operational (default: true)
   * @param context - Additional context or data related to the error
   */
  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    isOperational = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}