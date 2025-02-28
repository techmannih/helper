import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";
import prettierRecommended from "eslint-plugin-prettier/recommended";

/** @type {Awaited<import('typescript-eslint').Config>} */
export default [
  {
    ignores: ["public/**"],
  },
  prettierRecommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      // TypeError: context.getAncestors is not a function
      "@next/next/no-duplicate-head": "off",
    },
  },
  prettierConfig,
];
