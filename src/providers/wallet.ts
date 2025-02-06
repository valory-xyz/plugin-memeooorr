import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  encodeFunctionData,
  Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { IAgentRuntime, Provider, Memory, State } from "@elizaos/core";
import type {
  Address,
  WalletClient,
  PublicClient,
  Chain,
  HttpTransport,
  Account,
  PrivateKeyAccount,
  Client,
} from "viem";
import * as viemChains from "viem/chains";
import { toSafeSmartAccount } from "permissionless/accounts";
import { SmartAccountClient, createSmartAccountClient } from "permissionless";
import { SmartAccount } from "viem/account-abstraction";
import { memeFactoryAbi } from "../abi/memefactory";

import type { SupportedChain } from "../types";

type Decision = {
  action: "summon" | "heart" | "unleash" | "collect" | "purge" | "burn";
  tokenAddress: Address;
  tokenNonce: bigint;
  tokenName: string | null;
  tokenTicker: string | null;
  tokenSupply: bigint | null;
  amount: string;
  tweet: string;
  new_persona: string | null;
};

export class WalletProvider {
  private currentChain: SupportedChain = "base";
  chains: Record<string, Chain> = { base: viemChains.base };
  account: PrivateKeyAccount;
  bundlerUrl: string;
  SAFE_CONTRACT: Address;
  PROXY_FACTORY: Address;

  constructor(
    privateKey: `0x${string}`,
    bundlerUrl: string,
    safeContract: Address,
    proxyFactory: Address,
    chains?: Record<string, Chain>,
  ) {
    this.setAccount(privateKey);
    this.setChains(chains);
    this.bundlerUrl = bundlerUrl;
    this.SAFE_CONTRACT = safeContract;
    this.PROXY_FACTORY = proxyFactory;

    if (chains && Object.keys(chains).length > 0) {
      this.setCurrentChain(Object.keys(chains)[0] as SupportedChain);
    }
  }

  getAddress(): Address {
    return this.account.address;
  }

  getCurrentChain(): Chain {
    return this.chains[this.currentChain];
  }

  getPublicClient(
    chainName: SupportedChain,
  ): PublicClient<HttpTransport, Chain, Account | undefined> {
    const transport = this.createHttpTransport(chainName);

    const publicClient = createPublicClient({
      chain: this.chains[chainName],
      transport,
    });
    return publicClient;
  }

  getWalletClient(chainName: SupportedChain): WalletClient {
    const transport = this.createHttpTransport(chainName);

    const walletClient = createWalletClient({
      chain: this.chains[chainName],
      transport,
      account: this.account,
    });

    return walletClient;
  }

  async getsafeAccountClient(): Promise<{
    safeAccount: SmartAccount;
    smartSafeAccountClient: SmartAccountClient;
  }> {
    const transport = this.createHttpTransport("base");
    const publicClient = createPublicClient({
      chain: viemChains.base,
      transport,
    }) as Client;

    const safeAccount = await toSafeSmartAccount({
      client: publicClient,
      owners: [this.account],
      version: "1.4.1",
      safeSingletonAddress: this.SAFE_CONTRACT,
      safeProxyFactoryAddress: this.PROXY_FACTORY,
    });

    const smartSafeAccountClient = createSmartAccountClient({
      account: safeAccount,
      chain: viemChains.base,
      bundlerTransport: http(this.bundlerUrl),
    });

    return { safeAccount, smartSafeAccountClient };
  }

  getChainConfigs(chainName: SupportedChain): Chain {
    const chain = viemChains[chainName];

    if (!chain?.id) {
      throw new Error("Invalid chain name");
    }

    return chain;
  }

  async getWalletBalance(): Promise<string | null> {
    try {
      const client = this.getPublicClient(this.currentChain);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
  }

  async getWalletBalanceForChain(
    chainName: SupportedChain,
  ): Promise<string | null> {
    try {
      const client = this.getPublicClient(chainName);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
  }

  private setAccount = (pk: `0x${string}`) => {
    this.account = privateKeyToAccount(pk);
  };

  private setChains = (chains?: Record<string, Chain>) => {
    if (!chains) {
      return;
    }
    for (const chain of Object.keys(chains)) {
      this.chains[chain] = chains[chain];
    }
  };

  private setCurrentChain = (chain: SupportedChain) => {
    this.currentChain = chain;
  };

  private createHttpTransport = (chainName: SupportedChain) => {
    const chain = this.chains[chainName];

    if (chain.rpcUrls.custom) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };

  static genChainFromName(
    chainName: string,
    customRpcUrl?: string | null,
  ): Chain {
    const baseChain = viemChains[chainName];

    if (!baseChain?.id) {
      throw new Error("Invalid chain name");
    }

    const viemChain: Chain = customRpcUrl
      ? {
          ...baseChain,
          rpcUrls: {
            ...baseChain.rpcUrls,
            custom: {
              http: [customRpcUrl],
            },
          },
        }
      : baseChain;

    return viemChain;
  }
}

const genChainsFromRuntime = (
  runtime: IAgentRuntime,
): Record<string, Chain> => {
  const chainNames = ["gnosis", "base"];
  const chains = {};

  for (const chainName of chainNames) {
    const rpcUrl = runtime.getSetting(
      `ETHEREUM_PROVIDER_${chainName.toUpperCase()}`,
    );
    const chain = WalletProvider.genChainFromName(chainName, rpcUrl);
    chains[chainName] = chain;
  }

  return chains;
};

export const initWalletProvider = (runtime: IAgentRuntime) => {
  const privateKey = runtime.getSetting("VIEM_BASE_PRIVATE_KEY");
  const bundlerBaseUrl = runtime.getSetting("BUNDLER_BASE_URL");
  const SAFE_CONTRACT: Address = runtime.getSetting("SAFE_CONTRACT") as Address;
  const PROXY_FACTORY: Address = runtime.getSetting("PROXY_FACTORY") as Address;
  if (!privateKey) {
    throw new Error("Local pvt key is missing");
  }

  const chains = genChainsFromRuntime(runtime);

  return new WalletProvider(
    privateKey as Address,
    bundlerBaseUrl,
    SAFE_CONTRACT,
    PROXY_FACTORY,
    chains,
  );
};

export const safeWalletProvider: Provider = {
  async get(
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<Boolean> {
    try {
      // convert string to json in message.content.text
      const decision: Decision = JSON.parse(message.content.text);

      const walletProvider = initWalletProvider(runtime);
      const address = walletProvider.getAddress();

      const { safeAccount, smartSafeAccountClient } =
        await walletProvider.getsafeAccountClient();

      let data: Hex | undefined = undefined;

      if (decision.action === "summon") {
        data = encodeFunctionData({
          abi: memeFactoryAbi,
          functionName: "summonThisMeme",
          args: [
            decision.tokenName,
            decision.tokenTicker,
            decision.tokenSupply,
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

      const hash = await smartSafeAccountClient.sendTransaction({
        account: safeAccount,
        chain: walletProvider.getCurrentChain(),
        to: runtime.getSetting("MEME_FACTORY_ADDRESS") as Address,
        data,
        value: 0n,
        kzg: undefined,
      });

      return true;
    } catch (error) {
      console.error("Error in Arthera wallet provider:", error);
      throw error;
    }
  },
};
