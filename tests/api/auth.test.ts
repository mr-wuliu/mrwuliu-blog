import { describe, it, expect } from "vitest";
import { appFetch, getAdminCookie, withAuth } from "../helpers";

describe("Auth API", () => {
  it("should login with valid credentials and set cookie", async () => {
    const res = await appFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "testadmin", password: "testpassword123" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.username).toBe("testadmin");
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("admin_token=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("should reject invalid credentials", async () => {
    const res = await appFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "testadmin", password: "wrong" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });

  it("should reject missing fields", async () => {
    const res = await appFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("should reject unauthenticated access to /me", async () => {
    const res = await appFetch("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("should verify JWT and return user with valid cookie", async () => {
    const cookie = await getAdminCookie();
    const res = await appFetch("/api/auth/me", withAuth(cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.username).toBe("testadmin");
  });
});
