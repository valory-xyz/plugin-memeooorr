import { elizaLogger, type Action } from "@elizaos/core";
import { fetchTweetReplies } from "../services/twitterService";

export const collectFeedbackAction: Action = {
  name: "COLLECT_FEEDBACK",
  description: "Collects feedback from replies to the latest tweet.",
  similes: ["FETCH_REPLIES", "COLLECT_TWITTER_FEEDBACK", "GATHER_FEEDBACK"],
  examples: [
    {
      input: { tweetId: "123456789" },
      output: { feedback: ["Great project!", "Needs improvement."] },
    },
  ],
  validate: async (runtime, memory) => {
    return !!memory.content?.tweetId;
  },
  handler: async (runtime, memory, state, params, callback) => {
    try {
      const tweetId = memory.content?.tweetId;
      if (!tweetId) {
        throw new Error("No tweet ID provided for feedback collection");
      }

      elizaLogger.log("Fetching feedback for tweet ID:", tweetId);

      const feedback = await fetchTweetReplies(tweetId);

      elizaLogger.log("Collected feedback:", feedback);

      // Callback with feedback data
      if (callback) {
        await callback({
          text: JSON.stringify({ success: true, feedback }),
          type: "feedback",
        });
      }

      return true;
    } catch (error) {
      elizaLogger.error("Failed to collect feedback:", error);
      return false;
    }
  },
};
