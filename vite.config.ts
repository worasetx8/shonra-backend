import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load env vars from .env files and process.env (for Docker build)
  const env = {
    ...loadEnv(mode, ".", ""),
    // Override with process.env if set (for Docker build args)
    VITE_API_URL: process.env.VITE_API_URL || loadEnv(mode, ".", "").VITE_API_URL,
    SERVER_URL: process.env.SERVER_URL || loadEnv(mode, ".", "").SERVER_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || loadEnv(mode, ".", "").GEMINI_API_KEY,
    VITE_BASE_PATH: process.env.VITE_BASE_PATH || loadEnv(mode, ".", "").VITE_BASE_PATH || '/backoffice'
  };

  return {
    base: env.VITE_BASE_PATH,
    server: {
      port: 5173,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: "http://localhost:3002",
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [react()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY || ""),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY || ""),
      "process.env.SERVER_URL": JSON.stringify(env.SERVER_URL || env.VITE_API_URL || "http://localhost:3002"),
      "import.meta.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL || env.SERVER_URL || "http://localhost:3002"),
      "import.meta.env.SERVER_URL": JSON.stringify(env.SERVER_URL || env.VITE_API_URL || "http://localhost:3002")
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, ".")
      }
    },
    build: {
      outDir: "dist",
      sourcemap: process.env.NODE_ENV === "development" // Only enable source maps in development
    }
  };
});
