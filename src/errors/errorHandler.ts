import { BaseError } from "./baseError";
import { UnexpectedError } from "./applicationErrors";
import { elizaLogger } from "@elizaos/core";

/**
 * Handles errors by logging them appropriately and optionally returning a formatted error
 * 
 * @param error - The error to handle
 * @param includeStack - Whether to include the stack trace in the log (default: true)
 * @returns Formatted error object for client response
 */
export function handleError(error: Error | BaseError, includeStack = true): Record<string, unknown> {
  // Convert to BaseError if it's a standard Error
  const baseError = error instanceof BaseError 
    ? error 
    : new UnexpectedError(error.message, { originalError: error.name });
  
  // Log the error with appropriate level based on operational status
  if (baseError.isOperational) {
    elizaLogger.error(`[${baseError.errorCode}] ${baseError.message}`, {
      statusCode: baseError.statusCode,
      errorCode: baseError.errorCode,
      context: baseError.context,
      ...(includeStack && { stack: baseError.stack }),
    });
  } else {
    elizaLogger.error(`[${baseError.errorCode}] ${baseError.message}`, {
      statusCode: baseError.statusCode,
      errorCode: baseError.errorCode,
      context: baseError.context,
      stack: baseError.stack,
      severity: 'CRITICAL'
    });
  }
  
  // Return formatted error for client response
  return {
    error: {
      message: baseError.message,
      code: baseError.errorCode,
      statusCode: baseError.statusCode,
      ...(baseError.context && { details: baseError.context }),
    },
  };
}

/**
 * Wraps an async function with error handling
 * 
 * @param fn - The async function to wrap
 * @returns A new function that handles errors
 */
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };
}

/**
 * Safely executes a function and returns a result or null if an error occurs
 * 
 * @param fn - The function to execute
 * @param defaultValue - The default value to return if an error occurs
 * @returns The result of the function or the default value
 */
export function tryCatch<T, R>(fn: () => T, defaultValue: R): T | R {
  try {
    return fn();
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)), false);
    return defaultValue;
  }
}

/**
 * Safely executes an async function and returns a result or null if an error occurs
 * 
 * @param fn - The async function to execute
 * @param defaultValue - The default value to return if an error occurs
 * @returns The result of the function or the default value
 */
export async function tryCatchAsync<T, R>(fn: () => Promise<T>, defaultValue: R): Promise<T | R> {
  try {
    return await fn();
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)), false);
    return defaultValue;
  }
}