import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
} from "@elizaos/core";
import { TwitterScraper, getScrapper } from "../utils/twitterScrapper";
import type { MemeCoin } from "../types/chains";
import type { Tweet } from "agent-twitter-client";
import { Scraper } from "agent-twitter-client";
import { getSafeAccount } from "./safeaccount";

export interface TokenInteractionResponse {
  tweet: Tweet;
  memeCoins: MemeCoin[];
  replies: Tweet[] | null;
  balance: string;
}

const tokenProvider: Provider = {
  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    elizaLogger.log("Fetching token information");
    const username = runtime.getSetting("TWITTER_USERNAME") as string;
    const subUrl = runtime.getSetting("MEME_SUBGRAPH_URL") as string;
    const rpcUrl = runtime.getSetting("BASE_LEDGER_RPC") as string;
    const memeFactoryAdress = runtime.getSetting(
      "MEME_FACTORY_CONTRACT",
    ) as `0x${string}`;
    const safeAddress = runtime.getSetting("SAFE_ADDRESS") as `0x${string}`;

    const ts: Scraper | null = await getScrapper(runtime);
    if (!ts) {
      elizaLogger.error("Failed to get scraper");
      return false;
    }

    const scraper = new TwitterScraper(ts);

    elizaLogger.assert("Fetching latest tweets for user");
    const tweet = await scraper.getUserLatestTweet(username);
    if (!tweet) {
      elizaLogger.error("Failed to fetch latest tweet");
      return false;
    }

    elizaLogger.assert("Fetch current memecoins");
    const memeCoins: MemeCoin[] = await scraper.getTokens(
      subUrl,
      rpcUrl,
      memeFactoryAdress,
      safeAddress,
    );
    if (!memeCoins) {
      elizaLogger.error("Failed to fetch memecoins");
      return false;
    }

    elizaLogger.assert("Fetch replies to tweets");
    const replies = await scraper.getTweetReplies(username, tweet);

    // fetch available balance
    const balanceClient = getSafeAccount(runtime);
    const balance = await balanceClient.getSafeBalance();
    elizaLogger.success("Balance retrieved successfully");
    elizaLogger.success(`${balance}`);

    try {
      const result: TokenInteractionResponse = {
        tweet: tweet,
        memeCoins: memeCoins,
        replies: replies,
        balance: balance.toString(),
      };
      elizaLogger.success("Token interaction payload retrieved successfully");
      return result;
    } catch (error) {
      elizaLogger.error("Failed to fetch tweet:", error);
      return false;
    }
  },
};

export { tokenProvider };
