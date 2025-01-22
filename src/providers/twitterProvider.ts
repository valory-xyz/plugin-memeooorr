import { elizaLogger } from "@elizaos/core";
import { fetchWithRetry } from "../utils/fetchUtils";

export class TwitterProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;

    if (!this.apiUrl || !this.apiKey) {
      throw new Error("Twitter API URL or API Key is missing.");
    }
  }

  /**
   * Fetch the latest tweets of a user.
   * @param twitterHandle - The Twitter handle of the user.
   * @param limit - Maximum number of tweets to fetch.
   * @returns A list of tweets.
   */
  async getUserTweets(twitterHandle: string, limit = 10): Promise<any[]> {
    const url = `${this.apiUrl}/users/${twitterHandle}/tweets?limit=${limit}`;
    elizaLogger.log(`Fetching tweets for user: ${twitterHandle}`);

    try {
      const response = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.data || [];
    } catch (error) {
      elizaLogger.error("Error fetching user tweets:", error);
      throw error;
    }
  }

  /**
   * Search for tweets based on a query.
   * @param query - The search query string.
   * @param limit - Maximum number of tweets to fetch.
   * @returns A list of tweets matching the query.
   */
  async searchTweets(query: string, limit = 10): Promise<any[]> {
    const url = `${this.apiUrl}/tweets/search?query=${encodeURIComponent(query)}&limit=${limit}`;
    elizaLogger.log(`Searching tweets with query: ${query}`);

    try {
      const response = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.data || [];
    } catch (error) {
      elizaLogger.error("Error searching tweets:", error);
      throw error;
    }
  }

  /**
   * Like a tweet.
   * @param tweetId - The ID of the tweet to like.
   * @returns The response from the API.
   */
  async likeTweet(tweetId: string): Promise<boolean> {
    const url = `${this.apiUrl}/tweets/${tweetId}/like`;
    elizaLogger.log(`Liking tweet with ID: ${tweetId}`);

    try {
      const response = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.success;
    } catch (error) {
      elizaLogger.error("Error liking tweet:", error);
      throw error;
    }
  }

  /**
   * Reply to a tweet.
   * @param tweetId - The ID of the tweet to reply to.
   * @param text - The text of the reply.
   * @returns The response from the API.
   */
  async replyToTweet(tweetId: string, text: string): Promise<boolean> {
    const url = `${this.apiUrl}/tweets/${tweetId}/reply`;
    elizaLogger.log(`Replying to tweet with ID: ${tweetId}`);

    try {
      const response = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      return response.success;
    } catch (error) {
      elizaLogger.error("Error replying to tweet:", error);
      throw error;
    }
  }
}
