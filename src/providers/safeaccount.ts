import Safe from "@safe-global/protocol-kit";
import type { MetaTransactionData } from "@safe-global/types-kit";
import { OperationType } from "@safe-global/types-kit";
import { createSafeClient } from "@safe-global/sdk-starter-kit";
import {
  type IAgentRuntime,
  type Provider,
  type Memory,
  type State,
  stringToUuid,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type {
  Address,
  Chain,
  EncodeFunctionDataReturnType,
  Hex,
  TransactionReceipt,
} from "viem";
import { createWalletClient, encodeFunctionData, http, parseGwei } from "viem";

import { initializeSafeClient } from "safe-client";

import type { GetTransactionReceiptReturnType } from "viem";
import type { TransactionResult } from "@safe-global/types-kit";
import { memeFactoryAbi } from "../abi/memefactory";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import { base } from "viem/chains";

import { TwitterScraper, getScrapper } from "../utils/twitterScrapper";
import { Scraper } from "agent-twitter-client";
import { getTokenNonce } from "../wallet";

// Define the type for the decision object
type Decision = {
  action: "summon" | "heart" | "unleash" | "collect" | "purge" | "burn";
  tokenAddress: string;
  tokenNonce: bigint;
  tokenName: string | null;
  tokenTicker: string | null;
  tokenSupply: bigint | null;
  amount: bigint;
  tweet: string;
  new_persona: string | null;
};

// Function to convert content to the Decision type
function convertToDecision(content: any): Decision {
  return {
    action: content.action, // Default to 'action1' if not valid
    tokenAddress: content.tokenAddress || "",
    tokenNonce: BigInt(content.tokenNonce || 0),
    tokenName: content.tokenName || null,
    tokenTicker: content.tokenTicker || null,
    tokenSupply: content.tokenSupply ? BigInt(content.tokenSupply) : null,
    amount: BigInt(content.amount || 0),
    tweet: content.tweet || "",
    new_persona: content.new_persona || null,
  };
}

export async function waitSafeTxReceipt(
  txResult: TransactionResult,
): Promise<GetTransactionReceiptReturnType | null | undefined> {
  // @ts-ignore
  const receipt: GetTransactionReceiptReturnType | null | undefined =
    txResult.transactionResponse &&
    (await (
      txResult?.transactionResponse as { wait: () => Promise<any> }
    ).wait()); // @ts-ignore

  return receipt;
}

const ZERO_VALUE = 0;
const MIN_DEPLOY_VALUE = 1000000000000000000000000n;
const MIN_SUMMON_VALUE = 1000000000000000n;
const MAX_SUMMON_VALUE = 2000000000000000n;
const MAX_HEART_VALUE = 20000000000000n;

let protocolKitInstance: Safe | null = null;

export const getProtocolKit = async (protocolKit: Safe) => {
  if (!protocolKitInstance) {
    protocolKitInstance = protocolKit;
  }
};

// export const protocolKit = Safe;

/**
 * A Safe-based transaction provider.
 *
 * This class demonstrates how to initialize a Safe Protocol Kit client,
 * create and propose transactions, fetch pending transactions, confirm them,
 * and execute transactions.
 *
 * Note: This example uses private keys for simplicity, but any EIP-1193
 * compliant signer can be used.
 */
export class SafeClient {
  // The deployed Safe (multisig) address.
  private safeAddress: string;
  // The private key corresponding to the owner.
  private ownerPrivateKey: `0x${string}`;
  // The RPC URL for the chain where the Safe is deployed.
  private rpcUrl: string;
  // The chain identifier (as bigint). For example, Sepolia is 11155111n.
  private chainId: bigint;

  private memeBaseChain: Chain;

  /**
   * Creates a new instance of SafeClientProvider.
   *
   * @param safeAddress - The deployed Safe (multisig) address.
   * @param ownerAddress - The address of the owner who will propose and sign transactions.
   * @param ownerPrivateKey - The private key of the owner.
   * @param rpcUrl - The RPC URL for the target blockchain network.
   * @param chainId - The chain ID (as bigint) of the target network.
   */
  constructor(
    safeAddress: string,
    ownerPrivateKey: `0x${string}`,
    rpcUrl: string,
    chainId: bigint,
  ) {
    this.safeAddress = safeAddress;
    this.ownerPrivateKey = ownerPrivateKey;
    this.rpcUrl = rpcUrl;
    this.chainId = chainId;
    this.memeBaseChain = {
      ...base,
      rpcUrls: {
        ...base.rpcUrls,
        custom: {
          http: [this.rpcUrl],
        },
      },
    };
  }

  /**
   * Initializes the wallet client from viem
   *
   * This instance is used for creating transaction hash.
   *
   * @returns A Promise that resolves to the initialized Protocol Kit instance.
   */
  private initWalletClient() {
    const account = privateKeyToAccount(this.ownerPrivateKey, { nonceManager });

    const walletClient = createWalletClient({
      chain: this.memeBaseChain,
      transport: http(this.rpcUrl),
      account: account,
    });

    return walletClient;
  }

  /**
   * Initializes the Safe Protocol Kit client for the owner.
   *
   * This instance is used for creating, signing, confirming, and executing transactions.
   *
   * @returns A Promise that resolves to the initialized Protocol Kit instance.
   */
  private async initSafeClient() {
    const safeClient = await createSafeClient({
      provider: this.rpcUrl,
      // The Protocol Kit accepts an EIP-1193 compliant signer.
      // Depending on your setup, you might need to wrap your private key with a library such as ethers.Wallet.
      signer: this.ownerPrivateKey,
      safeAddress: this.safeAddress,
      // Optionally, you can add onchainAnalytics or other options here.
    });
    return safeClient;
  }

  private async getProtocolKit() {
    if (!protocolKitInstance) {
      protocolKitInstance = await initializeSafeClient(
        this.rpcUrl,
        // The Protocol Kit accepts an EIP-1193 compliant signer.
        // Depending on your setup, you might need to wrap your private key with a library such as ethers.Wallet.
        this.ownerPrivateKey,
        this.safeAddress,
        // Optionally, you can add onchainAnalytics or other options here.
      );
    }
  }

  async getSafeBalance() {
    if (!protocolKitInstance) {
      await this.getProtocolKit();
    }
    const balance = await protocolKitInstance.getBalance();

    return balance;
  }

  async getNonce() {
    if (!protocolKitInstance) {
      await this.getProtocolKit();
    }

    const nonce = await protocolKitInstance.getNonce();
    return nonce;
  }

  async buildWalletTransaction(data: Hex, nonce: number) {
    const walletClient = this.initWalletClient();
    const request = await walletClient.prepareTransactionRequest({
      data: data,
      chain: this.memeBaseChain,
      gasPrice: parseGwei("3"),
      gas: BigInt(1000000),
      nonce: nonce,
      chainId: 8453,
      kzg: undefined,
    });

    return request.data;
  }

  /**
   * Send a new transaction to the Deployed Safe.
   *
   * @param transactions - The list of transactions to propose.
   * @returns A Promise that resolves to the hash of the proposed transaction.
   */
  async sendTransactions(
    transactions: MetaTransactionData[],
  ): Promise<TransactionReceipt> {
    if (!protocolKitInstance) {
      elizaLogger.log("Getting protocol kit");
      await this.getProtocolKit();
    }
    const safeTransaction = await protocolKitInstance.createTransaction({
      transactions: transactions,
      options: {
        baseGas: "0",
        safeTxGas: "500000",
        gasPrice: "1000000000",
      },
    });

    const safeTxHash =
      await protocolKitInstance.getTransactionHash(safeTransaction);
    const signedSafeTransaction =
      await protocolKitInstance.signTransaction(safeTransaction);

    const txResponse = await protocolKitInstance.executeTransaction(
      signedSafeTransaction,
    );
    const receipt = await waitSafeTxReceipt(txResponse);

    if (!receipt) {
      throw new Error("Transaction failed to execute");
    }

    return receipt;
  }
}

export const getSafeAccount = (runtime: IAgentRuntime) => {
  const safeAddress = runtime.getSetting("SAFE_ADDRESS") as Address;
  const ownerPrivateKey = runtime.getSetting("AGENT_EOA_PK") as `0x${string}`;
  const rpcUrl = runtime.getSetting("BASE_LEDGER_RPC") as string;
  const chainId = BigInt("8453");

  return new SafeClient(safeAddress, ownerPrivateKey, rpcUrl, chainId);
};

export const safeAccountProvider: Provider = {
  async get(
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<Boolean> {
    try {
      if (message.content.source == "token_decision") {
        try {
          JSON.parse(message.content.text);
        } catch (e) {
          elizaLogger.error("Failed to parse token decision");
          return false;
        }
      } else {
        return false;
      }

      const ts: Scraper | null = await getScrapper(runtime);
      if (!ts) {
        elizaLogger.error("Failed to get scraper");
        return false;
      }

      // convert string to json in message.content.text
      const mapCon = JSON.parse(message.content.text);
      const decision = convertToDecision(mapCon);
      elizaLogger.success("Extracted decision for safe account provider");
      elizaLogger.log(decision);

      const to = runtime.getSetting("MEME_FACTORY_CONTRACT") as Address;
      elizaLogger.log("fetched contract:");
      elizaLogger.log(to);
      let value: string = decision.amount.toString();

      const safeAccountClient = getSafeAccount(runtime);
      const rpcUrl = runtime.getSetting("BASE_LEDGER_RPC") as string;

      let data: EncodeFunctionDataReturnType | undefined = undefined;

      if (decision.action === "summon") {
        // if tokenSupply is less than MIN_DEPLOY_VALUE, set it to MIN_DEPLOY_VALUE
        if (decision.tokenSupply && decision.tokenSupply < MIN_DEPLOY_VALUE) {
          decision.tokenSupply = MIN_DEPLOY_VALUE;
        }

        // if amount is greater than MAX_SUMMON_VALUE, set it to MAX_SUMMON_VALUE
        if (decision.amount > MAX_SUMMON_VALUE) {
          decision.amount = MAX_SUMMON_VALUE;
        } else if (decision.amount < MIN_SUMMON_VALUE) {
          decision.amount = MIN_SUMMON_VALUE;
        }
        value = decision.amount.toString();
        data = encodeFunctionData({
          abi: memeFactoryAbi,
          functionName: "summonThisMeme",
          args: [
            decision.tokenName as string,
            decision.tokenTicker as string,
            decision.tokenSupply as bigint,
          ],
        });
      } else if (decision.action === "heart") {
        // if amount is greater than MAX_HEART_VALUE, set it to MAX_HEART_VALUE
        if (decision.amount > MAX_HEART_VALUE) {
          decision.amount = MAX_HEART_VALUE;
        }

        value = decision.amount.toString();

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
      }

      const nonce = await safeAccountClient.getNonce();

      if (!data || !nonce) {
        throw new Error("Data or nonce is missing");
      }

      const dataHex = await safeAccountClient.buildWalletTransaction(
        data,
        nonce,
      );
      if (!dataHex) {
        throw new Error("Data hex is missing");
      }

      elizaLogger.success("Data hex generated successfully");
      elizaLogger.log(dataHex);
      const transactions: MetaTransactionData[] = [
        { to: to, value: value, data: dataHex, operation: OperationType.Call },
      ];
      elizaLogger.log(transactions);
      const receipt = await safeAccountClient.sendTransactions(transactions);
      elizaLogger.log(receipt);

      let summoned_token_nonce = undefined;

      // if (decision.action === "summon") {
      //   summoned_token_nonce = await getTokenNonce(
      //     receipt.transactionHash,
      //     rpcUrl,
      //   );
      // }

      const actionSuccessMemory: Memory = {
        id: stringToUuid(Date.now().toString()),
        content: {
          text: "Safe transaction successful",
          action: decision.action,
          hash: receipt.transactionHash,
          nonce: summoned_token_nonce
            ? summoned_token_nonce.tokenNonce
            : undefined,
        },
        roomId: message.roomId,
        userId: message.userId,
        agentId: runtime.agentId,
      };

      elizaLogger.success("Safe transaction successful");

      elizaLogger.log("Posting a tweet");

      if (decision.tweet === "") {
        elizaLogger.error("Tweet is empty");
        return false;
      }

      const scraper = new TwitterScraper(ts);
      scraper.sendUserTweet(decision.tweet);

      await runtime.databaseAdapter.createMemory(
        actionSuccessMemory,
        decision.action,
      );

      return false;
    } catch (error) {
      console.error("Error in wallet provider:", error);
      throw error;
    }
  },
};
