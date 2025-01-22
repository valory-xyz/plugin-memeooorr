import { elizaLogger } from "@elizaos/core";
import { z } from "zod";

export const TokenConfigSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
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
  private client: any;
  private config: z.infer<typeof TokenConfigSchema>;

  // Add public getter for config
  public getConfig() {
    return this.config;
  }

  constructor(client: any, config: z.infer<typeof TokenConfigSchema>) {
    this.client = client;
    this.config = config;
  }

  private async performAction(action: TokenAction): Promise<boolean> {
    try {
      if (this.config.dryRun) {
        elizaLogger.log("Dry run mode - action not performed:", action);
        return true;
      }

      const response = await this.client.tokenClient.performAction(action);

      return { success: true, response };
    } catch (error) {
      elizaLogger.error("Failed to perform token action:", {
        error: error instanceof Error ? error.message : String(error),
        action,
      });
      return { success: false, error: error.message };
    }
  }

  async summonToken(action: TokenAction): Promise<boolean> {
    return this.performAction({ ...action, action: "summon" });
  }

  async heartToken(action: TokenAction): Promise<boolean> {
    return this.performAction({ ...action, action: "heart" });
  }

  async unleashToken(action: TokenAction): Promise<boolean> {
    return this.performAction({ ...action, action: "unleash" });
  }

  async collectToken(action: TokenAction): Promise<boolean> {
    return this.performAction({ ...action, action: "collect" });
  }

  async purgeToken(action: TokenAction): Promise<boolean> {
    return this.performAction({ ...action, action: "purge" });
  }

  async burnToken(action: TokenAction): Promise<boolean> {
    return this.performAction({ ...action, action: "burn" });
  }

  async executeTokenAction(action: TokenAction): Promise<boolean> {
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
        return false;
    }
  }
}
