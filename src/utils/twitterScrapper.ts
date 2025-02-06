import { Scraper, Tweet, SearchMode } from "agent-twitter-client";
import { elizaLogger } from "@elizaos/core";
import { PackageQueryVariables, PackageQuery } from "../types/subgraph";
import { TOKENS_QUERY, PACKAGE_QUERY } from "../constants";
import { MemeCoin, TokensQuery } from "../types/chains";

import fs from "fs";

export class TwitterScraper {
  private scraper: Scraper;

  constructor() {}

  public getScraper(): Scraper {
    return this.scraper;
  }

  public async getUserIdByScreenName(screenName: string) {
    return await this.scraper.getUserIdByScreenName(screenName);
  }

  public async login() {
    const cookiesFilePath = "./cookies.json";
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const email = process.env.TWITTER_EMAIL;
    const twitter2faSecret = process.env.TWITTER_2FA_SECRET;

    if (fs.existsSync(cookiesFilePath)) {
      // Load cookies from file
      const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, "utf-8"));
      this.scraper = new Scraper();

      await this.scraper.setCookies(cookies);
      elizaLogger.info("Loaded cookies from file");

      if (await this.scraper.isLoggedIn()) {
        elizaLogger.info("Logged in using cookies");
        return true;
      } else {
        elizaLogger.warn("Cookies are invalid, logging in with credentials");
      }
    }

    if (!username || !password) {
      elizaLogger.error("Twitter credentials not configured in environment");
      return false;
    }

    // Login with credentials
    this.scraper = new Scraper();
    await this.scraper.login(username, password, email, twitter2faSecret);
    const cookies = await this.scraper.getCookies();
    fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies, null, 2));

    if (!(await this.scraper.isLoggedIn())) {
      elizaLogger.error("Failed to login to Twitter");
      return false;
    }

    elizaLogger.info("Logged in with credentials and saved cookies");
    return true;
  }

  /**
   * Get Subgraph url for querying
   * @param runtime Agent runtime environment
   * @returns Subgraph url
   * @throws Error if subgraph url is missing or invalid
   */
  public getSubgraphUrl(): string {
    const subgraphUrl = process.env.SUBGRAPH_URL;
    if (!subgraphUrl) {
      throw new Error("No subgraph url configured");
    }

    return subgraphUrl;
  }

  public async likeTweet(id: string) {
    if (!id) {
      elizaLogger.error("Tweet id not found");
      throw new Error("Tweet id not found");
    }
    return await this.scraper.likeTweet(id);
  }

  public async retweet(id: string) {
    if (!id) {
      elizaLogger.error("Tweet id not found");
      throw new Error("Tweet id not found");
    }
    return await this.scraper.retweet(id);
  }

  public async sendUserTweet(message: string) {
    return await this.scraper.sendTweet(message);
  }

  public async replyToTweet(id: string, message: string) {
    if (!id) {
      elizaLogger.error("Tweet id not found");
      throw new Error("Tweet id not found");
    }
    return await this.scraper.sendQuoteTweet(message, id);
  }

  public async followUser(userId: string) {
    return await this.scraper.followUser(userId);
  }

  public async quoteTweet(id: string, message: string) {
    if (!id) {
      elizaLogger.error("Tweet id not found");
      throw new Error("Tweet id not found");
    }
    return await this.scraper.sendTweet(message, id);
  }

  public async getUserLatestTweet() {
    const username = process.env.TWITTER_USERNAME;
    if (!username) {
      elizaLogger.error("Twitter username not configured in environment");
      throw new Error("Twitter username not configured in environment");
    }
    return await this.scraper.getLatestTweet(username);
  }

  public async getTweetReplies(tweet: Tweet) {
    const username = process.env.TWITTER_USERNAME;
    if (!username) {
      elizaLogger.error("Twitter username not configured in environment");
      throw new Error("Twitter username not configured in environment");
    }
    let cursor: string | undefined = undefined;
    const query = `conversation_id:"${tweet.conversationId}"`;

    let nTweets = 0;

    const replies = await this.scraper.fetchSearchTweets(
      query,
      5,
      SearchMode.Top,
      cursor,
    );

    return replies.tweets;
  }

  public async fetchPreviousTweets(tweet: Tweet) {
    const username = process.env.TWITTER_USERNAME;
    if (!username) {
      elizaLogger.error("Twitter username not configured in environment");
      throw new Error("Twitter username not configured in environment");
    }

    const previousTweets = this.scraper.getTweets(username, 6);

    // fetch all tweets that are not the current tweet and are not replies
    let filteredTweets: Tweet[] = [];
    for await (const t of previousTweets) {
      if (t.id !== tweet.id && !tweet.isReply && !tweet.isRetweet) {
        filteredTweets.push(t);
      }
    }
    // Parse the tweets using the provided logic
    const prev = filteredTweets
      .map(
        (tweet) =>
          `tweet_id: ${tweet.id}\ntweet_text: ${tweet.text}\nuser_id: ${tweet.userId}`,
      )
      .join("\n\n");

    return prev;
  }

  async getUsersFromSubgraph() {
    const username = process.env.TWITTER_USERNAME;
    let handles: string[] = [];

    const MEMEOOORR_DESCRIPTION_PATTERN = /^Memeooorr @(\w+)$/;

    const url = this.getSubgraphUrl();

    const data = {
      query: PACKAGE_QUERY,
      variables: {
        package_type: "package",
      },
    };

    // dump data to json and encode it
    const dataJson = JSON.stringify(data);
    const dataEncoded = encodeURIComponent(dataJson);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: dataEncoded,
    });

    if (!response.ok) {
      elizaLogger.error("Failed to fetch packages from subgraph:", {
        status: response.status,
        error: await response.text(),
      });
      return [];
    }

    const responseData = await response.json();
    const services = responseData.data;

    for (const unit of services.units) {
      const description = unit.description;
      const match = description.match(MEMEOOORR_DESCRIPTION_PATTERN);
      if (match) {
        const screenName = match[1];
        const userId = await this.getUserIdByScreenName(screenName);
        if (userId && userId !== username) {
          handles.push(userId);
        }
      }
    }

    return handles;
  }

  public async getOtherUserTweets() {
    // query runtime Db for all messages with type as Interaction
    let tweets: Tweet[] = [];
    const handles = await this.getUsersFromSubgraph();

    if (handles.length === 0) {
      elizaLogger.error("No users found in subgraph");
      return "";
    }

    for (const handle of handles) {
      const tweet = await this.scraper.getLatestTweet(handle);
      if (tweet) {
        tweets.push(tweet);
      }
    }

    // Parse the tweets using the provided logic
    const other_tweets = tweets
      .map(
        (tweet) =>
          `tweet_id: ${tweet.id}\ntweet_text: ${tweet.text}\nuser_id: ${tweet.userId}`,
      )
      .join("\n\n");

    return other_tweets;
  }

  /**
   * Get tokens from subgraph
   * @param runtime Agent runtime environment
   * @returns Owner account
   */
  public async getTokens() {
    elizaLogger.info("Getting tokens from Olas subgraph...");
    const memeSubgraphUrl = process.env.MEME_SUBGRAPH_URL;
    if (!memeSubgraphUrl) {
      throw new Error("No meme subgraph url configured");
    }

    const headers = {
      "Content-Type": "application/json",
    };

    const data: TokensQuery = {
      query: TOKENS_QUERY,
    };

    // dump data to json and encode it
    const dataJson = JSON.stringify(data);
    const dataEncoded = encodeURIComponent(dataJson);

    try {
      elizaLogger.info("Getting tokens from subgraph");
      const response = await fetch(memeSubgraphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: dataEncoded,
      });

      if (!response.ok) {
        elizaLogger.error("Failed to fetch packages from subgraph:", {
          status: response.status,
          error: await response.text(),
        });
        return [];
      }
      const responseData = await response.json();
      const items = responseData.data.memeTokens.items;

      const filteredItems = items.filter(
        (t: any) => t.chain === 8143 && parseInt(t.memeNonce) > 0,
      );

      const memeCoins: MemeCoin[] = filteredItems.map((item: any) => ({
        tokenName: item.tokenName,
        tokenTicker: item.tokenTicker,
        blockNumber: item.blockNumber,
        chain: item.chain,
        tokenAddress: item.tokenAddress,
        liquidity: item.liquidity,
        heartCount: item.heartCount,
        isUnleashed: item.isUnleashed,
        isPurged: item.isPurged,
        lpPairAddress: item.lpPairAddress,
        owner: item.owner,
        timestamp: item.timestamp,
        memeOnce: item.memeOnce,
        summonTime: item.summonTime,
        unleashTime: item.unleashTime,
        tokenNonce: item.tokenNonce,
      }));

      return memeCoins;
    } catch (error) {
      elizaLogger.error(`Error getting tokens from subgraph: ${error}`);
      throw new Error("Failed to get tokens from subgraph");
    }
  }
}
