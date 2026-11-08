import { defineConfig } from "tsdown";

export default defineConfig({
  outDir: "bin",
  entry: ["src/cli.ts"],
  format: "esm",
  clean: true,
  deps: {
    neverBundle: ["commander"],
  },
});
