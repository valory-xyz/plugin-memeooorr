import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
} from "@elizaos/core";
import { TwitterScraper } from "../utils/twitterScrapper.ts";
import { MemeCoin } from "../types/chains.ts";
import { Tweet } from "agent-twitter-client";
import { Scraper, SearchMode } from "agent-twitter-client";

export interface TokenInteractionResponse {
  tweet: Tweet;
  memeCoins: MemeCoin[];
  replies: Tweet[] | null;
}

const tokenProvider: Provider = {
  // eslint-disable-next-line
  get: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    if (!message.content.action) {
      return false;
    } else if (message.content.action !== "TOKEN_ACTION") {
      return false;
    }
    const username = runtime.getSetting("TWITTER_USERNAME")
    const password = runtime.getSetting("TWITTER_PASSWORD")
    const email = runtime.getSetting("TWITTER_EMAIL")

    const ts = new Scraper();
    try {
      elizaLogger.info("Attempting Twitter login");
      await ts.login(username, password, email);
      elizaLogger.info("Twitter login successful");
    } catch (error) {
      elizaLogger.error("Twitter login failed:", error);
      return false;
    }

    const scraper = new TwitterScraper(ts);

    if (!(await scraper.getScraper().isLoggedIn())) {
      elizaLogger.error("Failed to login to Twitter");
      return false;
    }

    elizaLogger.log("Fetching latest tweets for user");
    const tweet = await scraper.getUserLatestTweet(username);
    if (!tweet) {
      elizaLogger.error("Failed to fetch latest tweet");
      return false;
    }

    elizaLogger.log("Fetch current memecoins");
    const memeCoins: MemeCoin[] = await scraper.getTokens();
    if (!memeCoins) {
      elizaLogger.error("Failed to fetch previous tweets");
      return false;
    }

    elizaLogger.log("Fetch replies to tweets");
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
