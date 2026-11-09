import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Served from https://aidenfisherb.github.io/MoveMent/ on GitHub Pages.
export default defineConfig({
  base: "/MoveMent/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "MoveMent",
        short_name: "MoveMent",
        description: "Personal calorie, macro and workout tracker",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/MoveMent/",
        scope: "/MoveMent/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
