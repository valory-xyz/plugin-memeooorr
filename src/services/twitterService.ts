import { elizaLogger } from "@elizaos/core";
import { z } from "zod";

export const TwitterConfigSchema = z.object({
  enabled: z.boolean(),
  username: z.string(),
  dryRun: z.boolean().optional().default(false),
});

export const fetchTweet = async(
  twitterService: TwitterService
) => {
  if (twitterService) {
    await twitterService.fetchLatestTweet({
      ...alert,
      timestamp: Date.now(),
    });
  }
}

export const fetchFeedback = async(
  twitterService: TwitterService
) => {
  if (twitterService) {
    await twitterService.analyzeFeedback({
      ...alert,
      timestamp: Date.now(),
    });
  }
}

export const fetchPreviousTweets = async(
  twitterService: TwitterService
) => {
  if (twitterService) {
    await twitterService.fetchTweets({
      ...alert,
      timestamp: Date.now(),
    });
  }
}

export const postTweet = async(
  twitterService: TwitterService,
  tweet: string
) => {
  if (twitterService) {
    await twitterService.postTweet({
      ...alert,
      timestamp: Date.now(),
    });
  }
}

export interface TweetAlert {
  id: string;
  text: string;
  action: "none" | "tweet" | "like" | "retweet" | "reply" | "quote" | "follow";
}

export class TwitterService {
  private client: any;
  private config: z.infer<typeof TwitterConfigSchema>;

  // Add public getter for config
  public getConfig() {
    return this.config;
  }

  constructor(client: any, config: z.infer<typeof TwitterConfigSchema>) {
    this.client = client;
    this.config = config;
  }

  async postTweet(tweet: string): Promise<boolean> {
    try {
      if (this.config.dryRun) {
        elizaLogger.log("Dry run mode - tweet not posted:", alert.text);
        return true;
      }

      const response = await this.client.twitterClient.sendTweet({
        text: tweet,
      });

      return { success: true, tweetId: response.id };
    } catch (error) {
      elizaLogger.error("Failed to post trade alert to Twitter:", {
        error: error instanceof Error ? error.message : String(error),
        alert,
      });
      return { success: false, error: error.message };
    }
  }

  async buildConversationThread(alert: TweetAlert): Promise<boolean> {
    try {
      if (this.config.dryRun) {
        elizaLogger.log(
          "Dry run mode - conversation thread not built:",
          alert.text,
        );
        return true;
      }

      const response = await this.client.twitterClient.buildConversationThread({
        text: alert.text,
        in_reply_to_status_id: alert.id,
      });

      return true;
    } catch (error) {
      elizaLogger.error("Failed to build conversation thread on Twitter:", {
        error: error instanceof Error ? error.message : String(error),
        alert,
      });
      return false;
    }
  }

  async postTweetAlert(alert: TweetAlert): Promise<boolean> {
    switch (alert.action) {
      case "tweet":
        return this.postTweet(alert.text);
      case "reply":
        return this.buildConversationThread(alert);
      // Add cases for other actions if needed
      case "none":
      case "like":
      case "retweet":
      case "quote":
      case "follow":
      default:
        elizaLogger.log("No action taken for alert:", alert);
        return true;
    }
  }

  async analyzeFeedback(tweetId: string): Promise<any[]> {
    try {
      const response = await this.client.twitterClient.getReplies({
        tweetId,
      });

      return response.data || [];
    } catch (error) {
      elizaLogger.error("Failed to fetch feedback:", error);
      return [];
    }
  }

  async fetchLatestTweet(): Promise<any[]> {
    try {
      const response = await this.client.twitterClient.fetchOwnPosts(count: 1);

      return response.data || [];
    } catch (error) {
      elizaLogger.error("Failed to fetch latest tweet:", error);
      return [];
    }
  }

  async fetchTweets(): Promise<any> {
    try {
      const response = await this.client.twitterClient.fetchOwnPosts({
        count: 5
      });

      return response.data || [];
    } catch (error) {
      elizaLogger.error("Failed to fetch tweet:", error);
      return [];
    }
  }
}
