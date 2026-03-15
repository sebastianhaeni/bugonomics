import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [],
  server: {
    port: 4600,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
