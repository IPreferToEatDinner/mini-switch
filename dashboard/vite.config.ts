import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/__api": "http://127.0.0.1:6677",
      "/__ws__": {
        target: "ws://127.0.0.1:6677",
        ws: true,
      },
    },
  },
});
