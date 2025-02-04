export interface MemeCoin {
  tokenName: string;
  tokenTicker: string;
  blockNumber: number;
  chain: string;
  tokenAddress: string;
  liquidity: number;
  heartCount: number;
  isUnleashed: boolean;
  isPurged: boolean;
  lpPairAddress: string;
  owner: string;
  timestamp: number;
  memeOnce: number;
  summonTime: number;
  unleashTime: number;
  tokenNonce: number;
}
});
