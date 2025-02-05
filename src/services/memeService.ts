import { elizaLogger } from "@elizaos/core";

import {
  Address,
  Hex,
  createWalletClient,
  http,
  parseEther,
  isAddress,
  parseUnits,
  createPublicClient,
  encodeFunctionData,
  hexToBytes,
  Client,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { memeFactoryAbi } from "../abi/memefactory";
import { toSafeSmartAccount } from "permissionless/accounts";
import { base, celo } from "viem/chains";
import { z } from "zod";
import { SmartAccountClient, createSmartAccountClient } from "permissionless";

export const TokenConfigSchema = z.object({
  enabled: z.boolean().default(true),
  memeFactoryContract: z.string(),
  gnosisSafeContract: z.string(),
  dryRun: z.boolean().optional().default(false),
});

export interface TokenAction {
  action: string;
  tokenAddress?: Address;
  tokenNonce?: bigint;
  tokenName?: string;
  tokenTicker?: string;
  tokenSupply?: bigint;
  amount?: string;
  tweet?: string;
  newPersona?: string;
}

export class TokenService {
  private safeAccount: SmartAccountClient;
  private baseClient: Client;
  private celoClient: Client;
  private config: z.infer<typeof TokenConfigSchema>;

  // Add public getter for config
  public getConfig() {
    return this.config;
  }

  constructor() {
    this.baseClient = createPublicClient({
      chain: base,
      transport: http(process.env.VIEM_BASE_RPC_URL),
    });
    this.celoClient = createPublicClient({
      chain: celo,
      transport: http(process.env.VIEM_CELO_RPC_URL),
    });
  }

  private async createSafe() {
    if (
      !process.env.VIEM_BASE_PRIVATE_KEY &&
      !process.env.VIEM_BASE_PRIVATE_KEY
    ) {
      throw new Error("Missing base private key");
    }
    const ownerAdress = process.env.VIEM_BASE_PRIVATE_KEY as `0x${string}`;
    const memeaddress = process.env.MEME_FACTORY_CONTRACT as `0x${string}`;

    const owner = privateKeyToAccount(ownerAdress);

    const safeSmartAccount = await toSafeSmartAccount({
      client: this.baseClient,
      owners: owner,
      version: "1.4.1",
    });

    this.safeAccount = createSmartAccountClient({
      account: safeSmartAccount,
      chain: base,
      bundlerTransport: http(process.env.VIEM_BASE_RPC_URL),
    });
  }

  private async performAction(
    data: Hex,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      if (this.config.dryRun) {
        elizaLogger.log("Dry run mode - action not performed:", action);
        return { success: true };
      }

      const contractAddres: Address = this.config
        .memeFactoryContract as Address;

      const hash = await this.safeAccount.sendTransaction({
        to: contractAddres,
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
    if (!action.tokenName || !action.tokenTicker || !action.tokenSupply) {
      elizaLogger.error("Missing required fields for summoning token:", action);
      return { success: false, error: "Missing required fields" };
    }
    const data = encodeFunctionData({
      abi: memeFactoryAbi,
      functionName: "summonThisMeme",
      args: [action.tokenName, action.tokenTicker, action.tokenSupply],
    });

    return this.performAction(data);
  }

  async heartToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    if (!action.tokenNonce) {
      elizaLogger.error("Missing required fields for hearting token:", action);
      return { success: false, error: "Missing required fields" };
    }

    const data = encodeFunctionData({
      abi: memeFactoryAbi,
      functionName: "heartThisMeme",
      args: [action.tokenNonce],
    });
    return this.performAction(data);
  }

  async unleashToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const data = encodeFunctionData({
      abi: memeFactoryAbi,
      functionName: "unleashThisMeme",
      args: [action.tokenNonce],
    });
    return this.performAction(data);
  }

  async collectToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const data = encodeFunctionData({
      abi: memeFactoryAbi,
      functionName: "collectThisMeme",
      args: [action.memeAddress],
    });
    return this.performAction(data);
  }

  async purgeToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    if (!action.tokenAddress) {
      elizaLogger.error("Missing required fields for purging token:", action);
      return { success: false, error: "Missing required fields" };
    }

    const data = encodeFunctionData({
      abi: memeFactoryAbi,
      functionName: "purgeThisMeme",
      args: [action.tokenAddress],
    });
    return this.performAction(data);
  }

  async burnToken(
    action: TokenAction,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const data = encodeFunctionData({
      abi: memeFactoryAbi,
      functionName: "scheduleForAscendance",
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
