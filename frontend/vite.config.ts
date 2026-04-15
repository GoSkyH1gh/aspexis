import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    VitePWA({
      registerType: "prompt",
      workbox: {
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/],
      },
      manifest: {
        name: "Aspexis",
        short_name: "Aspexis",
        description: "A minecraft player lookup tool",
        theme_color: "#3D356F",
        background_color: "#41284e",
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
    visualizer({ open: false, json: true, filename: "stats.json" }) as any,
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui') || id.includes('radix-ui')) return 'vendor-radix';
            if (id.includes('framer-motion') || id.includes('motion/react') || id.includes('motion-utils') || id.includes('motion-dom')) return 'vendor-motion';
          }
        }
      }
    }
  }
});
