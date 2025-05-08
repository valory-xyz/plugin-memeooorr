import { TokenDecision } from "../types/domain/token";
import { validateTokenAmount } from "./validation/validators";
import { formatMemeCoins, formatTweetResponses } from "./formatting/formatters";

/**
 * Function to convert content to the TokenDecision type
 * 
 * @param content - The content to convert
 * @returns A TokenDecision object
 */
export function convertToDecision(content: any): TokenDecision {
  return {
    action: content.action,
    tokenAddress: content.tokenAddress || "",
    tokenNonce: validateTokenAmount(content.tokenNonce || "0", true),
    tokenName: content.tokenName || null,
    tokenTicker: content.tokenTicker || null,
    tokenSupply: content.tokenSupply ? validateTokenAmount(content.tokenSupply, true) : null,
    amount: validateTokenAmount(content.amount || "0", true),
    tweet: content.tweet || "",
    new_persona: content.new_persona || null,
  };
}

// Re-export the formatting functions for backward compatibility
export { formatMemeCoins, formatTweetResponses };