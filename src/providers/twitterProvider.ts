import { elizaLogger } from "@elizaos/core";
import fetch from "node-fetch";

interface TwitterPostPayload {
  text: string;
  replyTo?: string;
  quoteTo?: string;
  mediaIds?: string[];
}

interface TwitterResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class TwitterProvider {
  private static API_BASE_URL = "https://api.twitter.com/2";
  private static instance: TwitterProvider | null = null;

  private constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error("Twitter API key is required");
    }
    elizaLogger.log("TwitterProvider initialized.");
  }

  /**
   * Get the singleton instance of the TwitterProvider.
   * @param apiKey - The API key for Twitter authentication.
   * @returns The TwitterProvider instance.
   */
  static getInstance(apiKey: string): TwitterProvider {
    if (!TwitterProvider.instance) {
      TwitterProvider.instance = new TwitterProvider(apiKey);
    }
    return TwitterProvider.instance;
  }

  /**
   * Posts a tweet.
   * @param payload - The tweet payload.
   * @returns TwitterResponse indicating success or failure.
   */
  async postTweet(payload: TwitterPostPayload): Promise<TwitterResponse> {
    const url = `${TwitterProvider.API_BASE_URL}/tweets`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          text: payload.text,
          in_reply_to_status_id: payload.replyTo,
          attachment_url: payload.quoteTo,
          media_ids: payload.mediaIds,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        elizaLogger.log("Tweet posted successfully:", data);
        return { success: true, data };
      } else {
        elizaLogger.error("Failed to post tweet:", data);
        return { success: false, error: data.errors || "Unknown error" };
      }
    } catch (error) {
      elizaLogger.error("Error posting tweet:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieves the latest tweets from a user.
   * @param username - The Twitter username.
   * @param limit - The maximum number of tweets to retrieve.
   * @returns TwitterResponse containing the tweets or an error.
   */
  async getUserTweets(
    username: string,
    limit: number = 10,
  ): Promise<TwitterResponse> {
    const url = `${TwitterProvider.API_BASE_URL}/users/by/username/${username}/tweets?max_results=${limit}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        elizaLogger.log(`Fetched tweets for user ${username}:`, data);
        return { success: true, data };
      } else {
        elizaLogger.error(`Failed to fetch tweets for user ${username}:`, data);
        return { success: false, error: data.errors || "Unknown error" };
      }
    } catch (error) {
      elizaLogger.error(`Error fetching tweets for user ${username}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Likes a tweet.
   * @param tweetId - The ID of the tweet to like.
   * @returns TwitterResponse indicating success or failure.
   */
  async likeTweet(tweetId: string): Promise<TwitterResponse> {
    const url = `${TwitterProvider.API_BASE_URL}/likes/${tweetId}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        elizaLogger.log(`Tweet ${tweetId} liked successfully:`, data);
        return { success: true, data };
      } else {
        elizaLogger.error(`Failed to like tweet ${tweetId}:`, data);
        return { success: false, error: data.errors || "Unknown error" };
      }
    } catch (error) {
      elizaLogger.error(`Error liking tweet ${tweetId}:`, error);
      return { success: false, error: error.message };
    }
  }
}
