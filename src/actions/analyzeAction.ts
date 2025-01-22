import {
  elizaLogger,
  type Action,
  generateText,
  ModelClass,
} from "@elizaos/core";
import { parseJSONObjectFromText } from "../utils/llmUtils";
import { FSM_CONFIG } from "../constants/fsmConfig";

export const analyzeAction: Action = {
  name: "ANALYZE_ACTION",
  description: "Analyzes tokens and decides the next FSM transition.",
  similes: ["EVALUATE", "ANALYZE", "DECIDE"],
  examples: [
    {
      input: { tokens: [{ name: "MemeCoin", address: "0xabc123" }] },
      output: { event: "DONE", action: "heart", tokenAddress: "0xabc123" },
    },
  ],
  validate: async (runtime, memory) => {
    return memory.content?.tokens?.length > 0;
  },
  handler: async (runtime, memory, state, params, callback) => {
    try {
      const tokens = memory.content?.tokens || [];
      const formattedTokens = tokens
        .map((token) => `Name: ${token.name}, Address: ${token.address}`)
        .join("\n");

      const prompt = `
      Analyze the following tokens and determine the next action for the FSM.
      Tokens:
      ${formattedTokens}

      Return the result as a JSON object with the structure:
      {
        "event": "DONE" | "NO_MAJORITY" | "ROUND_TIMEOUT" | "WAIT",
        "action": "heart" | "unleash" | "summon" | "none",
        "tokenAddress": "string"
      }
      `;

      // Generate response from LLM
      const llmResponse = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.LARGE,
      });

      elizaLogger.log("LLM Response:", llmResponse);

      // Parse the LLM response
      const analysisResult = parseJSONObjectFromText(llmResponse);
      if (!analysisResult) {
        throw new Error("Invalid LLM response");
      }

      // Callback with the result
      if (callback) {
        await callback({
          text: JSON.stringify(analysisResult),
          type: "analysis",
        });
      }

      // Update FSM state
      state.update("fsmEvent", analysisResult.event);
      state.update("fsmAction", analysisResult.action);
      state.update("tokenAddress", analysisResult.tokenAddress);

      return true;
    } catch (error) {
      elizaLogger.error("Failed to analyze action:", error);
      return false;
    }
  },
};
