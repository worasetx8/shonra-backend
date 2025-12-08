import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
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
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.SERVER_URL": JSON.stringify(env.SERVER_URL || "http://localhost:3002"),
      "import.meta.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL || env.SERVER_URL || "http://localhost:3002"),
      "import.meta.env.SERVER_URL": JSON.stringify(env.SERVER_URL || "http://localhost:3002")
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, ".")
      }
    },
    build: {
      outDir: "dist",
      sourcemap: true
    }
  };
});
