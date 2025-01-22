import { elizaLogger, type Action } from "@elizaos/core";
import {
  fetchTweetReplies,
  likeTweet,
  postTweet,
} from "../services/twitterService";

export const engageTwitterAction: Action = {
  name: "ENGAGE_TWITTER",
  description:
    "Interacts with tweets by liking or replying based on sentiment analysis.",
  similes: ["LIKE", "REPLY", "ENGAGE"],
  examples: [],
  validate: async () => true,
  handler: async (runtime, memory, state, params, callback) => {
    try {
      const { tweetId, action, text } = params;

      if (!tweetId || !action) {
        throw new Error("Missing required parameters: tweetId or action");
      }

      let result: boolean | string = false;

      switch (action.toLowerCase()) {
        case "like":
          elizaLogger.log(`Attempting to like tweet with ID: ${tweetId}`);
          result = await likeTweet(tweetId);
          break;

        case "reply":
          if (!text) {
            throw new Error("Missing 'text' parameter for reply action");
          }
          elizaLogger.log(`Attempting to reply to tweet with ID: ${tweetId}`);
          result = await postTweet(text);
          break;

        case "fetch_replies":
          elizaLogger.log(`Fetching replies for tweet with ID: ${tweetId}`);
          result = await fetchTweetReplies(tweetId);
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      if (callback) {
        await callback({ text: JSON.stringify(result), type: "engagement" });
      }

      elizaLogger.log("Engagement action completed successfully:", result);
      return true;
    } catch (error) {
      elizaLogger.error("Error in engageTwitterAction:", error);
      return false;
    }
  },
};
