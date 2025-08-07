import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/checkin": "http://localhost:3001",
      "/index-face": "http://localhost:3001",
      "/attendance": "http://localhost:3001",
      "/list-collections": "http://localhost:3001",
      // "/liveness-result": "http://localhost:3001",
      "/liveness-result": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/session": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/delete-face": "http://localhost:3001",
    },
  },
});
