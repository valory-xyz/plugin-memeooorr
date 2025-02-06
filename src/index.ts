import type { Plugin } from "@elizaos/core";
import { tweetProvider, twitterProvider } from "./providers/twitterProvider";
import { tokenProvider } from "./providers/tokenProvider";
import { decideTokenAction } from "./actions/tokenDecisionAction";
import { decideTwitterInteractionAction } from "./actions/decideTwitterInteraction";

import { TokenService } from "./services/memeService";

export * as actions from "./actions";
export * as providers from "./providers";
export * as services from "./services";
export * as types from "./types";

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

function createMemeoorPlugin(): Plugin {
  // Initialize reusable CacheManager if caching is enabled
  const memeService = new TokenService();
  memeService.createSafe();

  return {
    name: "memeooorr",
    description: "Provides NFT collection information and market intelligence",
    providers: [tweetProvider, tokenProvider],
    actions: [
      decideTwitterInteractionAction(tweetProvider, twitterProvider),
      decideTokenAction(tokenProvider, memeService),
    ],
    evaluators: [],
  };
}

export default createMemeoorPlugin;
