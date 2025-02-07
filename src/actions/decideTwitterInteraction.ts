import { elizaLogger, generateObject, ModelClass } from "@elizaos/core";
import type {
  State,
  HandlerCallback,
  Action,
  IAgentRuntime,
  Memory,
  Provider,
} from "@elizaos/core";
import type { TwitterInteractionResponse } from "../providers/twitterProvider.ts";
import { TwitterInteractionSchema } from "../types/content.ts";
import { mev } from "viem/chains";

/**
 * Action to decide on Twitter interactions (e.g., tweet, reply, like, retweet) based on persona and available tweets.
 * @param tweetProvider The provider to fetch tweets and persona information.
 * @returns The action to decide on Twitter interactions.
 */
export const decideTwitterInteractionAction = (
  tweetProvider: Provider,
  twitterProvider: Provider,
): Action => {
  return {
    name: "DECIDE_TWITTER_INTERACTION",
    description:
      "Decide on Twitter interactions (e.g., tweet, reply, like, retweet) based on persona and available tweets.",
    similes: ["DECIDE_INTERACTION", "TWITTER_ACTION", "SOCIAL_DECISION"],
    examples: [],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
      // Check if the response message is in the correct format
      return true;
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State | undefined,
      options,
      callback,
    ) => {
      try {
        let currentState: State;
        if (!state) {
          currentState = (await runtime.composeState(message)) as State;
        } else {
          currentState = await runtime.updateRecentMessageState(state);
        }

        elizaLogger.log("Fetching Twitter metadata");

        const metadata: TwitterInteractionResponse | false = await tweetProvider.get(
          runtime,
          message,
        );

        if (!metadata) {
          return false;
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
        "${metadata.persona}"

        Here are some of your previous tweets:
        ${metadata.prevTweets}

        Here are some tweets from other users:
        ${metadata.otherTweets}

        Your task is to decide what actions to do, if any. Some recommendations:
        - If you decide to tweet, make sure it is significantly different from previous tweets in both topic and wording.
        - If you decide to reply or quote, make sure it is relevant to the tweet you are replying to.
        - We encourage you to interact with other users to increase your engagement.
        - Pay attention to the time of creation of your previous tweets. You should not create new tweets too frequently. The time now is ${new Date().toISOString()}.

        OUTPUT_FORMAT
        * Your output response must be only a single JSON list to be parsed by Python's "json.loads()".
        * The JSON must contain a list with the actions you want to take. Each entry in that list is a dict that needs to define:
            - action: a string with one of the following values: none, tweet, like, retweet, reply, quote or follow. Use none when you don't want to do anything.
            - tweet_id: the id of the tweet you are interacting with, if any.
            - text: a string. If the selected action is tweet, reply or quote, this field must contain the text of the reply or quote. If the action is like, retweet or follow, this field must be empty. Please do not include any hashtags on the tweet. Remember that tweets can't be longer than 280 characters.
      `;

        elizaLogger.log("Generating Response");

        // Generate the decision using LLM
        const response = await generateObject({
          runtime,
          context: prompt,
          modelClass: ModelClass.LARGE,
          schema: TwitterInteractionSchema,
          schemaName: "TwitterInteractionSchema",
          schemaDescription: "Schema for Twitter interaction decisions, including actions and tweet IDs.",
          mode: "json",
        });

        const actions = [
          "tweet",
          "like",
          "retweet",
          "reply",
          "quote",
          "follow",
        ];

        const supportedActions: ((typeof actions)[number] | null)[] = [
          ...actions,
          null,
        ];

        // Parse the response as JSON
        const decisions = response.object as {
          action: (typeof supportedActions)[number];
          tweet_id: string;
          text: string;
        };

        if (!decisions) {
          throw new Error("Failed to parse the LLM response.");
        }

        elizaLogger.log(`Twitter interaction decisions:`, decisions);
        let finalAction: string | null = decisions.action;
        if (!finalAction) {
          finalAction = "none";
        }

        const tweetActionMemory: Memory = {
          id: message.id,
          content: {
            text: decisions.text,
            action: finalAction,
            source: decisions.tweet_id,
          },
          roomId: message.roomId,
          userId: message.userId,
          agentId: runtime.agentId,
        };

        await runtime.messageManager.createMemory(tweetActionMemory);

        twitterProvider.get(runtime, tweetActionMemory);

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
};
