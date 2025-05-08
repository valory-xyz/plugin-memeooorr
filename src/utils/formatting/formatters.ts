import { Tweet } from "agent-twitter-client";
import { MemeCoin } from "../../types/chains";
import { FormattedTweet } from "../../types/domain/twitter";
import { TokenSummary } from "../../types/domain/token";

/**
 * Formats a tweet or array of tweets into a readable string
 * 
 * @param tweets - The tweet(s) to format
 * @returns A formatted string representation of the tweet(s)
 */
export function formatTweetResponses(tweets: Tweet | Tweet[]): string {
  // Ensure tweets is always an array
  const tweetArray = Array.isArray(tweets) ? tweets : [tweets];

  return tweetArray
    .map((t) => {
      return `tweet: ${t.text}\nviews: ${t.views}\nquotes: ${t.isQuoted ? 1 : 0}\nretweets: ${t.retweets}`;
    })
    .join("\n\n");
}

/**
 * Formats a tweet into a structured object
 * 
 * @param tweet - The tweet to format
 * @returns A formatted tweet object
 */
export function formatTweet(tweet: Tweet): FormattedTweet {
  return {
    id: tweet.id,
    text: tweet.text,
    views: tweet.views || 0,
    quotes: tweet.isQuoted ? 1 : 0,
    retweets: tweet.retweets || 0,
    likes: tweet.likes || 0,
    userId: tweet.userId,
    username: tweet.username,
    timestamp: tweet.timeParsed ? tweet.timeParsed.getTime() : Date.now(),
  };
}

/**
 * Formats meme coins into a readable JSON string
 * 
 * @param memeCoins - The meme coins to format
 * @returns A formatted JSON string
 */
export function formatMemeCoins(memeCoins: MemeCoin[]): string {
  const formattedMemes = memeCoins
    .filter((item) => item.availableActions.length > 0)
    .map((item) => ({
      tokenName: item.tokenName,
      tokenTicker: item.tokenTicker,
      tokenAddress: item.tokenAddress,
      tokenNonce: item.memeNonce,
      heartCount: item.heartCount,
      availableActions: item.availableActions,
    }));

  const jsonFormattedMemes = JSON.stringify(
    { "Actionable Tokens": formattedMemes },
    null,
    2,
  );

  return jsonFormattedMemes;
}

/**
 * Formats meme coins into an array of token summaries
 * 
 * @param memeCoins - The meme coins to format
 * @returns An array of token summaries
 */
export function formatMemeCoinsToSummaries(memeCoins: MemeCoin[]): TokenSummary[] {
  return memeCoins
    .filter((item) => item.availableActions.length > 0)
    .map((item) => ({
      tokenName: item.tokenName,
      tokenTicker: item.tokenTicker,
      tokenAddress: item.tokenAddress,
      heartCount: item.heartCount,
      timestamp: item.timestamp,
      memeNonce: item.memeNonce,
      availableActions: item.availableActions as any[],
    }));
}

/**
 * Formats a bigint value with the specified number of decimals
 * 
 * @param value - The value to format
 * @param decimals - The number of decimals
 * @returns A formatted string
 */
export function formatTokenAmount(value: bigint, decimals: number): string {
  const stringValue = value.toString();
  
  if (decimals === 0) {
    return stringValue;
  }
  
  // Pad with leading zeros if needed
  const padded = stringValue.padStart(decimals + 1, '0');
  
  // Insert decimal point
  const integerPart = padded.slice(0, -decimals) || '0';
  const fractionalPart = padded.slice(-decimals);
  
  // Remove trailing zeros
  const trimmedFractional = fractionalPart.replace(/0+$/, '');
  
  if (trimmedFractional.length === 0) {
    return integerPart;
  }
  
  return `${integerPart}.${trimmedFractional}`;
}

/**
 * Formats an error object into a readable string
 * 
 * @param error - The error to format
 * @returns A formatted error string
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}\n${error.stack || ''}`;
  }
  
  return `Unknown error: ${String(error)}`;
}