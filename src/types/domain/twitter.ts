import { Tweet } from "agent-twitter-client";

/**
 * Twitter interaction types
 */
export type TwitterAction = "tweet" | "like" | "retweet" | "reply" | "quote" | "follow";

/**
 * Twitter interaction result
 */
export interface TwitterInteractionResult {
  action: TwitterAction;
  tweet_id: string;
  text: string;
  success: boolean;
  timestamp: number;
}

/**
 * Twitter user profile
 */
export interface TwitterProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  followers: number;
  following: number;
  isVerified: boolean;
}

/**
 * Formatted tweet response
 */
export interface FormattedTweet {
  id: string;
  text: string;
  views: number;
  quotes: number;
  retweets: number;
  likes: number;
  userId: string;
  username?: string;
  timestamp: number;
}

/**
 * Helper function to format a tweet
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