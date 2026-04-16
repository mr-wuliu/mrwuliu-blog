import path from "node:path";
import { readD1Migrations, cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrationsPath = path.join(__dirname, "migrations");
      const migrations = await readD1Migrations(migrationsPath);
      return {
        main: "./src/index.ts",
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            JWT_SECRET: "test-jwt-secret-for-integration-tests",
            ADMIN_USERNAME: "testadmin",
            ADMIN_PASSWORD: "testpassword123",
            API_KEY: "test-api-key-for-integration-tests",
          },
        },
      };
    }),
  ],
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
});
