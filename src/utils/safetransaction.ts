import {
  encodeFunctionData,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  Address,
} from "viem";
import { createPublicClient, http } from "viem";
import { gnosisSafeAbi } from "./gnosisSafeAbi"; // Assume ABI is stored separately

interface SafeTxParams {
  contractAddress: Address;
  to: Address;
  value: bigint;
  data: string;
  operation?: number;
  safeTxGas?: bigint;
  baseGas?: bigint;
  gasPrice?: bigint;
  gasToken?: Address;
  refundReceiver?: Address;
  safeNonce?: bigint;
  safeVersion?: string;
  chainId?: bigint;
}

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function getRawSafeTransactionHash(
  client: ReturnType<typeof createPublicClient>,
  {
    contractAddress,
    to,
    value,
    data,
    operation = 0,
    safeTxGas = 0n,
    baseGas = 0n,
    gasPrice = 0n,
    gasToken = NULL_ADDRESS,
    refundReceiver = NULL_ADDRESS,
    safeNonce,
    safeVersion,
    chainId,
  }: SafeTxParams,
): Promise<{ txHash: string }> {
  const safeContract = { address: contractAddress, abi: gnosisSafeAbi };

  if (!safeNonce) {
    safeNonce = await client.readContract({
      ...safeContract,
      functionName: "nonce",
    });
  }

  if (!safeVersion) {
    safeVersion = (await client.readContract({
      ...safeContract,
      functionName: "VERSION",
    })) as string;
  }

  if (!chainId) {
    chainId = await client.getChainId();
  }

  const safeVersionNum = parseFloat(safeVersion);
  const baseGasName = safeVersionNum >= 1.0 ? "baseGas" : "dataGas";

  const structuredData = {
    types: {
      EIP712Domain: [{ name: "verifyingContract", type: "address" }],
      SafeTx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "operation", type: "uint8" },
        { name: "safeTxGas", type: "uint256" },
        { name: baseGasName, type: "uint256" },
        { name: "gasPrice", type: "uint256" },
        { name: "gasToken", type: "address" },
        { name: "refundReceiver", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "SafeTx",
    domain: {
      verifyingContract: contractAddress,
    },
    message: {
      to,
      value,
      data,
      operation,
      safeTxGas,
      [baseGasName]: baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce: safeNonce,
    },
  };

  if (safeVersionNum >= 1.3) {
    structuredData.types.EIP712Domain.push({
      name: "chainId",
      type: "uint256",
    });
    structuredData.domain["chainId"] = chainId;
  }

  const encodedData = encodeAbiParameters(
    parseAbiParameters(
      "address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256",
    ),
    [
      to,
      value,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      safeNonce,
    ],
  );

  return { txHash: keccak256(encodedData) };
}

export function getPackedSignatures(
  owners: Address[],
  signaturesByOwner: Record<string, string>,
): string {
  const sortedOwners = owners.sort((a, b) => a.localeCompare(b));
  let signatures = "0x";
  sortedOwners.forEach((signer) => {
    if (signaturesByOwner[signer]) {
      signatures += signaturesByOwner[signer].replace(/^0x/, "");
    }
  });
  return signatures;
}
