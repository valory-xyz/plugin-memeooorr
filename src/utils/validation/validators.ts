import { isAddress } from "viem";
import { z } from "zod";
import { ValidationError } from "../../errors/applicationErrors";

/**
 * Validates if a string is a valid Ethereum address
 * 
 * @param address - The address to validate
 * @returns True if the address is valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Validates if a string is a valid Twitter handle
 * 
 * @param handle - The Twitter handle to validate
 * @returns True if the handle is valid, false otherwise
 */
export function isValidTwitterHandle(handle: string): boolean {
  // Twitter handle rules: 1-15 characters, alphanumeric and underscores only
  const twitterHandleRegex = /^[a-zA-Z0-9_]{1,15}$/;
  return twitterHandleRegex.test(handle);
}

/**
 * Validates if a string is a valid tweet ID
 * 
 * @param tweetId - The tweet ID to validate
 * @returns True if the tweet ID is valid, false otherwise
 */
export function isValidTweetId(tweetId: string): boolean {
  // Tweet IDs are numeric strings
  const tweetIdRegex = /^[0-9]+$/;
  return tweetIdRegex.test(tweetId);
}

/**
 * Validates data against a Zod schema and returns the validated data
 * 
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated data
 * @throws ValidationError if validation fails
 */
export function validateWithZod<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      throw new ValidationError('Validation failed', {
        errors: formattedErrors,
        receivedData: data,
      });
    }
    throw error;
  }
}

/**
 * Validates a token amount string and converts it to BigInt
 * 
 * @param amount - The amount string to validate
 * @param allowZero - Whether to allow zero amounts (default: false)
 * @returns The amount as BigInt
 * @throws ValidationError if the amount is invalid
 */
export function validateTokenAmount(amount: string, allowZero = false): bigint {
  try {
    const bigIntAmount = BigInt(amount);
    if (!allowZero && bigIntAmount === BigInt(0)) {
      throw new ValidationError('Token amount must be greater than zero');
    }
    return bigIntAmount;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Invalid token amount format', { receivedAmount: amount });
  }
}

/**
 * Validates required parameters are present
 * 
 * @param params - Object containing parameters
 * @param requiredParams - Array of required parameter names
 * @throws ValidationError if any required parameter is missing
 */
export function validateRequiredParams(
  params: Record<string, unknown>,
  requiredParams: string[]
): void {
  const missingParams = requiredParams.filter(
    (param) => params[param] === undefined || params[param] === null || params[param] === ''
  );
  
  if (missingParams.length > 0) {
    throw new ValidationError('Missing required parameters', {
      missingParams,
      receivedParams: Object.keys(params),
    });
  }
}