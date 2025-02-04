import {
  ActionExample,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
  elizaLogger,
  composeContext,
  generateObject,
  signMessage,
} from "@elizaos/core";
import { validateAbstractConfig } from "../environment";

import {
  Address,
  Hex,
  createWalletClient,
  erc20Abi,
  http,
  parseEther,
  isAddress,
  parseUnits,
  createPublicClient,
  encodeFunctionData,
  hexToBytes,
} from "viem";
import { abstractTestnet, mainnet, base, celo } from "viem/chains";
import { normalize } from "viem/ens";
import { z } from "zod";
import { ValidateContext } from "../utils";
import { ETH_ADDRESS, ERC20_OVERRIDE_INFO } from "../constants";
import { useGetAccount, useGetWalletClient } from "../hooks";
import { getRawSafeTransactionHash } from "../utils/safetransaction";

export const TokenConfigSchema = z.object({
  enabled: z.boolean().default(true),
  memeFactoryContract: z.string(),
  gnosisSafeContract: z.string(),
  dryRun: z.boolean().optional().default(false),
});

export interface TokenAction {
  action: "summon" | "heart" | "unleash" | "collect" | "purge" | "burn";
  tokenAddress?: string;
  tokenNonce?: string;
  tokenName?: string;
  tokenTicker?: string;
  tokenSupply?: string;
  amount?: string;
  tweet?: string;
  newPersona?: string;
}

export class TokenService {
  private safeAccount: any;
  private baseClient: any;
  private celoClient: any;
  private config: z.infer<typeof TokenConfigSchema>;

  // Add public getter for config
  public getConfig() {
    return this.config;
  }

  constructor(
    account: any,
    baseClient: any,
    celoClient: any,
    config: z.infer<typeof TokenConfigSchema>,
  ) {
    this.safeAccount = account;
    this.baseClient = baseClient;
    this.celoClient = celoClient;
    this.config = config;
  }

  private async performAction(
    data: Hex,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      if (this.config.dryRun) {
        elizaLogger.log("Dry run mode - action not performed:", action);
        return { success: true };
      }

      const hash = await this.safeAccount.sendTransaction({
        to: runtime?.getSetting("MEMEFACTORY_ADDRESS"),
        data: data,
        value: 0n,
      });
      return { success: true, hash };
    } catch (error) {
      elizaLogger.error("Failed to perform token action:", {
        error: error instanceof Error ? error.message : String(error),
        action,
      });
      return { success: false, error: error.message };
    }
  }

  async summonToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    // get transaction hash for summoning meme that will be executed using safe contract
    const data = encodeFunctionData({
      abi: erc20Abi,
      function: "summonThisMeme",
      args: [action.tokenName, action.tokenTicker, action.tokenSupply],
    });

    return this.performAction(data);
  }

  async heartToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const data = encodeFunctionData({
      abi: erc20Abi,
      function: "heartThisMeme",
      args: [action.tokenNonce],
    });
    return this.performAction(data);
  }

  async unleashToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const data = encodeFunctionData({
      abi: erc20Abi,
      function: "unleashThisMeme",
      args: [action.tokenNonce],
    });
    return this.performAction(data);
  }

  async collectToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const data = encodeFunctionData({
      abi: erc20Abi,
      function: "collectThisMeme",
      args: [action.memeAddress],
    });
    return this.performAction(data);
  }

  async purgeToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const data = encodeFunctionData({
      abi: erc20Abi,
      function: "purgeThisMeme",
      args: [action.memeAddress],
    });
    return this.performAction(data);
  }

  async burnToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const data = encodeFunctionData({
      abi: erc20Abi,
      function: "scheduleForAscendance",
      args: [],
    });
    return this.performAction(data);
  }

  async executeTokenAction(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    switch (action.action) {
      case "summon":
        return this.summonToken(action);
      case "heart":
        return this.heartToken(action);
      case "unleash":
        return this.unleashToken(action);
      case "collect":
        return this.collectToken(action);
      case "purge":
        return this.purgeToken(action);
      case "burn":
        return this.burnToken(action);
      default:
        elizaLogger.log("No valid action provided for token:", action);
        return { success: false, error: "Invalid action" };
    }
  }
}
