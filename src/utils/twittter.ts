import { Tweet } from "agent-twitter-client";
import { MemeCoin } from "../types";
// Define the type for the decision object
export type Decision = {
  action: "summon" | "heart" | "unleash" | "collect" | "purge" | "burn";
  tokenAddress: string;
  tokenNonce: bigint;
  tokenName: string | null;
  tokenTicker: string | null;
  tokenSupply: bigint | null;
  amount: bigint;
  tweet: string;
  new_persona: string | null;
};

// TOKEN SUMMARY
export type TOKEN_SUMMARY = {
  tokenName: string;
  tokenTicker: string;
  tokenAddress: string;
  heartCount: string;
  timestamp: number;
  memeNonce: string;
  availableActions: string[];
};

// Function to convert content to the Decision type
export function convertToDecision(content: any): Decision {
  return {
    action: content.action, // Default to 'summon' if not valid
    tokenAddress: content.tokenAddress || "",
    tokenNonce: BigInt(content.tokenNonce || "0"),
    tokenName: content.tokenName || null,
    tokenTicker: content.tokenTicker || null,
    tokenSupply: content.tokenSupply ? BigInt(content.tokenSupply) : null,
    amount: BigInt(content.amount || 0),
    tweet: content.tweet || "",
    new_persona: content.new_persona || null,
  };
}

export function formatMemeCoins(memeCoins: MemeCoin[]): string {
  const formattedMemes = memeCoins
    .filter((item) => item.availableActions.length > 0)
    .map((item) => ({
      tokenName: item.tokenName,
      tokenTicker: item.tokenTicker,
      tokenAddress: item.tokenAddress,
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

// Function to format tweet responses
export function formatTweetResponses(tweets: Tweet | Tweet[]): string {
  // Ensure tweets is always an array
  const tweetArray = Array.isArray(tweets) ? tweets : [tweets];

  return tweetArray
    .map((t) => {
      return `tweet: ${t.text}\nviews: ${t.views}\nquotes: ${t.isQuoted ? 1 : 0}\nretweets: ${t.retweets}`;
    })
    .join("\n\n");
}
