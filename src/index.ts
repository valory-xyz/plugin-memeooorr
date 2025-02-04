import type { Plugin, IAgentRuntime, Memory, State } from "@elizaos/core";
import { elizaLogger, settings } from "@elizaos/core";
import { SafeSmartAccountImplementation, toSafeSmartAccount } from 'permissionless/accounts'
import { z } from "zod";
import { TwitterClientInterface } from "@elizaos/client-twitter";
import { TokenProvider } from "./providers/token";
import { Connection, PublicKey } from "@solana/web3.js";
// import type { Chain, WalletClient, Signature, Balance } from "@goat-sdk/core";
import type { WalletClient, Client, Chain, Signature } from "viem";
import * as fs from "fs";
import * as path from "path";
import { TrustScoreProvider } from "./providers/trustScoreProvider";
import { SimulationService } from "./services/simulationService";
import { SAFETY_LIMITS } from "./constants";
import NodeCache from "node-cache";
import { v4 as uuidv4 } from "uuid";
import { actions } from "./actions";
import {owner} from "./utils/owner"
import {
  TradeAlert,
  TradeBuyAlert,
  tweetTrade,
  TwitterConfigSchema,
  TwitterService,
} from "./services/twitter";
import {
  executeTrade,
  getChainWalletBalance,
  getOwner
  getWalletBalance,
  getWalletKeypair,
} from "./wallet";
import type { ProcessedTokenData } from "./types";
import type { MemeCoin } from "../types/chain";
import { analyzeTradeAction } from "./actions/analyzeTrade";

// Update Balance interface to include formatted
interface ExtendedBalance extends Balance {
  formatted: string;
}

// Extended WalletProvider interface to ensure proper typing
interface ExtendedWalletProvider extends WalletClient {
  wallet: WalletClient;
  gnosisClient: Client;
  baseClient: Client;
  celoClient: Client;
  account: SafeSmartAccountImplementation;
}

const REQUIRED_SETTINGS = {
  WALLET_PUBLIC_KEY: "wallet public key",
  TWITTER_API_KEY: "TWITTER API key",
  MEMEFACTORY_ADDRESS: "MemeFactory contract address",
} as const;

// Add near the top imports
interface ExtendedPlugin extends Plugin {
  name: string;
  description: string;
  evaluators: any[];
  providers: any[];
  actions: any[];
  services: any[];
  autoStart?: boolean;
}

// Add cache configuration after other interfaces
interface CacheEntry {
  lastAction: number;
}

// Add cache instance before createGoatPlugin
const tokenCache = new NodeCache({
  stdTTL: 1200, // 20 minutes in seconds
  checkperiod: 120, // Check for expired entries every 2 minutes
});

// Add near the top with other interfaces
interface SkipWaitCache {
  lastTweet: number;
  action: "WAIT" | "SKIP";
}

// Add near other cache instances
const skipWaitCache = new NodeCache({
  stdTTL: 7200, // 2 hours in seconds
  checkperiod: 600, // Check for expired entries every 10 minutes
});

// Add near other interfaces
interface TweetRateLimit {
  lastTweet: number;
  count: number; // Track number of tweets in the time window
}

// Add near other cache instances
const tweetRateCache = new NodeCache({
  stdTTL: 86400, // 24 hours in seconds
  checkperiod: 3600, // Check every hour
});

// Add helper function
function canTweet(tweetType: "trade" | "market_search"): boolean {
  const now = Date.now();
  const hourKey = `tweets_${tweetType}_${Math.floor(now / 3600000)}`; // Key by hour and type
  const rateLimit: TweetRateLimit = tweetRateCache.get(hourKey) || {
    lastTweet: now,
    count: 0,
  };

  // Different limits for different tweet types
  const MAX_TWEETS_PER_HOUR = {
    trade: 10,
    market_search: 10, // Lower limit for market search tweets
  };

  if (rateLimit.count >= MAX_TWEETS_PER_HOUR[tweetType]) {
    elizaLogger.warn(
      `Tweet rate limit reached for ${tweetType}: ${rateLimit.count} tweets this hour`,
    );
    return false;
  }

  // Update rate limit
  tweetRateCache.set(hourKey, {
    lastTweet: now,
    count: rateLimit.count + 1,
  });

  return true;
}

interface InteractionParams extends Record<string, any> {
  persona: string;
  previousTweets: string[];
  otherTweets: string[];
}

interface AnalysisParams extends Record<string, any> {
  tokenData: MemeCoin[];
  latestTweet: string;
  tweetResponses: string[];
}

async function updateTokenDetails(
  runtime: IAgentRuntime,
  tokenData: any,
) {
  const name = tokenData.token_name;
  const ticker = tokenData.token_ticker;
  const supply = tokenData.token_supply;

  // Create sellDetailsData object matching SQL parameter order
  const sellDetails: MemeToken = {
    token_name: name,
    token_ticker: ticker,
    token_supply: supply,
  };

  const whereClause = {
    tokenAddress,
    recommenderId,
    buyTimeStamp: tokenData.buy_timeStamp,
  };

  elizaLogger.log("Attempting to update meme tokens with data:", {
    memeTokenDetails,
    whereClause: whereClause,
    isSimulation: false,
  });

  try {
    try {
      // Pass sellDetails first (SET clause), then WHERE clause parameters
      elizaLogger.log(
        "Verifying parameters for updateTradePerformanceOnSell:",
        {
          sellDetails,
          tokenAddress,
          recommenderId,
          buyTimeStamp: trade.buy_timeStamp,
          isSimulation: false,
        },
      );

      const success = await trustScoreDb.updateTradePerformanceOnSell(
        tokenAddress, // 1. WHERE token_address = ?
        recommenderId, // 2. WHERE recommender_id = ?
        trade.buy_timeStamp, // 3. WHERE buy_timeStamp = ?
        sellDetails, // 4. SET clause parameters
        false, // 5. isSimulation flag
      );

      if (!success) {
        elizaLogger.warn("Trade update returned false", whereClause);
      }

      elizaLogger.log("Trade performance update completed", {
        success,
        tokenAddress,
        recommenderId,
        profitPercent: profitPercent.toFixed(2) + "%",
        profitUsd: profitUsd.toFixed(4) + " USD",
      });
    } catch (dbError) {
      elizaLogger.error("Database error during trade update:", {
        error: dbError,
        query: {
          sellDetails,
          whereClause: whereClause,
        },
      });
      throw dbError;
    }
  } catch (error) {
    elizaLogger.error("Failed to update trade performance:", {
      error,
      parameters: {
        sellDetails,
        whereClause: whereClause,
        originalTrade: trade,
      },
      errorDetails:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    });
    throw error;
  }

  return {
    sellDetails,
    currentPrice,
    profitDetails: {
      profitUsd,
      profitPercent,
      sellValueUsd,
    },
  };
}

async function createMemeoorrPlugin(
  getSetting: (key: string) => string | undefined,
  runtime?: IAgentRuntime,
): Promise<Plugin> {

  // Define resumeTrading at the start of the function
  const resumeTrading = async () => {
    await twitterInteraction(
        runtime,
        connection,
        twitterService
    )

    await analyzeToken(
        runtime,
        connection,
        twitterService,
        walletProvider
    )

      // Add delay between iterations
      await new Promise((resolve) => setTimeout(resolve, 1200000)); // 20 minutes
  };

  elizaLogger.log("Starting Memeoor plugin initialization");

  // Move connection initialization to the top
  const wallet = createWalletClient({
    chain: privateKeyToAccount(getSetting("WALLET_PRIVATE_KEY") || ""),
    transport: http(),
  });

  const gnosisClient = createPublicClient({
    chain: gnosis,
    transport: http(),
  });

  const baseClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  const celoClient = createPublicClient({
    chain: celo,
    transport: http(),
  });

  const account = await toSafeSmartAccount({
    client: baseClient,
    owner: [getOwner(runtime)]
    }
  );


  // Validate required settings
  const missingSettings: string[] = [];
  for (const [key, description] of Object.entries(REQUIRED_SETTINGS)) {
    if (!getSetting(key)) {
      missingSettings.push(`${key} (${description})`);
    }
  }

  if (missingSettings.length > 0) {
    const errorMsg = `Missing required settings: ${missingSettings.join(", ")}`;
    elizaLogger.error(errorMsg);
    throw new Error(errorMsg);
  }

  elizaLogger.log("Initializing Solana connection...");
  const walletProvider: ExtendedWalletProvider = {
    wallet,
    gnosisClient,
    baseClient,
    celoClient
  };

  elizaLogger.log(
    "connection and wallet provider initialized successfully",
  );

  // Initialize Twitter service if enabled
  let twitterService: TwitterService | undefined;
  try {
    elizaLogger.log("Configuring Twitter service for trade notifications...");
    const twitterConfig = TwitterConfigSchema.parse({
      enabled: getSetting("TWITTER_ENABLED") === "true",
      username: getSetting("TWITTER_USERNAME"),
      dryRun: false,
    });

    if (twitterConfig.enabled && runtime) {
      elizaLogger.log("Starting Twitter client initialization...");
      const twitterClient = await TwitterClientInterface.start(runtime);
      twitterService = new TwitterService(twitterClient, twitterConfig);

      // Add delay after initialization
      await new Promise((resolve) => setTimeout(resolve, 5000));

      elizaLogger.log("Twitter service initialized successfully", {
        username: twitterConfig.username,
        dryRun: twitterConfig.dryRun,
      });
    }
  } catch (error) {
    elizaLogger.error("Failed to initialize Twitter service:", error);
  }

  elizaLogger.log("Initializing Solana plugin components...");

  try {
    const customActions = actions;

    // Then update the plugin creation
    const plugin: ExtendedPlugin = {
      name: "Memeeoor framework ",
      description: "Agents for Memeeoorr framework with wallet Integration",
      evaluators: [],
      providers: [
        walletProvider,
        trustScoreProvider
      ],
      actions: [...customActions],
      services: [],
      autoStart: true,
    };

    // Add auto-start trading analysis
    if (!runtime) return;

    elizaLogger.log("Starting autonomous trading system...");
    const twitterInteractionAction = plugin.actions.find(
      (a) => a.name === "DECIDE_INTERACTION",
    );
    const tokenDecisionAction = plugin.actions.find(
      (a) => a.name === "MEME_ACTION",
    );

    if (!analyzeTradetokenDecisionActionAction) return;

    const interval = Number(runtime.getSetting("TRADING_INTERVAL")) || 300000;

    // Then start trading loop if enabled
    if (!settings.ENABLE_TRADING) return;

    elizaLogger.log("Initializing trading loop...");
    await resumeTrading();
    setInterval(resumeTrading, interval);

    elizaLogger.log("GOAT plugin initialization completed successfully");
    return plugin;
  } catch (error) {
    elizaLogger.error("Failed to initialize plugin components:", error);
    throw new Error(
      `Plugin initialization failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function twitterInteraction(
  runtime: IAgentRuntime,
  connection: Connection,
  twitterService: TwitterService
) {
  try {

    persona = await runtime.character.bio;
    previousTweets = await previousTweets(twitterService);
    agentHandles = await getMemeooorrHandlesFromSubgraph(runtime);
    if (!agentHandles) {
      elizaLogger.error(
        `Failed to fetch agent handles for ${persona}`
      );
      return;
    otherTweets = //TODO: Fetch interacted tweets from DB


    const interactionParams: InteractionParams = {
      persona,
      previousTweets,
      otherTweets,
    };

    const state: State = await runtime.composeState({
      userId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: runtime.agentId,
      content: {
        text: `Initialize state for feedback analysis`,
        type: "analysis",
      },
    });

    const feedbackMemory: Memory = {
      userId: state.userId,
      agentId: runtime.agentId,
      roomId: state.roomId,
      content: {
        text: `Analyze feedback`,
        type: "analysis",
      },
    };

   const decideInteraction = await twitterInteractionAction.handler(
      runtime,
      feedbackMemory,
      state,
      interactionParams,
      async (response) => {
        if (!response) {
          elizaLogger.error(
            `Empty response from feedback analysis`
          );
          return [];
        }

        elizaLogger.log(
          `Feedback analysis result:`,
          response
        );
        try {
          // Parse the JSON response from the analysis
          const result =
            typeof response.text === "string"
                ? JSON.parse(response.text)
                : response.text;

          if (!result) {
            elizaLogger.error(
                `Invalid analysis result for feedback`
            );

            return [];
          }

          twitterService.postTweetAlert(result);

          // if action is not tweet or none create a interaction memory object
          if (result.action !== "tweet" || result.action !== "none") {
            const interactionMemory: Memory = {
                userId: state.userId,
                agentId: runtime.agentId,
                roomId: state.roomId,
                content: {
                    text: `Interact with tweet`,
                    id: result.id,
                    action: result.action,
                    source: "system",
                    type: "INTERACTION",
                },
            };
          }
      } catch (parseError) {}
      return [];
  } catch (error) {
    elizaLogger.error("Failed to analyze feedback:", error);
    throw new Error(
      `Failed to analyze feedback: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}


async function analyzeToken(
    runtime: IAgentRuntime,
    connection: Connection,
    twitterService: TwitterService,
    walletProvider: ExtendedWalletProvider
) {
    try {

        elizaLogger.log(`Starting analysis for token: ${tokenAddress}`);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        // TODO: Implement address verfier
        if (!validateSolanaAddress(tokenAddress)) {
            elizaLogger.error(`Invalid token address format: ${tokenAddress}`);
            return;
        }

        // Initialize TokenProvider directly with just the token address
        const tokenProvider = new TokenProvider(subgraphUrl, tokenQuery);
        const tokenService = new TokenService(account, baseClient, celoClient, config);

        // Get processed token data which includes DexScreener data
        elizaLogger.log(`Fetching token data for ${tokenAddress}`);
        const tokenData = await tokenProvider.getMemeCoins();
        elizaLogger.log(`Token data fetched for ${tokenAddress}:`, tokenData);

        latestTweet = await fetchTweet(twitterService);

        // Cache the new data
        const cacheEntry: CacheEntry = {
            lastAnalysis: Date.now(),
            tokenData,
            analysisResult: null, // Will be updated after analysis
        };
        tokenCache.set(tokenAddress, cacheEntry);


        const analysisParams: AnalysisParams = {
            tokenData,
            latestTweet,
            tweetResponses,
        };

        // Create initial state first
        const state: State = await runtime.composeState({
            userId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: runtime.agentId,
            content: {
                text: `Initialize state for ${tokenAddress}`,
                type: "analysis",
            },
        });

        // Then create analysis memory using state
        const analysisMemory: Memory = {
            userId: state.userId,
            agentId: runtime.agentId,
            roomId: state.roomId,
            content: {
                text: `Analyze trade for ${tokenAddress}`,
                type: "analysis",
            },
        };

        // Update analysis result in cache after completion
        const analysisResult = await tokenDecisionAction.handler(
            runtime,
            analysisMemory,
            state,
            analysisParams,
            async (response) => {
                if (!response) {
                    elizaLogger.error(
                        `Empty response from analysis for ${tokenAddress}`
                    );
                    return [];
                }

                elizaLogger.log(
                    `Analysis result for ${tokenAddress}:`,
                    response
                );
                try {
                    // Parse the JSON response from the analysis
                    const result =
                        typeof response.text === "string"
                            ? JSON.parse(response.text)
                            : response.text;

                    if (!result) {
                        elizaLogger.error(
                            `Invalid analysis result for ${tokenAddress}`
                        );

                        return [];
                    }

                    // Process the analysis result
                    tokenService.executeTokenAction(result)

                    if (result.tweet):
                      await postTweet(twitterService)

                    const tokenMemory: Memory = {
                        userId: state.userId,
                        agentId: runtime.agentId,
                        roomId: state.roomId,
                        content: {
                            text: `Trade for ${tokenAddress}`,
                            tokenAddress,
                            action: `TRADE_${result.action}`,
                            source: "system",
                            type: "trade",
                        },
                    };

                } catch (parseError) {}
                return [];
            }
        );
        cacheEntry.analysisResult = analysisResult;
        tokenCache.set(tokenAddress, cacheEntry);
    } catch (tokenError) {
        elizaLogger.error(`Error processing token ${tokenAddress}:`, {
            error: tokenError,
            stack: tokenError instanceof Error ? tokenError.stack : undefined,
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
}


async function summon({
    runtime,
    tokenAddress,
    state,
    tokenData,
    result,
    twitterService,
    walletProvider,
}: {
    runtime: IAgentRuntime;
    tokenAddress: string;
    state: State;
    tokenData: ProcessedTokenData;
    result: any;
    twitterService: TwitterService;
    walletProvider: ExtendedWalletProvider;
}) {
    elizaLogger.log(`Trade recommended for ${tokenAddress}:`, result);

    // Continue with simulation if analysis recommends trading
    const tokenService = new TokenService();
    const summonResponse = await tokenService.summonToken(
        result.recommendedAction,
    );

    if (summonResponse.success) {
      try{

        // save summoned token to db
        await updateTokenDetails(runtime, tokenData);

        // create summon memory object
        const summonMemory: Memory = {
            userId: state.userId,
            agentId: runtime.agentId,
            roomId: state.roomId,
            content: {
                text: `Summon token for ${tokenAddress}`,
                tokenAddress,
                action: "SUMMON",
                source: "system",
                type: "trade",
            },
        };
      } else {
        elizaLogger.log(
            `Simulation rejected trade for ${tokenAddress}:`,
            simulation
        );
    }
}


async function heart({
    runtime,
    tokenAddress,
    state,
    tokenData,
    result,
    twitterService,
    walletProvider,
}: {
    runtime: IAgentRuntime;
    tokenAddress: string;
    state: State;
    tokenData: ProcessedTokenData;
    result: any;
    twitterService: TwitterService;
    walletProvider: ExtendedWalletProvider;
}) {
    elizaLogger.log(`Trade recommended for ${tokenAddress}:`, result);

    // Continue with simulation if analysis recommends trading
    const tokenService = new TokenService();
    const heartResponse = await tokenService.heartToken(
        result.recommendedAction,
    );

    if (heartResponse.success) {
      try{

        // save hearted token to db
        await updateTokenDetails(runtime, tokenData);

        // create heart memory object
        const heartMemory: Memory = {
            userId: state.userId,
            agentId: runtime.agentId,
            roomId: state.roomId,
            content: {
                text: `Heart token for ${tokenAddress}`,
                tokenAddress,
                action: "HEART",
                source: "system",
                type: "trade",
            },
        };
      } catch(error) {
        elizaLogger.log(
            `Simulation rejected trade for ${tokenAddress}:`,
            simulation
        );
      }
    }
}

async function unleash({
    runtime,
    tokenAddress,
    state,
    tokenData,
    result,
    twitterService,
    walletProvider,
}: {
    runtime: IAgentRuntime;
    tokenAddress: string;
    state: State;
    tokenData: ProcessedTokenData;
    result: any;
    twitterService: TwitterService;
    walletProvider: ExtendedWalletProvider;
}) {
    elizaLogger.log(`Trade recommended for ${tokenAddress}:`, result);

    // Continue with simulation if analysis recommends trading
    const tokenService = new TokenService();
    const unleashResponse = await tokenService.unleashToken(
        result.recommendedAction,
    );

    if (unleashResponse.success) {
      try{

        // save unleashed token to db
        await updateTokenDetails(runtime, tokenData);

        // create unleash memory object
        const unleashMemory: Memory = {
            userId: state.userId,
            agentId: runtime.agentId,
            roomId: state.roomId,
            content: {
                text: `Unleash token for ${tokenAddress}`,
                tokenAddress,
                action: "UNLEASH",
                source: "system",
                type: "trade",
            },
        };
      } catch(error) {
        elizaLogger.log(
            `Simulation rejected trade for ${tokenAddress}:`,
            simulation
        );
      }
    }
}


async function collect({
    runtime,
    tokenAddress,
    state,
    tokenData,
    result,
    twitterService,
    walletProvider,
}: {
    runtime: IAgentRuntime;
    tokenAddress: string;
    state: State;
    tokenData: ProcessedTokenData;
    result: any;
    twitterService: TwitterService;
    walletProvider: ExtendedWalletProvider;
}) {
    elizaLogger.log(`Trade recommended for ${tokenAddress}:`, result);

    // Continue with simulation if analysis recommends trading
    const tokenService = new TokenService();
    const collectResponse = await tokenService.collectToken(
        result.recommendedAction,
    );

    if (collectResponse.success) {
      try{

        // save collected token to db
        await updateTokenDetails(runtime, tokenData);

        // create collect memory object
        const collectMemory: Memory = {
            userId: state.userId,
            agentId: runtime.agentId,
            roomId: state.roomId,
            content: {
                text: `Collect token for ${tokenAddress}`,
                tokenAddress,
                action: "COLLECT",
                source: "system",
                type: "trade",
            },
        };
      } catch(error) {
        elizaLogger.log(
            `Simulation rejected trade for ${tokenAddress}:`,
            simulation
        );
      }
    }
}


async function purge({
    runtime,
    tokenAddress,
    state,
    tokenData,
    result,
    twitterService,
    walletProvider,
}: {
    runtime: IAgentRuntime;
    tokenAddress: string;
    state: State;
    tokenData: ProcessedTokenData;
    result: any;
    twitterService: TwitterService;
    walletProvider: ExtendedWalletProvider;
}) {
    elizaLogger.log(`Trade recommended for ${tokenAddress}:`, result);

    // Continue with simulation if analysis recommends trading
    const tokenService = new TokenService();
    const purgeResponse = await tokenService.purgeToken(
        result.recommendedAction,
    );

    if (purgeResponse.success) {
      try{

        // save purged token to db
        await updateTokenDetails(runtime, tokenData);

        // create purge memory object
        const purgeMemory: Memory = {
            userId: state.userId,
            agentId: runtime.agentId,
            roomId: state.roomId,
            content: {
                text: `Purge token for ${tokenAddress}`,
                tokenAddress,
                action: "PURGE",
                source: "system",
                type: "trade",
            },
        };
      } catch(error) {
        elizaLogger.log(
            `Simulation rejected trade for ${tokenAddress}:`,
            simulation
        );
      }
    }
}

async function burn({
    runtime,
    tokenAddress,
    state,
    tokenData,
    result,
    twitterService,
    walletProvider,
}: {
    runtime: IAgentRuntime;
    tokenAddress: string;
    state: State;
    tokenData: ProcessedTokenData;
    result: any;
    twitterService: TwitterService;
    walletProvider: ExtendedWalletProvider;
}) {
    elizaLogger.log(`Trade recommended for ${tokenAddress}:`, result);

    // Continue with simulation if analysis recommends trading
    const tokenService = new TokenService();
    const burnResponse = await tokenService.burnToken(
        result.recommendedAction,
    );

    if (burnResponse.success) {
      try{

        // save burned token to db
        await updateTokenDetails(runtime, tokenData);

        // create burn memory object
        const burnMemory: Memory = {
            userId: state.userId,
            agentId: runtime.agentId,
            roomId: state.roomId,
            content: {
                text: `Burn token for ${tokenAddress}`,
                tokenAddress,
                action: "BURN",
                source: "system",
                type: "trade",
            },
        };
      } catch(error) {
        elizaLogger.log(
            `Simulation rejected trade for ${tokenAddress}:`,
            simulation
        );
      }
    }
}



export default createMemeoorrPlugin;
