import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * Flat config, in the same shape as the wiki repo's.
 *
 * The point of having it at all: `next build` used to run with
 * `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` both set, so
 * nothing checked this code. Those are gone and `npm run verify` is the gate.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "out/**",
      "public/code/**",
      "manim_videos/**",
      "cobrapy/**",
      // Its own repository, cloned in here and pushed to github.com/Faheem107/model-wiki.
      // It carries its own eslint config and its own CI; checking it from this
      // repo reported 3,000 problems that belong to a different project.
      "model-wiki/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Unused args are how we document a callback's signature. Underscore
      // opts out, everything else is still an error.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // The Mol* and KaTeX interop surfaces are untyped, and pinning them to a
      // wrong hand-written type is worse than `any` at the boundary.
      "@typescript-eslint/no-explicit-any": "warn",
      // next/image cannot be used: the build sets images.unoptimized and most
      // sources are runtime-generated data URIs and Mol* canvases.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // Node scripts, not browser code.
    files: ["scripts/**/*.mjs", "*.config.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },
);
