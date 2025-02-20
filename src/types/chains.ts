import type {
  Account,
  Address,
  Chain,
  Hash,
  HttpTransport,
  PublicClient,
  WalletClient,
} from "viem";
import * as viemChains from "viem/chains";

const _SupportedChainList = Object.keys(viemChains) as Array<
  keyof typeof viemChains
>;
export type SupportedChain = (typeof _SupportedChainList)[number];

// Transaction types
export interface Transaction {
  hash: Hash;
  from: Address;
  to: Address;
  value: bigint;
  data?: `0x${string}`;
  chainId?: number;
}

// Chain configuration
export interface ChainMetadata {
  chainId: number;
  name: string;
  chain: Chain;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

export interface ChainConfig {
  chain: Chain;
  publicClient: PublicClient<HttpTransport, Chain, Account | undefined>;
  walletClient?: WalletClient;
}

// Action parameters
export interface TransferParams {
  fromChain: SupportedChain;
  toAddress: Address;
  amount: string;
  data?: `0x${string}`;
}

// Plugin configuration
export interface ArtheraPluginConfig {
  rpcUrl?: {
    arthera?: string;
  };
  secrets?: {
    ARTHERA_PRIVATE_KEY: string;
  };
  testMode?: boolean;
  multicall?: {
    batchSize?: number;
    wait?: number;
  };
}

export interface ProviderError extends Error {
  code?: number;
  data?: unknown;
}

export interface MemeCoin {
  tokenName: string;
  tokenTicker: string;
  blockNumber: number;
  chain: string;
  tokenAddress: string;
  liquidity: string;
  heartCount: string;
  isUnleashed: boolean;
  isPurged: boolean;
  lpPairAddress: string;
  owner: string;
  timestamp: number;
  memeNonce: string;
  summonTime: number;
  unleashTime: number;
  magaLaunched: boolean;
  availableActions: string[];
}

export interface TokensQuery {
  query: string;
}
