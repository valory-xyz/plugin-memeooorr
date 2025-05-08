import { z } from "zod";
import { isAddress } from "viem";

/**
 * Schema for Twitter interaction requests
 */
export const TwitterInteractionRequestSchema = z.object({
  action: z
    .enum(["tweet", "like", "retweet", "reply", "quote", "follow"])
    .nullable(),
  tweet_id: z.string().nullable(),
  text: z.string().nullable(),
});

/**
 * Type for Twitter interaction requests
 */
export type TwitterInteractionRequest = z.infer<typeof TwitterInteractionRequestSchema>;

/**
 * Schema for token interaction requests
 */
export const TokenInteractionRequestSchema = z.object({
  action: z.enum(["summon", "heart", "unleash", "collect", "purge", "burn"]),
  tokenAddress: z.string().refine((val) => val === "" || isAddress(val), {
    message: "Invalid Token Address",
  }),
  tokenName: z.string(),
  tokenTicker: z.string(),
  tokenNonce: z.string().or(z.literal("")),
  tokenSupply: z.string().or(z.literal("")),
  amount: z.string().or(z.literal("0")),
  tweet: z.string().or(z.literal("")),
  newPersona: z.string().nullable(),
});

/**
 * Type for token interaction requests
 */
export type TokenInteractionRequest = z.infer<typeof TokenInteractionRequestSchema>;

/**
 * Schema for token transfer requests
 */
export const TokenTransferRequestSchema = z.object({
  tokenAddress: z.string().refine(isAddress, {
    message: "Invalid token address",
  }),
  toAddress: z.string().refine(isAddress, {
    message: "Invalid recipient address",
  }),
  amount: z.string().min(1, "Amount is required"),
  fromAddress: z
    .string()
    .refine((val) => val === "" || isAddress(val), {
      message: "Invalid sender address",
    })
    .optional(),
});

/**
 * Type for token transfer requests
 */
export type TokenTransferRequest = z.infer<typeof TokenTransferRequestSchema>;