import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
} from "@elizaos/core";
import { TwitterScraper, getScrapper } from "../utils/twitterScrapper.ts";
import { MemeCoin } from "../types/chains.ts";
import { Tweet } from "agent-twitter-client";
import { Scraper, SearchMode } from "agent-twitter-client";
import { getSafeAccount } from "./safeaccount.ts";

export interface TokenInteractionResponse {
  tweet: Tweet;
  memeCoins: MemeCoin[];
  replies: Tweet[] | null;
  balance: string;
}

const tokenProvider: Provider = {
  // eslint-disable-next-line
  get: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    // if (!message.content.action) {
    //   return false;
    // } else if (message.content.action !== "TOKEN_ACTION") {
    //   return false;
    // }
    //
    elizaLogger.log("Fetching token information");
    const username = runtime.getSetting("TWITTER_USERNAME") as string;
    const subUrl = runtime.getSetting("MEME_SUBGRAPH_URl") as string;

    const ts: Scraper | null = await getScrapper(runtime);
    if (!ts) {
      elizaLogger.error("Failed to get scraper");
      return false;
    }

    const scraper = new TwitterScraper(ts);

    elizaLogger.log("Fetching latest tweets for user");
    const tweet = await scraper.getUserLatestTweet(username);
    if (!tweet) {
      elizaLogger.error("Failed to fetch latest tweet");
      return false;
    }

    elizaLogger.log("Fetch current memecoins");
    const memeCoins: MemeCoin[] = await scraper.getTokens(subUrl);
    if (!memeCoins) {
      elizaLogger.error("Failed to fetch previous tweets");
      return false;
    }

    elizaLogger.log("Fetch replies to tweets");
    const replies = await scraper.getTweetReplies(tweet);

    // fetch available balance
    const balanceClient = getSafeAccount(runtime);
    const balance = await balanceClient.getSafeBalance();
    elizaLogger.debug("Tweet retrieved successfully");

    try {
      const result: TokenInteractionResponse = {
        tweet: tweet,
        memeCoins: memeCoins,
        replies: replies,
        balance: balance.toString(),
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
