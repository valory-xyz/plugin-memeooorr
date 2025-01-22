import {
  Action,
  elizaLogger,
  generateText,
  ModelClass,
  parseJSONObjectFromText,
} from "@elizaos/core";

export const decideTwitterInteractionAction: Action = {
  name: "DECIDE_TWITTER_INTERACTION",
  description:
    "Decide on Twitter interactions (e.g., tweet, reply, like, retweet) based on persona and available tweets.",
  similes: ["DECIDE_INTERACTION", "TWITTER_ACTION", "SOCIAL_DECISION"],
  examples: [
    [
      {
        text: "Analyze tweets and decide what actions to take for persona 'TechGuru'.",
      },
    ],
  ],
  validate: async (runtime, message) => {
    return !!message?.content?.persona;
  },
  handler: async (runtime, message, state, params, callback) => {
    try {
      const { persona, previousTweets, otherTweets, time } = message.content;

      // Ensure all required parameters are present
      if (!persona || !time || !previousTweets || !otherTweets) {
        throw new Error(
          "Missing required parameters: persona, previousTweets, otherTweets, or time.",
        );
      }

      // Construct the decision-making prompt
      const prompt = `
        You are a user on Twitter with a specific persona. You create tweets and also analyze tweets from other users and decide whether to interact with them or not.
        You need to decide whether to create your own tweet or to interact with other users. The available actions are:

        - Tweet
        - Reply
        - Quote
        - Like
        - Retweet
        - Follow

        Here's your persona:
        "${persona}"

        Here are some of your previous tweets:
        ${previousTweets}

        Here are some tweets from other users:
        ${otherTweets}

        Your task is to decide what actions to do, if any. Some recommendations:
        - If you decide to tweet, make sure it is significantly different from previous tweets in both topic and wording.
        - If you decide to reply or quote, make sure it is relevant to the tweet you are replying to.
        - We encourage you to interact with other users to increase your engagement.
        - Pay attention to the time of creation of your previous tweets. You should not create new tweets too frequently. The time now is ${time}.

        OUTPUT_FORMAT
        * Your output response must be only a single JSON list to be parsed by Python's "json.loads()".
        * The JSON must contain a list with the actions you want to take. Each entry in that list is a dict that needs to define:
            - action: a string with one of the following values: none, tweet, like, retweet, reply, quote or follow. Use none when you don't want to do anything.
            - tweet_id: the id of the tweet you are interacting with, if any.
            - text: a string. If the selected action is tweet, reply or quote, this field must contain the text of the reply or quote. If the action is like, retweet or follow, this field must be empty. Please do not include any hashtags on the tweet. Remember that tweets can't be longer than 280 characters.
      `;

      // Generate the decision using LLM
      const response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.MEDIUM,
      });

      // Parse the response as JSON
      const decisions = parseJSONObjectFromText(response);

      if (!decisions || !Array.isArray(decisions)) {
        throw new Error("Failed to parse the LLM response.");
      }

      elizaLogger.log(`Twitter interaction decisions:`, decisions);

      callback?.(
        {
          text: JSON.stringify(decisions, null, 2),
          type: "success",
        },
        [],
      );

      return true;
    } catch (error) {
      elizaLogger.error(
        `Error deciding Twitter interactions: ${error.message}`,
      );
      callback?.(
        {
          text: `Failed to decide interactions: ${error.message}`,
          type: "error",
        },
        [],
      );
      return false;
    }
  },
};
