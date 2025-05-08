import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"], // Ensure you're targeting CommonJS
  dts: true, // Generate declaration files,
  bundle: true,
  external: [
    "@elizaos/core",
    "dotenv", // Externalize dotenv to prevent bundling
    "fs", // Externalize fs to use Node.js built-in module
    "path", // Externalize other built-ins if necessary
    "http",
    "https",
    // Add other modules you want to externalize
    "onnxruntime-node",
    "zod",
    "agentkeepalive",
  ],
});
