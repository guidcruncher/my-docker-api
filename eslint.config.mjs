import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import unusedImports from "eslint-plugin-unused-imports"
import simpleImportSort from "eslint-plugin-simple-import-sort"

export default tseslint.config(
  //
  // 1. Global ignores (applies to ALL configs)
  //
  {
    ignores: [
      "dist/**",
      "scripts/**",
      "vitest.config.ts",
      "tests/**", // <-- exclude tests from lint
      "jest.config.cjs", // <-- exclude jest config
      "tailwind.config.js",
      "postcss.config.js",
      "components.d.ts",
    ],
  },

  //
  // 2. Base configs
  //
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  //
  // 3. Type‑checked TS files
  //
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-case-declarations": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
    },
  },

  //
  // 4. Config file override
  //
  {
    files: ["eslint.config.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {},
  },
)
