import type { D1Database, R2Bucket, Fetcher } from "@cloudflare/workers-types"

type CloudflareEnv = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  API_KEY: string
  DISABLE_API_AUTH?: string
  TEST_MIGRATIONS: { name: string; queries: string[] }[]
}

// https://developers.cloudflare.com/workers/languages/typescript/#generate-types
declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends CloudflareEnv {}
    interface GlobalProps {
      mainModule: typeof import("./src/index")
    }
  }
}

declare global {
  interface Env extends CloudflareEnv {}
}
