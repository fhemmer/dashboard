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
  // TypeScript ESLint rules to match SonarQube findings
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // S7764: Prefer globalThis over global
      "no-restricted-globals": [
        "warn",
        {
          name: "global",
          message: "Use globalThis instead of global.",
        },
      ],
    },
  },
  // Disable nested functions rule for test files (vitest/jest naturally nest describe/it/beforeEach)
  // Also allow 'global' in test files since it's a common Node.js pattern for mocking
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**"],
    rules: {
      "sonarjs/no-nested-functions": "off",
      "no-restricted-globals": "off",
    },
  },
]);

export default eslintConfig;
