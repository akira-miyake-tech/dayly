import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["src/__tests__/screens/**", "jsdom"],
      ["src/__tests__/integration/**", "jsdom"],
    ],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    env: {
      JWT_SECRET: "test-jwt-secret-for-testing-only",
      DATABASE_URL: "postgresql://postgres:password@localhost:5432/dayly_test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "node_modules/",
        ".next/",
        "vitest.config.ts",
        "vitest.setup.ts",
        "prisma/seed.ts",
        "src/test/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
