import type { Plugin } from "@elizaos/core";
import { tweetProvider, twitterProvider } from "./providers/twitterProvider.ts";
import { tokenProvider } from "./providers/tokenProvider.ts";
import { decideTokenAction } from "./actions/tokenDecisionAction.ts";
import { decideTwitterInteractionAction } from "./actions/decideTwitterInteraction.ts";
import { safeAccountProvider } from "./providers/safeaccount.ts";
import { DirectClient } from "@elizaos/client-direct";

export * as actions from "./actions/index.ts";
export * as providers from "./providers/index.ts";
export * as types from "./types/index.ts";

// // Consider exposing these settings as environment variables to allow users to provide custom configuration values.
// const config = {
//   caching: {
//     enabled: true,
//     ttl: 3600000, // 1 hour
//     maxSize: 1000,
//   },
//   security: {
//     rateLimit: {
//       enabled: true,
//       maxRequests: 100,
//       windowMs: 60000,
//     },
//   },
//   maxConcurrent: 5, // Maximum concurrent requests
//   maxRetries: 3, // Maximum retry attempts
//   batchSize: 20, // Batch size for collection requests
// };

// function createMemeoorPlugin(): Plugin {
//   // Initialize reusable CacheManager if caching is enabled

//   return {
//     name: "memeooorr",
//     description: "Provides NFT collection information and market intelligence",
//     providers: [
//       tweetProvider,
//       tokenProvider,
//       tokenProvider,
//       safeWalletProvider,
//     ],
//     actions: [
//       decideTwitterInteractionAction(tweetProvider, twitterProvider),
//       decideTokenAction(tokenProvider, safeWalletProvider),
//     ],
//     evaluators: [],
//   };
// }
//
export const memeoorPlugin: Plugin = {
  name: "memeooorr",
  description: "Provides NFT collection information and market intelligence",
  // providers: [tweetProvider, twitterProvider, tokenProvider, safeWalletProvider],
  providers: [],
  actions: [
    decideTwitterInteractionAction(tweetProvider, twitterProvider),
    decideTokenAction(tokenProvider, safeAccountProvider),
  ],
  evaluators: [],
};

export default memeoorPlugin;
