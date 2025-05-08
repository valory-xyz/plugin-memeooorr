import { TokenAction } from "../domain/token";
import { TwitterAction } from "../domain/twitter";

/**
 * Base response interface
 */
export interface BaseResponse {
  success: boolean;
  timestamp: number;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Twitter interaction response
 */
export interface TwitterInteractionResponse extends BaseResponse {
  action: TwitterAction;
  tweet_id?: string;
  text?: string;
  username?: string;
  metrics?: {
    views?: number;
    likes?: number;
    retweets?: number;
    quotes?: number;
  };
}

/**
 * Token interaction response
 */
export interface TokenInteractionResponse extends BaseResponse {
  action: TokenAction;
  tokenAddress?: string;
  tokenName?: string;
  tokenTicker?: string;
  tokenNonce?: string;
  amount?: string;
  transactionHash?: string;
}

/**
 * Token list response
 */
export interface TokenListResponse extends BaseResponse {
  tokens: Array<{
    tokenName: string;
    tokenTicker: string;
    tokenAddress: string;
    heartCount: string;
    memeNonce: string;
    availableActions: TokenAction[];
  }>;
  totalCount: number;
}

/**
 * Token balance response
 */
export interface TokenBalanceResponse extends BaseResponse {
  balances: Array<{
    tokenAddress: string;
    tokenName: string;
    tokenSymbol: string;
    balance: string;
    formattedBalance: string;
    decimals: number;
  }>;
  totalTokens: number;
}

/**
 * Transaction response
 */
export interface TransactionResponse extends BaseResponse {
  transactionHash: string;
  blockNumber?: number;
  from: string;
  to: string;
  value: string;
  status?: 'pending' | 'confirmed' | 'failed';
}