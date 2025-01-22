import { Action, elizaLogger, generateText, ModelClass } from "@elizaos/core";

export const generateTweetAction: Action = {
  name: "GENERATE_TWEET",
  description: "Generate a tweet based on the given context.",
  similes: ["CREATE_TWEET", "WRITE_TWEET", "GENERATE_TWEET"],
  examples: [
    [{ text: "Generate a tweet about renewable energy benefits." }],
    [{ text: "Write a tweet promoting our new product launch." }],
  ],
  validate: async (runtime, message) => {
    // Ensure message content exists
    return !!message?.content?.text;
  },
  handler: async (runtime, message, state, params, callback) => {
    try {
      const prompt = `Write a concise and engaging tweet:\n\n${message.content.text}`;

      const tweet = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.SMALL,
      });

      if (!tweet) {
        throw new Error("No tweet generated.");
      }

      elizaLogger.log(`Generated tweet: ${tweet}`);

      callback?.(
        {
          text: tweet,
          type: "success",
        },
        [],
      );
      return true;
    } catch (error) {
      elizaLogger.error(`Error generating tweet: ${error.message}`);
      callback?.(
        {
          text: `Failed to generate tweet: ${error.message}`,
          type: "error",
        },
        [],
      );
      return false;
    }
  },
};
