import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    server: {
      deps: {
        // Its imports (server-only, next/headers) must be mocked like the ones of the app
        inline: ["@omer-x/next-utils"],
      },
    },
    coverage: {
      include: ["src/**/*.ts"],
    },
  },
  plugins: [
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
