import { exports } from "cloudflare:workers";

const BASE_URL = "http://localhost";

export function appFetch(path: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(new URL(path, BASE_URL), init));
}

export async function getAdminCookie(): Promise<string> {
  const res = await appFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "testadmin", password: "testpassword123" }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/admin_token=([^;]+)/);
  if (!match) throw new Error("Failed to obtain admin cookie");
  return match[1];
}

export function withAuth(cookie: string, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("Cookie", `admin_token=${cookie}`);
  return { ...init, headers };
}
