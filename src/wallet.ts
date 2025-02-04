import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, gnosis } from "viem/chains";

/**
 * Gets wallet keypair from runtime settings
 * @param runtime Agent runtime environment
 * @returns Solana keypair for transactions
 * @throws Error if private key is missing or invalid
 */
export function getWalletKeypair(runtime?: IAgentRuntime): Keypair {
  // Check chain type from token address or configuration

  const privateKeyString = runtime?.getSetting("WALLET_PRIVATE_KEY");
  if (!privateKeyString) {
    throw new Error("No wallet private key configured");
  }

  try {
    const privateKeyBytes = decodeBase58(privateKeyString);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    elizaLogger.error("Failed to create wallet keypair:", error);
    throw error;
  }
}

/**
  * Get owner from wallet address
  * @param runtime Agent runtime environment
  * @returns Owner account
*/
export function getOwner(runtime: IAgentRuntime): Account {
  const privateKeyString = runtime?.getSetting("WALLET_PRIVATE_KEY");
  return privateKeyToAccount(privateKeyString);
}

/**
 * Gets current SOL balance for wallet
 * @param runtime Agent runtime environment
 * @returns Balance in SOL
 */
export async function getWalletBalance(
    runtime: IAgentRuntime
): Promise<number> {
    try {
        // Existing Solana balance logic
        const walletKeypair = getWalletKeypair(runtime);
        const client = createPublicClient({
          chain: gnosis,
          transport: http(),
        });

        const walletPubKey = walletKeypair.publicKey;

        const balance = await client.getBalance(walletPubKey);

        elizaLogger.log("Fetched wallet balance:", {
            address: walletPubKey.toBase58(),
            lamports: balance,
        });

        return balance;
    } catch (error) {
        elizaLogger.error("Failed to get wallet balance:", error);
        return 0;
    }


export async function getChainWalletBalance(
    runtime: IAgentRuntime,
    tokenAddress: string
): Promise<number> {
    // Get Solana balance
    return await getWalletBalance(runtime);
}
