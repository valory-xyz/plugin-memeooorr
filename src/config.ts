// Add configuration for enabled chains
export const CHAIN_CONFIG = {
  BASE_ENABLED: true, // Can be controlled via settings
};

export const ACTIONS = {
  START: "START",
  TWITTER_INTERACTION: "TWITTER_INTERACTION",
  TOKEN_DECISION: "TOKEN_DECISION",
  TOKEN_FUN: "TOKEN_FUN",
  TOKEN_POST: "TOKEN_POST",
};

export default {
  ACTIONS,
  CHAIN_CONFIG,
};

export const TOKEN_INTERACTION_CONFIG = {
  ACTIONS: ["summon", "heart", "unleash", "collect", "purge", "burn"],
  TICKER: "ETH",
};
