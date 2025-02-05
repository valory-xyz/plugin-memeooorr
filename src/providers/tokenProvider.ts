import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
} from "@elizaos/core";
import { TwitterScraper } from "../utils/twitterScrapper";
import { MemeCoin } from "../types/chains";
import { Tweet } from "agent-twitter-client";

export interface TokenInteractionResponse {
  tweet: Tweet;
  memeCoins: MemeCoin[];
  replies: Tweet[] | null;
}

const tokenProvider: Provider = {
  // eslint-disable-next-line
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    const scraper = new TwitterScraper();
    try {
      elizaLogger.info("Attempting Twitter login");
      await scraper.login();
      elizaLogger.info("Twitter login successful");
    } catch (error) {
      elizaLogger.error("Twitter login failed:", error);
      return false;
    }

    if (!(await scraper.getScraper().isLoggedIn())) {
      elizaLogger.error("Failed to login to Twitter");
      return false;
    }

    elizaLogger.debug("Fetching latest tweets for user");
    const tweet = await scraper.getUserLatestTweet();
    if (!tweet) {
      elizaLogger.error("Failed to fetch latest tweet");
      return false;
    }

    elizaLogger.debug("Fetch current memecoins");
    const memeCoins: MemeCoin[] = await scraper.getTokens();
    if (!memeCoins) {
      elizaLogger.error("Failed to fetch previous tweets");
      return false;
    }

    elizaLogger.debug("Fetch replies to tweets");
    const replies = await scraper.getTweetReplies(tweet);

    try {
      const result: TokenInteractionResponse = {
        tweet: tweet,
        memeCoins: memeCoins,
        replies: replies,
      };
      elizaLogger.debug("Tweet retrieved successfully");
      return result;
    } catch (error) {
      elizaLogger.error("Failed to fetch tweet:", error);
      return false;
    }
  },
};

export { tokenProvider };
