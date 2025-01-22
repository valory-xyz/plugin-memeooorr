import {
  Action,
  elizaLogger,
  generateText,
  parseJSONObjectFromText,
  ModelClass,
} from "@elizaos/core";

export const analyzeFeedbackAction: Action = {
  name: "ANALYZE_FEEDBACK",
  description: "Analyze feedback on a tweet and decide the next steps.",
  similes: ["ANALYZE_TWEET_FEEDBACK", "TWEET_FEEDBACK", "EVALUATE_TWEET"],
  examples: [[{ text: "Analyze feedback on the tweet with ID 12345." }]],
  validate: async (runtime, message) => {
    // Ensure tweet ID is provided
    return !!message?.content?.text?.match(/\d+/);
  },
  handler: async (runtime, message, state, params, callback) => {
    try {
      const tweetId = message.content.text.match(/\d+/)?.[0];
      if (!tweetId) throw new Error("Invalid or missing tweet ID.");

      const twitterService = runtime.getService("TwitterService");
      const feedback = await twitterService.analyzeFeedback(tweetId);

      const prompt = `Analyze the following feedback and decide on the next steps:\n\n${JSON.stringify(feedback, null, 2)}\n\nRespond with a JSON object with this structure:
{
  "action": "like" | "retweet" | "reply" | "ignore",
  "reason": string,
  "response": string (if reply is the action)
}`;

      const analysis = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.MEDIUM,
      });

      const decision = parseJSONObjectFromText(analysis);

      callback?.(
        {
          text: JSON.stringify(decision, null, 2),
          type: "analysis",
        },
        [],
      );
      return true;
    } catch (error) {
      elizaLogger.error(`Error analyzing feedback: ${error.message}`);
      callback?.(
        {
          text: `Failed to analyze feedback: ${error.message}`,
          type: "error",
        },
        [],
      );
      return false;
    }
  },
};
