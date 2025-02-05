import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
} from "@elizaos/core";
import { TwitterScraper } from "../utils/twitterScrapper";

export interface TwitterInteractionResponse {
  persona: string;
  prevTweets: string;
  otherTweets: string;
}

const tweetProvider: Provider = {
  // eslint-disable-next-line
  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
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

    elizaLogger.debug("Fetch previous Tweets from user");
    const previousTweets = await scraper.fetchPreviousTweets(tweet);
    if (!previousTweets) {
      elizaLogger.error("Failed to fetch previous tweets");
      return false;
    }

    elizaLogger.debug("Fetch other tweets from user");
    const otherTweets = await scraper.getOtherUserTweets();

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
    const scraper = new TwitterScraper();
    try {
      elizaLogger.info("Attempting Twitter login");
      await scraper.login();
      elizaLogger.info("Twitter login successful");
    } catch (error) {
      elizaLogger.error("Twitter login failed:", error);
      throw new Error("Failed to login to Twitter");
    }

    if (!(await scraper.getScraper().isLoggedIn())) {
      elizaLogger.error("Failed to login to Twitter");
      return false;
    }

    if (message.content.action === "tweet") {
      elizaLogger.info("posting a new tweet");
      await scraper.sendUserTweet(message.content.text);
      elizaLogger.info("Tweet posted successfully");
      return true;
    } else if (message.content.action === "like") {
      elizaLogger.info("Liking a tweet");
      await scraper.likeTweet(message.content.source);
      elizaLogger.info("Tweet liked successfully");
      return true;
    } else if (message.content.action === "retweet") {
      elizaLogger.info("Retweeting a tweet");
      await scraper.retweet(message.content.source);
      elizaLogger.info("Tweet retweeted successfully");
      return true;
    } else if (message.content.action === "reply") {
      elizaLogger.info("Replying to a tweet");
      await scraper.replyToTweet(message.content.source, message.content.text);
      elizaLogger.info("Tweet replied successfully");
      return true;
    } else if (message.content.action === "quote") {
      elizaLogger.info("Quoting a tweet");
      await scraper.quoteTweet(message.content.source, message.content.text);
      elizaLogger.info("Tweet quoted successfully");
      return true;
    } else if (message.content.action === "follow") {
      elizaLogger.info("Following a user");
      await scraper.followUser(message.content.source);
      elizaLogger.info("User followed successfully");
      return true;
    } else {
      elizaLogger.info("Invalid action");
      return false;
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

export { tweetProvider, twitterProvider };
