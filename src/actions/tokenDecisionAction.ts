import {
  type Action,
  type Provider,
  elizaLogger,
  generateObject,
  IAgentRuntime,
  Memory,
  ModelClass,
  parseJSONObjectFromText,
} from "@elizaos/core";

import { type Chain, type Client, type Transport } from "viem";

import { Address, Hex, encodeFunctionData } from "viem";
import { TokenInteractionSchema } from "../types/content";
import { memeFactoryAbi } from "../abi/memefactory";
import { SmartAccountClient } from "permissionless";
import { SmartAccount } from "viem/account-abstraction";

type MemeSafeClient = SmartAccountClient<
  Transport,
  Chain,
  SmartAccount,
  Client,
  undefined
>;

export const decideTokenAction = (
  tokenProvider: Provider,
  walletProvider: Provider,
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
      params,
      callback,
    ) => {
      try {
        if (!state) {
          state = await runtime.composeState(message);
        } else {
          state = await runtime.updateRecentMessageState(state);
        }

        const metadata = await tokenProvider.get(runtime, message, state);

        const TOKEN_DECISION_PROMPT = `
              You are a cryptocurrency and token expert with a specific persona. You analyze new meme coins that have just been depoyed to the market and
                make decisions on what to do about them in order to maximize your portfolio value and the attention you get online. Sometimes, you also deploy your own memecoins.
                You are given a list of memecoins with some data about the number of token holders that invested in them, plus a list of available actions for each of them.
                You are very active on Twitter and one of your goals is to deploy your own memecoin based on your persona once you have enough engagement.

                The token life cycle goes like this:
                1. 🪄 Summon a Meme
                Any agent (msg.sender) can summon a meme by contributing at least 0.01 ETH / 10 CELO.
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
                "${metadata.meme_coins}"

                Here's your latest tweet:
                "${metadata.latest_tweet}"

                Here's a list of tweets that you received as a response to your latest tweet and some engagement metrics.
                "${metadata.tweet_responses}"

                You can use these tweets as feedback in order to update your persona if you think that will improve engagement.

                You have {balance} ETH currently available, so stick to that budget.
                Every now and then you will need to make more decisions using the same budget, so it might be wise not to spend eveything on a single action.
                Whenever hearting is in the list of available actions, try to heart a token from time to time.

                OUTPUT_FORMAT
                * Your output response must be only a single JSON object to be parsed by Python's "json.loads()".
                * The JSON must contain five fields: "action", "token_address", "token_nonce", "amount" and "tweet".
                    - action: a string with the action you have decided to take. none means do nothing.
                    - token_address: a string with the token address of the meme coin you decided to interact with, or empty if none
                    - token_nonce: a string with the token nonce of the meme coin you decided to interact with, or empty if none
                    - token_name: a new name for the new token if the action is deploy. Empty if no token is going to be deployed.
                    - token_ticker: a new ticker for the new token. Empty if no token is going to be deployed.
                    - token_supply: the ERC-20 token supply in wei units. Empty if no token is going to be deployed. Token supply must be at least 1 million * 10**18 and at most the maximum number of uint256.
                    - amount: the amount (in wei units of {ticker}) to heart (invest) if the action is deploy or heart, or 0 otherwise
                    - tweet: a short tweet to announce the action taken, or empty if none. Please do not include any hastags on the tweet. Remember that tweets can't be longer than 280 characters.
                    - new_persona: a string with your updated persona if you decide to update it, or empty if you don't.
                `;

        // Generate the LLM response
        const content = await generateObject({
          runtime,
          context: TOKEN_DECISION_PROMPT,
          modelClass: ModelClass.LARGE,
          schema: TokenInteractionSchema,
        });

        const actions = [
          "summon",
          "heart",
          "unleash",
          "collect",
          "purge",
          "burn",
        ];

        const supportedActions: (typeof actions)[number][] = [...actions];

        const decision = content.object as {
          action: (typeof supportedActions)[number];
          tokenAddress: string;
          tokenNonce: bigint;
          tokenName: string | null;
          tokenTicker: string | null;
          tokenSupply: bigint | null;
          amount: string;
          tweet: string;
          new_persona: string | null;
        };

        const tokenDecisionMemory: Memory = {
          id: message.id,
          content: {
            text: JSON.stringify(decision),
            action: decision.action,
          },
          roomId: message.roomId,
          userId: message.userId,
          agentId: runtime.agentId,
        };

        await runtime.messageManager.createMemory(tokenDecisionMemory);

        const safeAccountClient: MemeSafeClient = walletProvider.get(
          runtime,
          tokenDecisionMemory,
        );
        let data: Hex | undefined = undefined;

        if (decision.action === "summon") {
          data = encodeFunctionData({
            abi: memeFactoryAbi,
            functionName: "summonThisMeme",
            args: [
              decision.tokenName,
              decision.tokenTicker,
              decision.tokenSupply,
            ],
          });
        } else if (decision.action === "heart") {
          data = encodeFunctionData({
            abi: memeFactoryAbi,
            functionName: "heartThisMeme",
            args: [decision.tokenNonce],
          });
        } else if (decision.action === "unleash") {
          data = encodeFunctionData({
            abi: memeFactoryAbi,
            functionName: "unleashThisMeme",
            args: [decision.tokenNonce],
          });
        } else if (decision.action === "collect") {
          data = encodeFunctionData({
            abi: memeFactoryAbi,
            functionName: "collectThisMeme",
            args: [decision.tokenAddress],
          });
        } else if (decision.action === "purge") {
          data = encodeFunctionData({
            abi: memeFactoryAbi,
            functionName: "purgeThisMeme",
            args: [decision.tokenAddress],
          });
        } else if (decision.action === "burn") {
          data = encodeFunctionData({
            abi: memeFactoryAbi,
            functionName: "scheduleForAscendance",
            args: [],
          });
        } else {
          elizaLogger.error("Invalid token action decision:", decision);
          throw new Error("Invalid token action decision");
        }

        // Perform the action
        const hash = await safeAccountClient.sendTransaction({
          to: runtime.getSetting("MEME_FACTORY_ADDRESS") as Address,
          data: data as Hex,
          value: 0n,
        });

        const transactionMemory: Memory = {
          id: message.id,
          content: {
            text: hash,
            action: decision.action,
          },
          roomId: message.roomId,
          userId: message.userId,
          agentId: runtime.agentId,
        };

        await runtime.messageManager.createMemory(transactionMemory);

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
