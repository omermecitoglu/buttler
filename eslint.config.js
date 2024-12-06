import omer from "@omer-x/eslint-config";

export default [
  ...omer,
  {
    rules: {
      "react/jsx-no-literals": "off",
    },
  },
  {
    ignores: [".next/*", "ui/*", "bin/*"],
  },
];
