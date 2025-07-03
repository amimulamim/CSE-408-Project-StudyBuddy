import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// @ts-ignore
import history from "connect-history-api-fallback";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "spa-fallback",
      configureServer(server) {
        server.middlewares.use(
          history({
            disableDotRule: true,
            htmlAcceptHeaders: ["text/html", "application/xhtml+xml"],
          })
        );
      },
    },
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    coverage: {
      provider: "v8",
      reporter: ["text","lcov"],
      reportsDirectory: "coverage_reports",
      exclude: [
        "vitest.config.*",
        "vite.config.*",
        "**/jest.config.*",
        "**/*.config.*",  
        "**/coverage/**",
        "**/dist/**",
        "**/build/**",
        "**/*.conf**",
        "**/*.d.ts*",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
