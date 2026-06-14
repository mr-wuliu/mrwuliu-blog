import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { appFetch } from "../helpers";
import { createDb } from "../../src/db";
import { rateLimits } from "../../src/db/schema";
import { generateOtp } from "../../src/services/auth";

const db = createDb(env.DB);
const authEnv = {
  JWT_SECRET: env.JWT_SECRET,
  RESEND_API_KEY: env.RESEND_API_KEY,
  MAIL_DOMAIN: env.MAIL_DOMAIN,
};

beforeEach(async () => {
  await db.delete(rateLimits);
});

function extractCookies(res: Response): Record<string, string> {
  const cookies: Record<string, string> = {};
  const raw = res.headers.get("set-cookie");
  if (!raw) return cookies;
  for (const cookieStr of raw.split(/,(?=\s*[\w-]+=)/)) {
    const match = cookieStr.match(/^([^=;]+)=([^;]+)/);
    if (match) cookies[match[1].trim()] = match[2].trim();
  }
  return cookies;
}

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function createPostForComments(): Promise<{ id: string; slug: string }> {
  const res = await appFetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Auth Test Post",
      content: "<p>Test content</p>",
      status: "published",
    }),
  });
  const body = await res.json();
  return { id: body.id, slug: body.slug };
}

describe("Auth API", () => {
  describe("POST /auth/otp/send", () => {
    it("returns 400 for missing email", async () => {
      const res = await appFetch("/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid email", async () => {
      const res = await appFetch("/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty email", async () => {
      const res = await appFetch("/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("enforces rate limiting (3 per 5 min)", async () => {
      const email = `ratelimit-${Date.now()}@test.com`;
      const ip = "unknown";
      const now = new Date().toISOString();
      await db.insert(rateLimits).values([
        { ip, action: "otp_send", createdAt: now },
        { ip, action: "otp_send", createdAt: now },
        { ip, action: "otp_send", createdAt: now },
      ]);

      const res = await appFetch("/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      expect(res.status).toBe(429);
    });
  });

  describe("POST /auth/otp/verify", () => {
    it("returns 400 for invalid email", async () => {
      const res = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad", code: "123456" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for non-6-digit code", async () => {
      const res = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", code: "12345" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 for invalid/expired code", async () => {
      const res = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "noverify@example.com",
          code: "000000",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("verifies valid OTP, creates new user, sets cookies", async () => {
      const email = `newuser-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);

      const res = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(email);
      expect(body.isNewUser).toBe(true);

      const cookies = extractCookies(res);
      expect(cookies["access_token"]).toBeDefined();
      expect(cookies["refresh_token"]).toBeDefined();
    });

    it("logs in existing user (isNewUser=false)", async () => {
      const email = `existing-${Date.now()}@example.com`;
      const { code: code1 } = await generateOtp(db, authEnv, email);
      await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code1 }),
      });

      const { code: code2 } = await generateOtp(db, authEnv, email);
      const res = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code2 }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isNewUser).toBe(false);
      expect(body.user.id).toBeDefined();
    });

    it("rejects reused (consumed) OTP code", async () => {
      const email = `reuse-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);

      const res1 = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      expect(res1.status).toBe(200);

      const res2 = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      expect(res2.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("returns null user when not authenticated", async () => {
      const res = await appFetch("/auth/me");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeNull();
    });

    it("returns user when authenticated", async () => {
      const email = `authme-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch("/auth/me", {
        headers: { Cookie: cookieHeader(cookies) },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).not.toBeNull();
      expect(body.user.email).toBe(email);
      expect(body.user.avatarSeed).toBe("");
      expect(body.user.avatarType).toBe("identicon");
      expect(body.user.avatarR2Key).toBe("");
      expect(body.user.avatarUrl).toBe("");
      expect(body.user.notifyOnReply).toBe(true);
    });
  });

  describe("PUT /auth/settings", () => {
    it("rejects unauthenticated request", async () => {
      const res = await appFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOnReply: false }),
      });
      expect(res.status).toBe(401);
    });

    it("rejects empty body (no updatable fields)", async () => {
      const email = `settings-empty-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("updates avatarSeed", async () => {
      const email = `settings-avatar-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify({ avatarSeed: "my-custom-seed" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.avatarSeed).toBe("my-custom-seed");

      const me = await appFetch("/auth/me", { headers: { Cookie: cookieHeader(cookies) } });
      const meBody = await me.json();
      expect(meBody.user.avatarSeed).toBe("my-custom-seed");
    });

    it("updates notifyOnReply preference", async () => {
      const email = `settings-notify-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify({ notifyOnReply: false }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.notifyOnReply).toBe(false);
    });

    it("updates name", async () => {
      const email = `settings-name-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify({ name: "New Nickname" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.name).toBe("New Nickname");

      const me = await appFetch("/auth/me", { headers: { Cookie: cookieHeader(cookies) } });
      const meBody = await me.json();
      expect(meBody.user.name).toBe("New Nickname");
    });

    it("rejects empty name", async () => {
      const email = `settings-name2-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify({ name: "   " }),
      });
      expect(res.status).toBe(400);
    });

    it("switches avatarType to gravatar and returns avatarUrl", async () => {
      const email = `settings-grav-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify({ avatarType: "gravatar" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.avatarType).toBe("gravatar");
      expect(body.user.avatarUrl).toContain("gravatar.com/avatar/");
    });

    it("rejects invalid avatarType", async () => {
      const email = `settings-type-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify({ avatarType: "bogus" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/avatar", () => {
    it("rejects unauthenticated request", async () => {
      const formData = new FormData();
      formData.append("file", new File(["x"], "a.png", { type: "image/png" }));
      const res = await appFetch("/auth/avatar", { method: "POST", body: formData });
      expect(res.status).toBe(401);
    });

    it("uploads avatar and sets avatarType to uploaded", async () => {
      const email = `avatar-upload-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const formData = new FormData();
      formData.append("file", new File(["fake-png-bytes"], "me.png", { type: "image/png" }));
      const res = await appFetch("/auth/avatar", {
        method: "POST",
        headers: { Cookie: cookieHeader(cookies) },
        body: formData,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.avatarType).toBe("uploaded");
      expect(body.user.avatarR2Key).toContain("uavatars/");
      expect(body.user.avatarUrl).toBe("/images/" + body.user.avatarR2Key);
    });

    it("rejects non-image file type", async () => {
      const email = `avatar-bad-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const formData = new FormData();
      formData.append("file", new File(["text"], "a.txt", { type: "text/plain" }));
      const res = await appFetch("/auth/avatar", {
        method: "POST",
        headers: { Cookie: cookieHeader(cookies) },
        body: formData,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/logout", () => {
    it("revokes refresh token, prevents future refresh", async () => {
      const email = `logout-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const logoutRes = await appFetch("/auth/logout", {
        method: "POST",
        headers: { Cookie: cookieHeader(cookies) },
      });
      expect(logoutRes.status).toBe(200);

      const refreshRes = await appFetch("/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookieHeader(cookies) },
      });
      expect(refreshRes.status).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("returns 401 without refresh token", async () => {
      const res = await appFetch("/auth/refresh", { method: "POST" });
      expect(res.status).toBe(401);
    });

    it("rotates refresh token and sets new cookies", async () => {
      const email = `refresh-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const refreshRes = await appFetch("/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookieHeader(cookies) },
      });
      expect(refreshRes.status).toBe(200);

      const newCookies = extractCookies(refreshRes);
      expect(newCookies["access_token"]).toBeDefined();
      expect(newCookies["refresh_token"]).toBeDefined();

      const oldRefresh = cookies["refresh_token"];
      const newRefresh = newCookies["refresh_token"];
      expect(oldRefresh).not.toBe(newRefresh);
    });

    it("rejects already-used refresh token (rotation)", async () => {
      const email = `replay-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const refresh1 = await appFetch("/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookieHeader(cookies) },
      });
      expect(refresh1.status).toBe(200);

      const refresh2 = await appFetch("/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookieHeader(cookies) },
      });
      expect(refresh2.status).toBe(401);
    });
  });

  describe("Comment moderation with auth", () => {
    it("anonymous comment rejected (login required)", async () => {
      const { id: postId } = await createPostForComments();

      const res = await appFetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: "Anon",
          content: "Test anonymous comment",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("registered user comment gets approved status (default config)", async () => {
      const { id: postId } = await createPostForComments();
      const email = `commenter-${Date.now()}@example.com`;
      const { code } = await generateOtp(db, authEnv, email);
      const loginRes = await appFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const cookies = extractCookies(loginRes);

      const res = await appFetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader(cookies),
        },
        body: JSON.stringify({
          authorName: "RegisteredUser",
          content: "Comment from registered user",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe("approved");
    });
  });
});
