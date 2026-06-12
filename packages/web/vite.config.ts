import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    outDir: "../backend/dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/__api": "http://127.0.0.1:6678",
      "/__ws__": {
        target: "ws://127.0.0.1:6678",
        ws: true,
      },
    },
  },
});
