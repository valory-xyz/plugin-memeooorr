import { elizaLogger } from "@elizaos/core";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  ASSERT = "assert",
}

/**
 * Log context interface
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Logger service that wraps elizaLogger with additional functionality
 */
export class Logger {
  private namespace: string;

  /**
   * Creates a new Logger instance
   * 
   * @param namespace - The namespace for the logger
   */
  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Logs a debug message
   * 
   * @param message - The message to log
   * @param context - Additional context
   */
  public debug(message: string, context?: LogContext): void {
    elizaLogger.debug(`[${this.namespace}] ${message}`, context);
  }

  /**
   * Logs an info message
   * 
   * @param message - The message to log
   * @param context - Additional context
   */
  public info(message: string, context?: LogContext): void {
    elizaLogger.info(`[${this.namespace}] ${message}`, context);
  }

  /**
   * Logs a warning message
   * 
   * @param message - The message to log
   * @param context - Additional context
   */
  public warn(message: string, context?: LogContext): void {
    elizaLogger.warn(`[${this.namespace}] ${message}`, context);
  }

  /**
   * Logs an error message
   * 
   * @param message - The message to log
   * @param context - Additional context
   */
  public error(message: string, context?: LogContext): void {
    elizaLogger.error(`[${this.namespace}] ${message}`, context);
  }

  /**
   * Logs an assertion message
   * 
   * @param message - The message to log
   * @param context - Additional context
   */
  public assert(message: string, context?: LogContext): void {
    elizaLogger.assert(`[${this.namespace}] ${message}`, context);
  }

  /**
   * Logs a message with the specified level
   * 
   * @param level - The log level
   * @param message - The message to log
   * @param context - Additional context
   */
  public log(level: LogLevel, message: string, context?: LogContext): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message, context);
        break;
      case LogLevel.INFO:
        this.info(message, context);
        break;
      case LogLevel.WARN:
        this.warn(message, context);
        break;
      case LogLevel.ERROR:
        this.error(message, context);
        break;
      case LogLevel.ASSERT:
        this.assert(message, context);
        break;
      default:
        this.info(message, context);
    }
  }
}

/**
 * Creates a new logger instance with the specified namespace
 * 
 * @param namespace - The namespace for the logger
 * @returns A new Logger instance
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

/**
 * Default logger instance
 */
export const logger = createLogger("app");