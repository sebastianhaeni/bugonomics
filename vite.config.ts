import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  plugins: [],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/main.ts",
        "src/app/audioController.ts",
        "src/game/types.ts",
      ],
    },
  },
  server: {
    port: 4600,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
