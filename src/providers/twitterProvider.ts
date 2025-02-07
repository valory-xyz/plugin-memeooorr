import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
} from "@elizaos/core";
import { TwitterScraper, getScrapper } from "../utils/twitterScrapper.ts";
import { Scraper, } from "agent-twitter-client";
import fs from "fs";
import { runMain } from "module";
import { ACTIONS } from "../config.ts";

export interface TwitterInteractionResponse {
  persona: string;
  prevTweets: string;
  otherTweets: string;
}

const tweetProvider: Provider = {
  // eslint-disable-next-line
  get: async (runtime: IAgentRuntime, message: Memory, _state?: State):Promise<TwitterInteractionResponse | Boolean> => {
    if (message.content.action!=ACTIONS.START) {
      return false;
    }
    const username = runtime.getSetting("TWITTER_USERNAME");

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
    elizaLogger.log("Latest Fetched Tweet From User:", tweet);

    elizaLogger.log("Fetch previous Tweets from user");
    const previousTweets = await scraper.fetchPreviousTweets(tweet);
    if (!previousTweets) {
      elizaLogger.error("Failed to fetch previous tweets");
      return false;
    }
    elizaLogger.log("Previous Tweets fetched successfully!", previousTweets);

    elizaLogger.log("Fetch other tweets from user");
    let otherTweets: string = "";
    let handles: string[] = [];
    try {
      const subUrl = runtime.getSetting("SUBGRAPH_URL");
      elizaLogger.log("Subgraph URL:", subUrl);
      try {
        handles = await scraper.getUsersFromSubgraph(subUrl, username);
      } catch (error) {
        elizaLogger.error("Failed to get users from subgraph:", error);
        return false;
      }

      for (const handle of handles) {
        elizaLogger.log("Handle:", handle);
      }

      // if handles not empty, get other tweets
      otherTweets = await scraper.getOtherUserTweets(runtime, handles);
      if (!otherTweets) {
        elizaLogger.error("Failed to fetch other tweets");
      }
      elizaLogger.log("Other Tweets fetched successfully!", otherTweets);
    } catch (error) {
      elizaLogger.error("Failed to fetch other tweets:", error);
      throw new Error("Failed to fetch other tweets", error);
    }



    let persona = runtime.character.bio;

    // check if persona is a list of strings then convert to string
    if (Array.isArray(persona)) {
      persona = persona.join(" ");
    }

    try {
      const result: TwitterInteractionResponse = {
        persona: persona,
        prevTweets: previousTweets,
        otherTweets: otherTweets,
      };
      elizaLogger.debug("Tweet retrieved successfully");
      return result;
    } catch (error) {
      elizaLogger.error("Failed to fetch tweet:", error);
      return false;
    }
  },
};

const twitterProvider: Provider = {
  // eslint-disable-next-line
  get: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {

    const actions = [
      "tweet",
      "like",
      "retweet",
      "reply",
      "quote",
      "follow",
    ];

    // If the message content does not contain an action that is in actions list, return false
    if (!message.content.action || !actions.includes(message.content.action)) {
      return false;
    }

    const ts: Scraper | null = await getScrapper(runtime);
    if (!ts) {
      elizaLogger.error("Failed to get scraper");
      return false;
    }

    const scraper = new TwitterScraper(ts);

    if (message.content.action === "tweet") {
      elizaLogger.log("posting a new tweet");
      await scraper.sendUserTweet(message.content.text);
      elizaLogger.success("Tweet posted successfully");
      return true;
    } else if (message.content.action === "like") {
      elizaLogger.log("Liking a tweet");
      await scraper.likeTweet(message.content.source);
      elizaLogger.success("Tweet liked successfully");
      return true;
    } else if (message.content.action === "retweet") {
      elizaLogger.log("Retweeting a tweet");
      await scraper.retweet(message.content.source);
      elizaLogger.success("Tweet retweeted successfully");
      return true;
    } else if (message.content.action === "reply") {
      elizaLogger.log("Replying to a tweet");
      await scraper.replyToTweet(message.content.source, message.content.text);
      elizaLogger.success("Tweet replied successfully");
      return true;
    } else if (message.content.action === "quote") {
      elizaLogger.log("Quoting a tweet");
      await scraper.quoteTweet(message.content.source, message.content.text);
      elizaLogger.success("Tweet quoted successfully");
      return true;
    } else if (message.content.action === "follow") {
      elizaLogger.log("Following a user");
      await scraper.followUser(message.content.source);
      elizaLogger.success("User followed successfully");
      return true;
    } else {
      elizaLogger.info("Invalid action");
      return false;
    }
  },
};

export { tweetProvider, twitterProvider };
