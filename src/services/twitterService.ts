import { elizaLogger } from "@elizaos/core";
import fetch from "node-fetch"; // Replace with a Twitter API SDK if preferred.

const TWITTER_API_BASE_URL = "https://api.twitter.com/2";

/**
 * Fetches replies to a specific tweet.
 * @param tweetId - The ID of the tweet to fetch replies for.
 * @returns An array of feedback messages from the replies.
 */
export async function fetchTweetReplies(tweetId: string): Promise<string[]> {
  try {
    const url = `${TWITTER_API_BASE_URL}/tweets/${tweetId}/replies`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tweet replies: ${response.statusText}`);
    }

    const data = await response.json();
    const replies = data.data.map((reply: any) => reply.text);

    elizaLogger.log("Fetched tweet replies:", replies);

    return replies;
  } catch (error) {
    elizaLogger.error("Error fetching tweet replies:", error);
    throw error;
  }
}

/**
 * Posts a tweet.
 * @param text - The content of the tweet.
 * @returns The ID of the newly posted tweet.
 */
export async function postTweet(text: string): Promise<string> {
  try {
    const url = `${TWITTER_API_BASE_URL}/tweets`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Failed to post tweet: ${response.statusText}`);
    }

    const data = await response.json();
    const tweetId = data.data.id;

    elizaLogger.log("Posted tweet with ID:", tweetId);

    return tweetId;
  } catch (error) {
    elizaLogger.error("Error posting tweet:", error);
    throw error;
  }
}

/**
 * Likes a tweet.
 * @param tweetId - The ID of the tweet to like.
 * @returns True if successful, false otherwise.
 */
export async function likeTweet(tweetId: string): Promise<boolean> {
  try {
    const url = `${TWITTER_API_BASE_URL}/tweets/${tweetId}/like`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to like tweet: ${response.statusText}`);
    }

    elizaLogger.log(`Liked tweet with ID: ${tweetId}`);
    return true;
  } catch (error) {
    elizaLogger.error("Error liking tweet:", error);
    return false;
  }
}
