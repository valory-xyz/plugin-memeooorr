import type { Tweet } from "agent-twitter-client";
import { Scraper, SearchMode } from "agent-twitter-client";
import { elizaLogger, stringToUuid } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { TOKENS_QUERY, PACKAGE_QUERY } from "../constants";
import type { MemeCoin, TokensQuery } from "../types/chains";

import { getBurnAmount } from "../wallet";

import fs from "fs";

const __cookiesFilePath = "./cookies.json";

export class TwitterScraper {
  private scraper: Scraper;

  constructor(sc: Scraper) {
    this.scraper = sc;
  }

  /**
   * Get the scraper instance.
   * @returns {Scraper} The scraper instance.
   */
  public getScraper(): Scraper {
    return this.scraper;
  }

  /**
   * Get the user ID by screen name.
   * @param {string} screenName - The screen name of the user.
   * @returns {Promise<string>} The user ID.
   */
  public async getUserIdByScreenName(screenName: string): Promise<string> {
    return await this.scraper.getUserIdByScreenName(screenName);
  }

  /**
   * Save cookies to a file.
   * @returns {Promise<boolean>} True if cookies were saved successfully.
   */
  public async saveCookies(): Promise<boolean> {
    const cookiesFilePath = "./cookies.json";

    if (!fs.existsSync(cookiesFilePath)) {
      // Load cookies from file
      const cookies = await this.scraper.getCookies();
      fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies, null, 2));
    }
    return true;
  }

  /**
   * Like a tweet by ID.
   * @param {string} id - The ID of the tweet to like.
   * @returns {Promise<void>}
   */
  public async likeTweet(id: string): Promise<void> {
    if (!id) {
      elizaLogger.error("Tweet id not found");
      throw new Error("Tweet id not found");
    }
    return await this.scraper.likeTweet(id);
  }

  /**
   * Retweet a tweet by ID.
   * @param {string} id - The ID of the tweet to retweet.
   * @returns {Promise<void>}
   */
  public async retweet(id: string): Promise<void> {
    if (!id) {
      elizaLogger.error("Tweet id not found");
      throw new Error("Tweet id not found");
    }
    return await this.scraper.retweet(id);
  }

  /**
   * Send a tweet.
   * @param {string} message - The message to tweet.
   * @returns {Promise<Response>}
   */
  public async sendUserTweet(message: string): Promise<Response> {
    return await this.scraper.sendTweet(message);
  }

  /**
   * Reply to a tweet by ID.
   * @param {string} id - The ID of the tweet to reply to.
   * @param {string} message - The reply message.
   * @returns { Promise<Response>}
   */
  public async replyToTweet(id: string, message: string): Promise<Response> {
    if (!id) {
      elizaLogger.error("Tweet id not found");
      throw new Error("Tweet id not found");
    }
    return await this.scraper.sendQuoteTweet(message, id);
  }

  /**
   * Follow a user by user ID.
   * @param {string} userId - The ID of the user to follow.
   * @returns {Promise<void>}
   */
  public async followUser(userId: string): Promise<void> {
    return await this.scraper.followUser(userId);
  }

  /**
   * Quote a tweet by ID.
   * @param {string} id - The ID of the tweet to quote.
   * @param {string} message - The quote message.
   * @returns {Promise<Response>}
   */
  public async quoteTweet(id: string, message: string): Promise<Response> {
    if (!id) {
      elizaLogger.error("Tweet id not found");
      throw new Error("Tweet id not found");
    }
    return await this.scraper.sendTweet(message, id);
  }

  /**
   * Get the latest tweet of a user by username.
   * @param {string} username - The username of the user.
   * @returns { Promise<Tweet | null | void>} The latest tweet.
   */
  public async getUserLatestTweet(
    username: string,
  ): Promise<Tweet | null | void> {
    if (!username) {
      elizaLogger.error("Twitter username not configured in environment");
      throw new Error("Twitter username not configured in environment");
    }
    return await this.scraper.getLatestTweet(username);
  }

  /**
   * Get replies to a tweet.
   * @param {string} username - The username of the user.
   * @param {Tweet} tweet - The tweet to get replies for.
   * @returns {Promise<Tweet[]>} The replies to the tweet.
   */
  public async getTweetReplies(
    username: string,
    tweet: Tweet,
  ): Promise<Tweet[]> {
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

  /**
   * Fetch previous tweets of a user.
   * @param {string} username - The username of the user.
   * @param {Tweet} tweet - The current tweet.
   * @returns {Promise<string>} The previous tweets.
   */
  public async fetchPreviousTweets(
    username: string,
    tweet: Tweet,
  ): Promise<string> {
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
          `tweet_id: ${tweet.id}\ntweet_text: ${tweet.text}\ntime: ${tweet.timeParsed.toString()}`,
      )
      .join("\n\n");

    return prev;
  }

  /**
   * Get users from subgraph.
   * @param {string} url - The URL of the subgraph.
   * @param {string} username - The username to exclude from the results.
   * @returns {Promise<string[] | null>} The list of user handles.
   */
  async getUsersFromSubgraph(
    url: string,
    username: string,
  ): Promise<string[] | null> {
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

  /**
   * Get tweets from other users.
   * @param {IAgentRuntime} _runtime - The agent runtime environment.
   * @param {string[]} handles - The list of user handles.
   * @returns {Promise<string>} The tweets from other users.
   */
  public async getOtherUserTweets(
    _runtime: IAgentRuntime,
    handles: string[],
  ): Promise<string> {
    // query runtime Db for all messages with type as Interaction
    let tweets: Tweet[] = [];

    for (const handle of handles) {
      try {
        const tweet = await this.scraper.getLatestTweet(handle);
        if (tweet) {
          tweets.push(tweet);
        }
      } catch (error) {
        continue;
      }
    }

    if (tweets.length === 0) {
      elizaLogger.error("No tweets found for any of the handles");
    }

    // convert tweet ids to uuid
    let nonInteractedTweets: Tweet[] = [];
    for (const tweet of tweets) {
      const tweetUUID = stringToUuid(tweet.id);
      const memory = await _runtime.databaseAdapter.getMemoryById(tweetUUID);
      if (!memory) {
        nonInteractedTweets.push(tweet);
      }
    }

    if (nonInteractedTweets.length === 0) {
      elizaLogger.warn("Interacted with all user tweets, reinteracting");
      nonInteractedTweets = tweets;
    }

    // Parse the tweets using the provided logic
    const other_tweets = nonInteractedTweets
      .map(
        (tweet) =>
          `tweet_id: ${tweet.id}\ntweet_text: ${tweet.text}\nuser_id: ${tweet.userId}`,
      )
      .join("\n\n");

    return other_tweets;
  }

  /**
   * Get tokens from subgraph.
   * @param {string} url - The URL of the subgraph.
   * @param {string} rpc - The RPC endpoint.
   * @param {`0x${string}`} address - The address of the owner.
   * @param {`0x${string}`} safeAddress - The safe address.
   * @returns {Promise<MemeCoin[]>} The list of meme coins.
   */
  public async getTokens(
    url: string,
    rpc: string,
    address: `0x${string}`,
    safeAddress: `0x${string}`,
  ): Promise<MemeCoin[]> {
    elizaLogger.info("Getting tokens from Olas subgraph...");

    const data: TokensQuery = {
      query: TOKENS_QUERY,
    };

    // dump data to json and encode it
    const dataJson = JSON.stringify(data);

    try {
      elizaLogger.info("Getting tokens from subgraph");
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
        return [];
      }
      const responseData = await response.json();
      const items = responseData.data.memeTokens.items;

      const filteredItems = items.filter(
        (t: any) => t.chain === "base" && parseInt(t.memeNonce) > 0,
      );
      elizaLogger.log(filteredItems);

      const burnAmount = await getBurnAmount(address, rpc);
      const memeCoins: MemeCoin[] = filteredItems.map((item: any) => {
        const now = Math.floor(Date.now() / 1000);
        const secondsSinceSummon = now - item.summonTime;
        const secondsSinceUnleash = now - item.unleashTime;
        const isUnleashed = item.unleashTime !== 0;
        const isPurged = item.isPurged;
        const isHearted =
          item.hearters && item.hearters[safeAddress] !== undefined;
        const magaLaunched = item.memeNonce === "1" && item.unleashTime !== 0;

        const availableActions: string[] = [];

        // Heart
        if (!isUnleashed && item.memeNonce !== "1") {
          availableActions.push("heart");
        }

        // Unleash
        if (
          !isUnleashed &&
          secondsSinceSummon > 24 * 3600 &&
          item.memeNonce !== 1
        ) {
          availableActions.push("unleash");
        }

        // Collect
        if (isUnleashed && secondsSinceUnleash < 24 * 3600 && isHearted) {
          availableActions.push("collect");
        }

        // Purge
        if (isUnleashed && secondsSinceUnleash > 24 * 3600 && !isPurged) {
          availableActions.push("purge");
        }

        // Burn
        if (magaLaunched && burnAmount > 0) {
          availableActions.push("burn");
        }

        return {
          tokenName: item.name,
          tokenTicker: item.symbol,
          blockNumber: item.blockNumber,
          chain: item.chain,
          tokenAddress: item.memeToken,
          liquidity: item.liquidity,
          heartCount: item.heartCount,
          isUnleashed: item.isUnleashed,
          isPurged: item.isPurged,
          lpPairAddress: item.lpPairAddress,
          owner: item.owner,
          timestamp: item.timestamp,
          memeNonce: item.memeNonce,
          summonTime: item.summonTime,
          unleashTime: item.unleashTime,
          magaLaunched: magaLaunched,
          availableActions: availableActions,
        };
      });

      return memeCoins;
    } catch (error) {
      elizaLogger.error(`Error getting tokens from subgraph: ${error}`);
      throw new Error("Failed to get tokens from subgraph");
    }
  }
}

/**
 * Read cookies from the file system.
 * @returns {string[] | null} The list of cookie strings or null if no cookies found.
 */
function readCookies(): string[] | null {
  if (fs.existsSync(__cookiesFilePath)) {
    const cookies = JSON.parse(fs.readFileSync(__cookiesFilePath, "utf8"));
    const cookieStrings = cookies?.map(
      (cookie: any) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
          cookie.path
        }; ${cookie.secure ? "Secure" : ""}; ${
          cookie.httpOnly ? "HttpOnly" : ""
        }; SameSite=${cookie.sameSite || "Lax"}`,
    );
    return cookieStrings;
  }
  return null;
}

/**
 * Get the Twitter scraper instance.
 * @param {IAgentRuntime} runtime - The agent runtime environment.
 * @returns {Promise<Scraper | null>} The scraper instance or null if login failed.
 */
export async function getScrapper(
  runtime: IAgentRuntime,
): Promise<Scraper | null> {
  const username = runtime.getSetting("TWITTER_USERNAME") as string;
  const password = runtime.getSetting("TWITTER_PASSWORD") as string;
  const email = runtime.getSetting("TWITTER_EMAIL") as string;

  elizaLogger.info("Attempting Twitter login with username:", username, email);

  const ts = new Scraper();

  try {
    const cookieStrings = readCookies();
    if (cookieStrings) {
      elizaLogger.info("Attempting Twitter login using cookies");
      await ts.setCookies(cookieStrings);
      if (await ts.isLoggedIn()) {
        elizaLogger.success("Twitter login successful using cookies");
        return ts;
      }
    } else {
      throw new Error("No cookies found");
    }
    elizaLogger.warn("Attempting Twitter login without cookies");
  } catch (error) {
    elizaLogger.warn("Failed to set cookies, Performing Normal Login:", error);
    await ts.login(username, password, email);
    const cookies = await ts.getCookies();
    fs.writeFileSync(__cookiesFilePath, JSON.stringify(cookies, null, 2));
    if (await ts.isLoggedIn()) {
      elizaLogger.assert("Twitter login successful but without cookies");
      return ts;
    }
  }

  return null;
}
