import type { Action, Provider, IAgentRuntime, Memory } from "@elizaos/core";
import {
  ModelClass,
  elizaLogger,
  generateObject,
  stringToUuid,
} from "@elizaos/core";

import { TokenInteractionSchema } from "../types/content";
import { Decision } from "../utils/twittter";
import {
  convertToDecision,
  formatMemeCoins,
  formatTweetResponses,
} from "../utils/twittter";
import { TOKEN_INTERACTION_CONFIG } from "../config";
import { TokenInteractionResponse } from "../providers";

const actions = TOKEN_INTERACTION_CONFIG.ACTIONS;
const ticker = TOKEN_INTERACTION_CONFIG.TICKER;

export const decideTokenAction = (
  tokenProvider: Provider,
  safeAccountProvider: Provider,
): Action => {
  return {
    name: "DECIDE_TOKEN_ACTION",
    description:
      "Analyze the current market and make decisions regarding meme coins.",
    similes: [
      "TOKEN_ACTION",
      "DECIDE_ACTION",
      "MEME_ACTION",
      "MAXIMIZE_PORTFOLIO",
    ],
    examples: [],
    validate: async () => true,
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state,
      _params,
      callback,
    ) => {
      try {
        if (!state) {
          state = await runtime.composeState(message);
        } else {
          state = await runtime.updateRecentMessageState(state);
        }

        const metadata: TokenInteractionResponse | false =
          await tokenProvider.get(runtime, message, state);
        if (!metadata) {
          const token_action_fail_message: Memory = {
            id: stringToUuid(Date.now().toString()),
            content: {
              text: "Token Action Failed",
              action: "NO ACTION",
            },
            roomId: message.roomId,
            userId: message.userId,
            agentId: runtime.agentId,
          };

          await runtime.databaseAdapter.createMemory(
            token_action_fail_message,
            "TOKEN_ACTION_FAILED",
          );
          return false;
        }

        elizaLogger.log("Avaialbale Memecoins");
        let formated_memes = "";
        if (metadata.memeCoins.length > 0) {
          formated_memes = formatMemeCoins(metadata.memeCoins);
        }
        elizaLogger.log(formated_memes);

        let tweet_responses = "";

        if (metadata.replies.length > 0) {
          tweet_responses = formatTweetResponses(metadata.replies);
        }

        const TOKEN_DECISION_PROMPT = `
You are a cryptocurrency and token expert with a specific persona. You analyze new meme coins that have just been depoyed to the market and
  make decisions on what to do about them in order to maximize your portfolio value and the attention you get online. Sometimes, you also deploy your own memecoins.
  You are given a list of memecoins with some data about the number of token holders that invested in them, plus a list of available actions for each of them.
  You are very active on Twitter and one of your goals is to deploy your own memecoin based on your persona once you have enough engagement.

  The token life cycle goes like this:
  1. 🪄 Summon a Meme
  Any agent (msg.sender) can summon a meme by contributing at least 0.01 ETH.
  This action creates the meme and starts a 24-hour timer for the next actions.
  2. ❤️ Heart the Meme (for a minimum of 24 hours after summoning and before unleashing)
  Any agent can "heart" the meme by contributing a non-zero ETH value.
  This contribution is recorded, and the agent becomes a "hearter," with their contribution logged for token allocation later.
  3, 🚀 Unleash the Meme (from 24 hours after summoning)
  Any agent can unleash the meme.
  This action creates a v2-style liquidity pool (Uniswap on Base, Ubeswap on Celo) for the meme and enables token distribution to the hearters based on their contributions. LP tokens are forever held by the ownerless factory.
  4. 🎁 Collect Meme Tokens (after unleashing and before 48h since summoning)
  Any hearter can collect their share of the meme tokens in proportion to their contribution.
  5. 🔥 Purge Uncollected Tokens (after 48 hours since summoning)
  Any agent can purge uncollected meme tokens.
  If a hearter has not collected their tokens, their allocation is burned.

  The complete list of token actions is:

  * summon: create a new token based on your persona
  * heart: contribute funds to the token, to later be able to collect the token
  * unleash: activate the inactive token, and collect the token if you hearted before
  * collect: collect your token if you have previously contributed
  * purge: burn all uncollected tokens
  * burn: execute collateral burn

  Your task is to make a decision on what should be the next action to be executed to maximize your portfolio value.
  Take into account the engagement you're getting on twitter and also the existing token's popularity.
  Whenever hearting is in the list of available actions, try to heart a token from time to time.

  You have three options:
  * Do nothing
  * Deploy your own token if the engagement is good enough or if the number of meme coins in the market is low (under 30)
  * Execute one action from the available actions for one of the already existing tokens

  Here's the list of existing  memecoins:
  "${formated_memes}"

  Here's your latest tweet:
  "${metadata.tweet}"

  Here's a list of tweets that you received as a response to your latest tweet and some engagement metrics.
  "${tweet_responses}"

  You can use these tweets as feedback in order to update your persona if you think that will improve engagement.

  You have ${metadata.balance} ETH currently available, so stick to that budget.
  Every now and then you will need to make more decisions using the same budget, so it might be wise not to spend eveything on a single action.
  Whenever hearting is in the list of available actions, try to heart a token from time to time.

  ### Steps:
  • Examine the input variables: formatted list of memecoins ("formated_memes"), latest tweet metadata ("metadata.tweet"), tweet responses ("tweet_responses"), and available ETH balance ("metadata.balance").
  • Analyze the token life cycle and actions: summon must create a new memecoin if token address is empty, while heart, unleash, collect, purge, and burn require that the action be available for the selected token and the related token details (Token Name, Address, Nonce, Ticker) are provided.
  • Assess if engagement is strong enough or if the market has under 30 memecoins to deploy your own (summon action). Otherwise, review each existing memecoin to determine if any available actions (with "heart" having extra recommendation) can maximize value.
  • Consider your ETH balance so you do not overspend; preserve funds for future decisions.
  • Update your persona if warranted by the tweet feedback to improve engagement.
  • Produce your final answer only as a JSON object with the following fields: "action", "tokenAddress", "tokenName", "tokenTicker", "tokenNonce", "tokenSupply", "amount", "tweet", and "newPersona". Use an empty string for fields that do not apply.

  ### NOTE:
  - if the list of existing memecoins that can be interacted with is empty, you must summon a new memecoin.

  ### OUTPUT_FORMAT
  * Your output response must be only a single JSON object to be parsed by Python's "json.loads()".
  * The JSON must contain five fields: "action", "token_address", "token_nonce", "amount" and "tweet".
      - "action": string; one of "summon", "heart", "unleash", "collect", "purge", "burn", or "none" (for doing nothing).
      - "tokenAddress": string; token address if interacting with an existing token or an empty string if summoning.
      - "tokenNonce": string; the token nonce if interacting with an existing token, or an empty string if summoning.
      - "tokenName": string; the new token’s name if deploying via summon, or else the token’s name if interacting with an existing token.
      - "tokenTicker": string; the new token’s ticker if deploying via summon, or the existing token’s ticker.
      - "tokenSupply": string; the ERC-20 token supply in wei units. Empty if no token is going to be deployed. Token supply must be at least 1 million * 10**18 and at most the maximum number of uint256.
      - "amount": string; the amount (in wei units of ${ticker}) to heart (invest) if the action is heart, or 0 otherwise
      - "tweet": string; a short tweet (max 280 characters, no hashtags) announcing the action.
      - "newPersona": string; an updated persona if you decide to update it, or null if not

  ### EXAMPLES:

  -- Example Summon Action (Deploy your own token) -- { "action": "summon", "tokenAddress": "", "tokenName": "DogeKing", "tokenTicker": "DKG", "tokenNonce": "", "tokenSupply": "1000000000000000000000000", "amount": "0", "tweet": "Excited to launch DogeKing! A bold new memecoin for the brave. Join me on this journey to redefine our crypto future!", "newPersona": "The DogeKing, a visionary crypto disruptor always ready for the next big leap." }

  -- Example Heart Action (Interacting with an existing token) -- { "action": "heart", "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678", "tokenName": "ShibaInu", "tokenTicker": "SHIB", "tokenNonce": "5", "tokenSupply": "", "amount": "2000000000000000", "tweet": "Just hearted ShibaInu! Excited about its potential and loving the vibrant community around it.", "newPersona": "" }
  `;

        // Generate the LLM response
        const schemaDescript = `
  {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "description": "The action to be taken. Possible values are summon, heart, unleash, collect, purge, burn, or none."
        "required": true
      },
      "tokenAddress": {
        "type": "string",
        "description": "The address of the token to interact with. Empty string if the decided action is summon.",
        "required": true
      },
      "tokenName": {
        "type": "string",
        "description": "The name of the new token if the action is summon otherwise the name of the existing token to interact with. If the action is summon, this field is required.",
        "required": true
      },
      "tokenTicker": {
        "type": "string",
        "description": "the new token’s ticker if deploying via summon, or the existing token’s ticker decided to interact with.",
        "required": true
      },
      "tokenNonce": {
        "type": "string",
        "description": "The nonce of the token to interact with. Empty if no token is going to be interacted with.",
        "required": true
      },
      "tokenSupply": {
        "type": "string",
        "description": "The ERC-20 token supply in wei units if the action is summon. Empty if no token is going to be deployed.",
        "required": true
      },
      "amount": {
        "type": "string",
        "description": "The amount (in wei units of ${ticker}) to heart (invest) if the action is deploy or heart, or 0 otherwise.",
        "required": true
      },
      "tweet": {
        "type": "string",
        "description": "A short tweet to announce the action taken, or empty if none. Please do not include any hashtags on the tweet. Remember that tweets can't be longer than 280 characters.",
        "required": true
      },
      "new_persona": {
        "type": "string",
        "description": "Your updated persona if you decide to update it, or empty if you don't.",
        "required": false
      }
    }
  }
  `;
        elizaLogger.success(TOKEN_DECISION_PROMPT);
        const content = await generateObject({
          runtime,
          context: TOKEN_DECISION_PROMPT,
          modelClass: ModelClass.LARGE,
          schema: TokenInteractionSchema,
          schemaDescription: schemaDescript,
        });

        const supportedActions: (typeof actions)[number][] = [...actions];

        const mappedCon = content.object as {
          action: (typeof supportedActions)[number];
          tokenAddress: string;
          tokenName: string | null;
          tokenTicker: string | null;
          tokenNonce: string;
          tokenSupply: string | null;
          amount: string;
          tweet: string;
          new_persona: string | null;
        };

        elizaLogger.log(mappedCon);
        const decision: Decision = convertToDecision(mappedCon);
        elizaLogger.log("Token decision:", decision);

        // check if given decision is present for the token
        // Check if the given decision is present for the token
        if (decision.action !== "summon") {
          const token = metadata.memeCoins.find(
            (meme) => meme.tokenAddress === decision.tokenAddress,
          );

          if (!token) {
            elizaLogger.error(
              `Token with address ${decision.tokenAddress} not found`,
            );
            return false;
          }

          if (!token.availableActions.includes(decision.action)) {
            elizaLogger.error(
              `Action ${decision.action} is not available for token ${decision.tokenAddress}`,
            );
            return false;
          }

          if (
            decision.tokenName &&
            !metadata.memeCoins.some(
              (meme) => meme.tokenName === decision.tokenName,
            )
          ) {
            elizaLogger.error(
              `Token name ${decision.tokenName} is not present in the list of meme coins`,
            );
            return false;
          }
        }

        const tokenDecisionMemory: Memory = {
          id: stringToUuid(Date.now().toString()),
          content: {
            text: JSON.stringify(mappedCon),
            action: decision.action,
            source: "token_decision",
          },
          roomId: message.roomId,
          userId: message.userId,
          agentId: runtime.agentId,
        };

        await runtime.messageManager.createMemory(tokenDecisionMemory);

        const exectutionMemory: Memory = {
          id: stringToUuid(Date.now().toString()),
          content: {
            text: "Exectuting action decided by the agent",
            action: decision.action,
          },
          roomId: message.roomId,
          userId: message.userId,
          agentId: runtime.agentId,
        };

        await runtime.messageManager.createMemory(exectutionMemory);

        await safeAccountProvider.get(runtime, tokenDecisionMemory);

        // Execute the callback to communicate the result
        if (callback) {
          await callback({
            text: JSON.stringify(decision),
            type: "token_decision",
          });
        }

        return true;
      } catch (error) {
        elizaLogger.error("Failed to decide on token action:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        return false;
      }
    },
  };
};
