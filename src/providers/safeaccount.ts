import SafeApiKit from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';
import {
  MetaTransactionData,
  OperationType
} from '@safe-global/types-kit';
import { createSafeClient } from '@safe-global/sdk-starter-kit';
import { type IAgentRuntime, type Provider, type Memory, type State, elizaLogger } from "@elizaos/core";
import { Address, Chain, EncodeFunctionDataReturnType, Hex, TransactionReceipt, createWalletClient, encodeFunctionData, http, parseGwei } from 'viem';

import { GetTransactionReceiptReturnType } from 'viem';
import { TransactionResult } from '@safe-global/types-kit';
import { memeFactoryAbi } from "../abi/memefactory.ts";
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { base } from 'viem/chains';

type Decision = {
  action: "summon" | "heart" | "unleash" | "collect" | "purge" | "burn";
  tokenAddress: Address;
  tokenNonce: bigint;
  tokenName: string | null;
  tokenTicker: string | null;
  tokenSupply: bigint | null;
  amount: bigint;
  tweet: string;
  new_persona: string | null;
};

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
const MIN_DEPLOY_VALUE = 10000000000000000n;

let protocolKitInstance: Safe | null = null;

export const getProtocolKit = async (rpc: string, safeAddress: `0x${string}`, key: `0x${string}`) => {
  if (!protocolKitInstance) {
    protocolKitInstance = await Safe.init({
      provider: rpc,
      signer: key,
      safeAddress: safeAddress,
    });
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
  private safeAddress: string
  // The private key corresponding to the owner.
  private ownerPrivateKey: `0x${string}`
  // The RPC URL for the chain where the Safe is deployed.
  private rpcUrl: string
  // The chain identifier (as bigint). For example, Sepolia is 11155111n.
  private chainId: bigint

  private memeBaseChain: Chain

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
    this.safeAddress = safeAddress
    this.ownerPrivateKey = ownerPrivateKey
    this.rpcUrl = rpcUrl
    this.chainId = chainId
    this.memeBaseChain = {
      ...base,
      rpcUrls: {
        ...base.rpcUrls,
        custom: {
          http: [this.rpcUrl]
        }
      }
    }
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
    })
    return safeClient;
  }

  private async getProtocolKit() {
    const protocolKit = await Safe.init({
      provider: this.rpcUrl,
      // The Protocol Kit accepts an EIP-1193 compliant signer.
      // Depending on your setup, you might need to wrap your private key with a library such as ethers.Wallet.
      signer: this.ownerPrivateKey,
      safeAddress: this.safeAddress,
      // Optionally, you can add onchainAnalytics or other options here.
    });
    return protocolKit;
  }

  async getSafeBalance() {
    if (!protocolKitInstance) {
      throw new Error("Protocol Kit instance is not initialized");
    }
    const balance = await protocolKitInstance.getBalance();

    return balance;
  }

  async buildWalletTransaction(
    data: Hex,
    nonce: number,
  ){
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
  async sendTransactions(transactions: MetaTransactionData[]): Promise<TransactionReceipt> {
    const protocolKit = await this.getProtocolKit();

    const safeTransaction = await protocolKit.createTransaction({
      transactions: transactions,
      options: {
        baseGas: "0",
        safeTxGas: "500000",
        gasPrice: "1000000000",
      },
    });

    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    const signedSafeTransaction = await protocolKit.signTransaction(safeTransaction);

    const txResponse = await protocolKit.executeTransaction(signedSafeTransaction);
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
  const chainId = BigInt(runtime.getSetting("CHAIN_ID") as string);

  return new SafeClient(safeAddress, ownerPrivateKey, rpcUrl, chainId);
};




export const safeAccountProvider: Provider = {
  async get(
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<Boolean> {


    try {
      if (message.content.source=="token_decision") {
        try{
          JSON.parse(message.content.text);
        } catch(e) {
          elizaLogger.error("Failed to parse token decision");
          return false;
        }
      } else {
        return false;
      }
      // convert string to json in message.content.text
      const decision: Decision = JSON.parse(message.content.text);
      const to = runtime.getSetting("MEME_FACTORY_ADDRESS") as Address;
      const value: string = decision.amount.toString();

      const safeAccountClient = getSafeAccount(runtime);

      let data: EncodeFunctionDataReturnType | undefined = undefined;
      let safeTransactionData: MetaTransactionData | undefined = undefined;
      let safeTransaction: string | undefined = undefined;
      let safeTxHash: string | undefined = undefined;



      if (decision.action === "summon") {
        if (decision.tokenSupply && decision.tokenSupply<MIN_DEPLOY_VALUE) {
          decision.tokenSupply = MIN_DEPLOY_VALUE;
        }
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

      const sfc = await createSafeClient({
        provider: runtime.getSetting("BASE_LEDGER_RPC") as string,
        signer: runtime.getSetting("AGENT_EOA_PK") as string,
        safeAddress: runtime.getSetting("SAFE_ADDRESS") as string,
      });

      const nonce = await sfc.getNonce();

      if (!data || !nonce) {
        throw new Error("Data or nonce is missing");
      }

      const dataHex = await safeAccountClient.buildWalletTransaction(data, nonce);
      if (!dataHex) {
        throw new Error("Data hex is missing");
      }
      const transactions: MetaTransactionData[] = [{to: to, value: value, data: dataHex, operation: OperationType.Call}];

      const receipt = await safeAccountClient.sendTransactions(transactions);
      elizaLogger.log(receipt);

      const actionFailedMemory: Memory = {
        id: message.id,
        content: {
          text: "Transaction failed to execute",
          action: decision.action,
          hash: receipt.transactionHash,
        },
        roomId: message.roomId,
        userId: message.userId,
        agentId: runtime.agentId,
      };

      await runtime.messageManager.createMemory(actionFailedMemory);

      return false;
    } catch (error) {
      console.error("Error in wallet provider:", error);
      throw error;
    }
  },
};
