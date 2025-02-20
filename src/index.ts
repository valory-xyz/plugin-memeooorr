import type { Plugin } from "@elizaos/core";
import { tweetProvider, twitterProvider } from "./providers/twitterProvider";
import { tokenProvider } from "./providers/tokenProvider";
import { decideTokenAction } from "./actions/tokenDecisionAction";
import { decideTwitterInteractionAction } from "./actions/decideTwitterInteraction";
import { safeAccountProvider } from "./providers/safeaccount";
import { ACTIONS } from "./config";

export * as actions from "./actions/index";
export * as providers from "./providers/index";
export * as types from "./types/index";

export const memeoorPlugin: Plugin = {
  name: "memeooorr",
  description: "Provides NFT collection information and market intelligence",
  providers: [],
  actions: [
    decideTwitterInteractionAction(tweetProvider, twitterProvider),
    decideTokenAction(tokenProvider, safeAccountProvider),
  ],
  evaluators: [],
};

export { ACTIONS };
export default { memeoorPlugin };
