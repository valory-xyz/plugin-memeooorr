import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import type { Client, Transport, Chain, Account } from "viem";
import { memeFactoryAbi } from "./abi/memefactory";

export type MemeClient = Client<Transport, typeof base, undefined, undefined>;

const privateKey = generatePrivateKey();

export const owner = privateKeyToAccount(privateKey);

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
