import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Builds a sandbox copy of the app with sample data and no service worker,
// for previewing changes as a claude.ai artifact. Not deployed.
export default defineConfig({
  root: resolve(__dirname),
  base: "./",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../dist-preview"),
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: { output: { entryFileNames: "assets/app.js", chunkFileNames: "assets/[name].js", assetFileNames: "assets/[name][extname]" } }
  }
});
