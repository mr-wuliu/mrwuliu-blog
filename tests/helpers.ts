import { exports } from "cloudflare:workers";

const BASE_URL = "http://localhost";

export function appFetch(path: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(new URL(path, BASE_URL), init));
}
