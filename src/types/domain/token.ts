import { Address } from "viem";

/**
 * Token action types
 */
export type TokenAction = "summon" | "heart" | "unleash" | "collect" | "purge" | "burn";

/**
 * Decision object for token interactions
 */
export interface TokenDecision {
  action: TokenAction;
  tokenAddress: string;
  tokenNonce: bigint;
  tokenName: string | null;
  tokenTicker: string | null;
  tokenSupply: bigint | null;
  amount: bigint;
  tweet: string;
  new_persona: string | null;
}

/**
 * Token summary information
 */
export interface TokenSummary {
  tokenName: string;
  tokenTicker: string;
  tokenAddress: string;
  heartCount: string;
  timestamp: number;
  memeNonce: string;
  availableActions: TokenAction[];
}

/**
 * Token interaction result
 */
export interface TokenInteractionResult {
  action: TokenAction;
  tokenAddress: string;
  tokenName: string;
  tokenTicker: string;
  tokenNonce: bigint | undefined;
  tokenSupply: bigint | undefined;
  amount: bigint;
  tweet: string;
  newPersona: string | undefined;
  success: boolean;
  transactionHash?: string;
  timestamp: number;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: bigint;
  decimals: number;
}

/**
 * Token transfer parameters
 */
export interface TokenTransferParams {
  tokenAddress: Address;
  toAddress: Address;
  amount: bigint;
  fromAddress?: Address;
}