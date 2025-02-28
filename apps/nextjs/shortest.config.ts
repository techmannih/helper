import type { ShortestConfig } from "@antiwork/shortest";

export default {
  headless: false,
  baseUrl: `http://localhost:${process.env.WEB_PORT}`,
  testPattern: "tests/e2e/**/*.test.ts",
  ai: { provider: "anthropic" },
} satisfies ShortestConfig;
