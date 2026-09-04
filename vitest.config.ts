import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        storageQuota: 5000,
      },
    },
    exclude: ["es/**", "**/node_modules/**"],
  },
});
