import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // ✅ Project rules: ban explicit `any`.
  // Type-driven "no-unsafe-*" rules now require full typed linting setup;
  // we can add them back later once parserOptions.project is configured.
  {
    rules: {
      // Hard stop: no explicit `any`
      "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: true }],

      // Text content / copy rules – too noisy for marketing pages
      "react/no-unescaped-entities": "off",

      // React 19 rule that flags all setState calls inside effects;
      // our existing patterns are safe and intentional.
      "react-hooks/set-state-in-effect": "off",

      // Exhaustive deps is helpful but very noisy with our current patterns.
      // We'll rely on code review + runtime behaviour instead.
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);

export default eslintConfig;
