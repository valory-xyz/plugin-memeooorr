export const MAX_TWEETS_PER_HOUR = {
  trade: 10,
  market_search: 5,
};

export const TOKENS_QUERY = `
query Tokens {
  memeTokens {
    items {
      blockNumber
      chain
      heartCount
      id
      isUnleashed
      isPurged
      liquidity
      lpPairAddress
      owner
      timestamp
      memeNonce
      summonTime
      unleashTime
      memeToken
      name
      symbol
    }
  }
}
`;

export const PACKAGE_QUERY = `
query getPackages($package_type: String!) {
    units(where: {packageType: $package_type}) {
        id,
        packageType,
        publicId,
        packageHash,
        tokenId,
        metadataHash,
        description,
        owner,
        image
    }
}
`;

export const MIN_DEPLOY_VALUE = 1000000000000000000000000n;
export const MIN_SUMMON_VALUE = 1000000000000000n;
export const MAX_SUMMON_VALUE = 2000000000000000n;
export const MAX_HEART_VALUE = 20000000000000n;
