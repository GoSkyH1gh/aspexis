import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Aspexis",
        description: "A minecraft player lookup tool",
        theme_color: "#F4F077",
        background_color: "#F4EAE3",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/aspexis-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/aspexis-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
});
