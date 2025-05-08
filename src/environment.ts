import type { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const memeoorrEnvSchema = z
  .object({
    TWITTER_USERNAME: z.string().min(1, "X Username is required"),
    TWITTER_PASSWORD: z.string().min(6, "X Password is required"),
    TWITTER_EMAIL: z.string().email("X Email is required"),
  })
  .and(
    z.object({
      SAFE_ADDRESS: z.string().min(1, "Safe address is required"),
      AGENT_EOA_PK: z.string().min(1, "Wallet private key is required"),
      BASE_LEDGER_RPC: z.string().min(1, "RPC URL is required"),
      HELIUS_API_KEY: z.string().min(1, "Helius API key is required"),
      BIRDEYE_API_KEY: z.string().min(1, "Birdeye API key is required"),
    }),
  );

export type memeoorrConfig = z.infer<typeof memeoorrEnvSchema>;

export async function validateMemeoorrConfig(
  runtime: IAgentRuntime,
): Promise<memeoorrConfig> {
  try {
    const config = {
      TWITTER_USERNAME:
        runtime.getSetting("TWITTER_USERNAME") || process.env.TWITTER_USERNAME,
      TWITTER_PASSWORD:
        runtime.getSetting("TWITTER_PASSWORD") || process.env.TWITTER_PASSWORD,
      TWITTER_EMAIL:
        runtime.getSetting("TWITTER_EMAIL") || process.env.TWITTER_EMAIL,
      SAFE_ADDRESS:
        runtime.getSetting("SAFE_ADDRESS") || process.env.SAFE_ADDRESS,
      AGENT_EOA_PK:
        runtime.getSetting("AGENT_EOA_PK") || process.env.AGENT_EOA_PK,
      BASE_LEDGER_RPC:
        runtime.getSetting("BASE_LEDGER_RPC") || process.env.BASE_LEDGER_RPC,
      HELIUS_API_KEY:
        runtime.getSetting("HELIUS_API_KEY") || process.env.HELIUS_API_KEY,
      BIRDEYE_API_KEY:
        runtime.getSetting("BIRDEYE_API_KEY") || process.env.BIRDEYE_API_KEY,
    };

    return memeoorrEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");
      throw new Error(
        `Memeoorr configuration validation failed:\n${errorMessages}`,
      );
    }
    throw error;
  }
}
