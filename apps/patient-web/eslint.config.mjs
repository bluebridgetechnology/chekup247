import nextConfig from "eslint-config-next/core-web-vitals";

const compilerRules = [
  "react-hooks/set-state-in-effect",
  "react-hooks/purity",
  "react-hooks/immutability",
  "react-hooks/incompatible-library",
  "react-hooks/refs",
  "react-hooks/preserve-manual-memoization",
  "react-hooks/set-state-in-render",
  "react-hooks/no-deriving-state-in-effects",
  "react-hooks/memo-dependencies",
  "react-hooks/memoized-effect-dependencies",
  "react-hooks/exhaustive-effect-dependencies",
  "react-hooks/capitalized-calls",
  "react-hooks/static-components",
  "react-hooks/use-memo",
  "react-hooks/void-use-memo",
  "react-hooks/globals",
  "react-hooks/error-boundaries",
];

const rules = {
  "react/no-unescaped-entities": "warn",
};

for (const rule of compilerRules) {
  rules[rule] = "warn";
}

const eslintConfig = [
  ...nextConfig,
  {
    rules,
  },
];

export default eslintConfig;
