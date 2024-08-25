import { defineConfig } from "tsup";

export default defineConfig({
  outDir: "bin",
  entry: ["src/cli.ts"],
  format: ["esm"],
  splitting: false,
  clean: true,
  external: ["commander"],
  esbuildPlugins: [
  ],
});
