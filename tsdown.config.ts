import { defineConfig } from "tsdown";

export default defineConfig({
  outDir: "bin",
  entry: ["src/cli.ts"],
  format: "esm",
  clean: true,
  // The "bin" of package.json needs a .js file, the default is .mjs
  fixedExtension: false,
  deps: {
    neverBundle: ["commander"],
  },
});
