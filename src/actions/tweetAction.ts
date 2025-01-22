import { elizaLogger, type Action } from "@elizaos/core";
import { postTweet } from "../services/twitterService";

export const tweetAction: Action = {
  name: "TWEET_ACTION",
  description: "Posts a tweet to notify about the executed action.",
  similes: ["POST_TWEET", "NOTIFY", "TWEET"],
  examples: [
    {
      input: { content: "Action completed: MemeCoin hearted!" },
      output: { success: true },
    },
  ],
  validate: async (runtime, memory) => {
    return !!memory.content?.tweetContent;
  },
  handler: async (runtime, memory, state, params, callback) => {
    try {
      const tweetContent = memory.content?.tweetContent;
      if (!tweetContent) {
        throw new Error("No tweet content provided");
      }

      elizaLogger.log("Preparing to post tweet:", tweetContent);

      const result = await postTweet(tweetContent);

      elizaLogger.log("Tweet posted successfully:", result);

      // Callback with success message
      if (callback) {
        await callback({
          text: JSON.stringify({ success: true, tweetId: result.id }),
          type: "notification",
        });
      }

      return true;
    } catch (error) {
      elizaLogger.error("Failed to post tweet:", error);
      return false;
    }
  },
};
