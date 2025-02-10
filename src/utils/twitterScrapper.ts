import { Scraper, Tweet, SearchMode } from "agent-twitter-client";
import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { TOKENS_QUERY, PACKAGE_QUERY } from "../constants.ts";
import { MemeCoin, TokensQuery } from "../types/chains.ts";

import fs from "fs";

const __cookiesFilePath = "./cookies.json";

export class TwitterScraper {
  private scraper: Scraper;

  constructor(sc: Scraper) {
    this.scraper = sc;
  }

  public getScraper(): Scraper {
    return this.scraper;
  }

  public async getUserIdByScreenName(screenName: string) {
    return await this.scraper.getUserIdByScreenName(screenName);
  }

  public async saveCookies() {
    const cookiesFilePath = "./cookies.json";

    if (!fs.existsSync(cookiesFilePath)) {
      // Load cookies from file
      const cookies = await this.scraper.getCookies();
      fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies, null, 2));

    }
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

  public async getUserLatestTweet(username: string) {
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

  async getUsersFromSubgraph(url: string, username: string) {
    let handles: string[] = [];

    const MEMEOOORR_DESCRIPTION_PATTERN = /^Memeooorr @(\w+)$/;

    const data = {
      query: PACKAGE_QUERY,
      variables: {
        package_type: "service",
      },
    };

    // dump data to json and encode it
    const dataJson = JSON.stringify(data);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: dataJson,
    });

    if (!response.ok) {
      elizaLogger.error("Failed to fetch packages from subgraph:", {
        status: response.status,
        error: await response.text(),
      });
    }

    const responseData = await response.json();
    const services = responseData.data;

    for (const unit of services.units) {
      const description = unit.description;
      const match = description.match(MEMEOOORR_DESCRIPTION_PATTERN);
      if (match) {
        const screenName = match[1];
        if (screenName && screenName !== username) {
          handles.push(screenName);
        }
      }
    }

    if (handles.length === 0) {
      elizaLogger.error("No users found in subgraph or the query is invalid");
      return null;
    }

    return handles;
  }

  public async getOtherUserTweets(_runtime: IAgentRuntime,handles: string[]) {
    // query runtime Db for all messages with type as Interaction
    let tweets: Tweet[] = [];

    for (const handle of handles) {
      try {
        const tweet = await this.scraper.getLatestTweet(handle);
        if (tweet) {
          tweets.push(tweet);
        }
      } catch(error) {
        elizaLogger.error("Failed to fetch tweet for handle:", handle);
      }
    }

    if (tweets.length === 0) {
      elizaLogger.error("No tweets found for any of the handles");
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

function readCookies() {
  if (fs.existsSync(__cookiesFilePath)) {
    const cookies = JSON.parse(fs.readFileSync(__cookiesFilePath, "utf8"));
    const cookieStrings = cookies?.map(
        (cookie: any) =>
          `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
            cookie.path
          }; ${cookie.secure ? 'Secure' : ''}; ${
            cookie.httpOnly ? 'HttpOnly' : ''
          }; SameSite=${cookie.sameSite || 'Lax'}`,
      );
    return cookieStrings;
  }
  return null;
}

export async function getScrapper(runtime: IAgentRuntime):Promise<Scraper | null> {
  const username = runtime.getSetting("TWITTER_USERNAME")
  const password = runtime.getSetting("TWITTER_PASSWORD")
  const email = runtime.getSetting("TWITTER_EMAIL")

  elizaLogger.info("Attempting Twitter login with username:", username, password, email);

  const ts = new Scraper();


  try {
    const cookieStrings = readCookies();
    if (cookieStrings) {
      elizaLogger.info("Attempting Twitter login using cookies");
      await ts.setCookies(cookieStrings);
      if (await ts.isLoggedIn()) {
        elizaLogger.info("Twitter login successful using cookies");
        return ts;
      }
    } else {
      throw new Error("No cookies found");
    }
    elizaLogger.info("Twitter login successful using cookies");
  } catch (error) {
    elizaLogger.warn("Failed to set cookies, Performing Normal Login:", error);
    await ts.login(username, password, email);
    const cookies = await ts.getCookies();
    fs.writeFileSync(__cookiesFilePath, JSON.stringify(cookies, null, 2));
    if (await ts.isLoggedIn()) {
      elizaLogger.warn("Twitter login successful but without cookies");
      return ts;
    }
  }

  return null;

}
