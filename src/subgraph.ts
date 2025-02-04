import { elizaLogger, type IAgentRuntime } from "@elizaos/core";
import axios, { AxiosResponse } from "axios";

export interface PackageQueryVariables {
  package_type: string;
}

export interface PackageQuery {
  query: string;
  variables: PackageQueryVariables;
}

export interface TokensQuery {
  query: string;
}

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

const TOKENS_QUERY = `
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

const PACKAGE_QUERY = `
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

MEMEOOORR_DESCRIPTION_PATTERN = r"^Memeooorr @(\w+)$"

const HTTP_OK = 200;

/**
 * Get Subgraph url for querying
 * @param runtime Agent runtime environment
 * @returns Subgraph url
 * @throws Error if subgraph url is missing or invalid
 */
export function getSubgraphUrl(runtime?: IAgentRuntime): string {
  const subgraphUrl = runtime?.getSetting("MEME_SUBGRAPH_URL");
  if (!subgraphUrl) {
    throw new Error("No subgraph url configured");
  }

  return subgraphUrl;
}

/**
 * Get packages from subgraph
 * @param runtime Agent runtime environment
 * @param packageType Type of package
 * @returns Owner account
 */
async function getPackages(
  runtime?: IAgentRuntime,
  packageType: string,
): Promise<Optional<Dict> | null> {
  context.logger.info("Getting packages from Olas subgraph...");

  const headers = {
    "Content-Type": "application/json",
  };

  const data: PackageQuery = {
    query: PACKAGE_QUERY,
    variables: {
      package_type: packageType,
    },
  };

  try {
    context.logger.info("Getting agents from subgraph");
    const response: AxiosResponse = await axios.post(SUBGRAPH_URL, data, {
      headers,
    });

    if (response.status !== HTTP_OK) {
      context.logger.error(`Error getting agents from subgraph: ${response}`);
      return null;
    }

    return response.data; // Adjust this based on the actual response structure
  } catch (error) {
    elizaLogger.error(`Error getting agents from subgraph: ${error}`);
    return null;
  }
}

/**
 * Get tokens from subgraph
 * @param runtime Agent runtime environment
 * @returns Owner account
 */
export async function getTokens(
  runtime?: IAgentRuntime,
): Promise<Optional<Dict> | null> {
  elizaLogger.info("Getting tokens from Olas subgraph...");
  memeSubgraphUrl = getSubgraphUrl(runtime);

  const headers = {
    "Content-Type": "application/json",
  };

  const data: TokensQuery = {
    query: TOKENS_QUERY,
  };

  try {
    context.logger.info("Getting tokens from subgraph");
    const response: AxiosResponse = await axios.post(memeSubgraphUrl, data, {
      headers,
    });

    if (response.status !== HTTP_OK) {
      context.logger.error(`Error getting tokens from subgraph: ${response}`);
      return null;
    }

    const responseData = await response.json();
    const items = responseData.data.memeTokens.items;

    const filteredItems = items.filter(
      (t: any) => t.chain === this.getChainId() && parseInt(t.memeNonce) > 0,
    );

    const memeCoins: MemeCoin[] = filteredItems.map((item: any) => ({
      tokenName: item.tokenName,
      tokenTicker: item.tokenTicker,
      blockNumber: item.blockNumber,
      chain: item.chain,
      tokenAddress: item.tokenAddress,
      liquidity: item.liquidity,
      heartCount: item.heartCount,
      isUnleashed: item.isUnleashed,
      isPurged: item.isPurged,
      lpPairAddress: item.lpPairAddress,
      owner: item.owner,
      timestamp: item.timestamp,
      memeOnce: item.memeOnce,
      summonTime: item.summonTime,
      unleashTime: item.unleashTime,
      tokenNonce: item.tokenNonce,
    }));

    return memeCoins;
  } catch (error) {
    elizaLogger.error(`Error getting tokens from subgraph: ${error}`);
    return null;
  }
}

export async function getMemeooorrHandlesFromSubgraph(
  runtime?: IAgentRuntime,
): Promise<string[]> {
  const handles: string[] = [];
  const services: Optional<Dict> | null = await getPackages(runtime, "service");

  if (!services) {
    return handles;
  }

  for (const service of services.units) {
    const match = MEMEOOORR_DESCRIPTION_PATTERN.exec(service.description);

    if (!match) {
      continue;
    }

    const handle = match[1];

    // Exclude my own username
    const twitterUsername = runtime?.getSetting("TWITTER_USERNAME");
    if (handle === twitterUsername) {
      continue;
    }

    handles.push(handle);
  }

  elizaLogger.info(`Got Twitter handles: ${handles}`);
  return handles;
}
