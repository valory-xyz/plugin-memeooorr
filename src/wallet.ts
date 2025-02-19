import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, parseEventLogs } from "viem";
import { base } from "viem/chains";
import type { Client, HttpTransport } from "viem";
import { memeFactoryAbi } from "./abi/memefactory";
import { getTransactionReceipt } from "viem/actions";

export type MemeClient = Client<
  HttpTransport,
  typeof base,
  undefined,
  undefined
>;

interface TokenNonceData {
  summoner: string;
  tokenNonce: bigint;
  ethContributed: bigint;
}

const privateKey = generatePrivateKey();

export const owner = privateKeyToAccount(privateKey);

const getClient = (rpcUrl: string) => {
  return createPublicClient({
    chain: base,
    transport: http(),
    cacheTime: 10000,
  });
};

export const getBurnAmount = async (
  address: `0x${string}`,
  rpcUrl: string,
): Promise<bigint> => {
  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const data = await client.readContract({
    address: address,
    abi: memeFactoryAbi,
    functionName: "scheduledForAscendance",
  });

  return data;
};

export const getTokenNonce = async (
  txhash: `0x${string}`,
  rpcUrl: string,
): Promise<TokenNonceData | null> => {
  const clientEliza = getClient(rpcUrl);

  const tx_receipt = await getTransactionReceipt(clientEliza as Client, {
    hash: txhash,
  });

  const processesLogs = parseEventLogs({
    abi: memeFactoryAbi,
    logs: tx_receipt.logs,
  });

  if (!processesLogs) {
    console.log("Can't get summon data");
    return {
      summoner: "",
      tokenNonce: BigInt(""),
      ethContributed: BigInt(""),
    };
  }
  return {
    summoner: processesLogs[0].args["summoner"],
    tokenNonce: processesLogs[0].args["memeNonce"],
    ethContributed: processesLogs[0].args["amount"],
  };
};
