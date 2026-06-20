azon import js from "@eslint/js";
import globals from "globals";

/** @type {import('eslint').Linter.Config} */
export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // Keep this intentionally lightweight; project can add stricter rules later.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];

