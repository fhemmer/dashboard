import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
  // Disable nested functions rule for test files (vitest/jest naturally nest describe/it/beforeEach)
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "sonarjs/no-nested-functions": "off",
    },
  },
]);

export default eslintConfig;
