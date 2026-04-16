import { exports } from "cloudflare:workers";

const BASE_URL = "http://localhost";
const TEST_API_KEY = "test-api-key-for-integration-tests";

export function appFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (path.startsWith("/api")) {
    headers.set("X-API-Key", TEST_API_KEY);
  }
  return exports.default.fetch(new Request(new URL(path, BASE_URL), { ...init, headers }));
}
