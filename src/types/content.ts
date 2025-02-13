import { z } from "zod";
import type { Content } from "@elizaos/core";
import { isAddress } from "viem";

export interface TwitterInteractionResultContent extends Content {
  action: string;
  tweet_id: string;
  text: string;
}

export const TwitterInteractionSchema = z.object({
  action: z
    .enum(["tweet", "like", "retweet", "reply", "quote", "follow"])
    .nullable(),
  tweet_id: z.string().nullable(),
  text: z.string().nullable(),
});

export interface TokenInteractionResultContent extends Content {
  action: string;
  tokenAddress: string;
  tokenName: string;
  tokenTicker: string;
  tokenNonce: bigint | undefined;
  tokenSupply: bigint | undefined;
  amount: bigint;
  tweet: string;
  newPersona: string | undefined;
}

export const TokenInteractionSchema = z.object({
  action: z.enum(["summon", "heart", "unleash", "collect", "purge", "burn"]),
  tokenAddress: z
    .string()
    .refine(isAddress, { message: "Invalid Token Address" }),
  tokenName: z.string().nullable(),
  tokenTicker: z.string().nullable(),
  tokenNonce: z.string(),
  tokenSupply: z.string().nullable(),
  amount: z.string(),
  tweet: z.string(),
  newPersona: z.string().nullable(),
});
