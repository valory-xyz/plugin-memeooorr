import { Tweet } from "agent-twitter-client";

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
    action: content.action, // Default to 'action1' if not valid
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

export function formatMemeCoins(memeCoins: TOKEN_SUMMARY[]): string {
  return memeCoins
    .filter((meme) => meme.availableActions.length > 0)
    .map((meme) => {
      return `Token Name: ${meme.tokenName}, Token Ticker: ${meme.tokenTicker}, Token Address: ${meme.tokenAddress}, Heart Count: ${meme.heartCount}, Available Actions: ${meme.availableActions.join(", ")}`;
    })
    .join("\n");
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
