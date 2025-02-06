import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
} from "viem";
import { memeFactoryAbi } from "../abi/memefactory";
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
} from "viem";
import * as viemChains from "viem/chains";
import { toSafeSmartAccount } from "permissionless/accounts";
import { SmartAccountClient, createSmartAccountClient } from "permissionless";

import type { SupportedChain } from "../types";

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

  async getsafeAccountClient(): Promise<SmartAccountClient> {
    const transport = this.createHttpTransport("base");
    const publicClient = createPublicClient({
      cacheTime: 10_000,
      chain: viemChains.base,
      transport,
    });

    const safeAccount = await toSafeSmartAccount({
      client: publicClient,
      owners: [this.account],
      version: "1.4.1",
      safeSingletonAddress: this.SAFE_CONTRACT,
      safeProxyFactoryAddress: this.PROXY_FACTORY,
    });

    const smartSafeAccount = createSmartAccountClient({
      account: safeAccount,
      chain: viemChains.base,
      bundlerTransport: http(this.bundlerUrl),
    });

    return smartSafeAccount;
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
    _message: Memory,
    _state?: State,
  ): Promise<SmartAccountClient> {
    try {
      const walletProvider = initWalletProvider(runtime);
      const address = walletProvider.getAddress();

      const smartAccountClient: SmartAccountClient =
        await walletProvider.getsafeAccountClient();

      return smartAccountClient;
    } catch (error) {
      console.error("Error in Arthera wallet provider:", error);
      throw error;
    }
  },
};
