import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { appFetch } from "../helpers";
import { createDb } from "../../src/db";
import { rateLimits, comments } from "../../src/db/schema";
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

async function createPublishedPost(): Promise<string> {
  const res = await appFetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Comment Post", content: "Content", status: "published" }),
  });
  const body = await res.json();
  return body.id;
}

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

async function loginUser(): Promise<{ cookies: Record<string, string>; name: string }> {
  const email = `commenter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const { code } = await generateOtp(db, authEnv, email);
  const loginRes = await appFetch("/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const loginBody = await loginRes.json();
  const cookies = extractCookies(loginRes);
  return { cookies, name: loginBody.user.name };
}

describe("Comments API", () => {
  it("should reject comment without login", async () => {
    const postId = await createPublishedPost();

    const res = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Great post!" }),
    });
    expect(res.status).toBe(401);
  });

  it("should create comment when logged in (approved by default)", async () => {
    const postId = await createPublishedPost();
    const { cookies, name } = await loginUser();

    const res = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ content: "Great post!" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("approved");
    expect(body.authorName).toBe(name);
    expect(body.content).toBe("Great post!");
  });

  it("should default comment notifyOnReply to user preference (true)", async () => {
    const postId = await createPublishedPost();
    const { cookies } = await loginUser();

    const res = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ content: "Subscribed by default" }),
    });
    expect(res.status).toBe(201);
    const created = await res.json();

    const [row] = await db.select().from(comments).where(eq(comments.id, created.id));
    expect(row?.notifyOnReply).toBe(true);

    await appFetch("/auth/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ notifyOnReply: false }),
    });

    const res2 = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ content: "Now unsubscribed" }),
    });
    expect(res2.status).toBe(201);
    const created2 = await res2.json();

    const [row2] = await db.select().from(comments).where(eq(comments.id, created2.id));
    expect(row2?.notifyOnReply).toBe(false);
  });

  it("should escape HTML in comment content", async () => {
    const postId = await createPublishedPost();
    const { cookies } = await loginUser();

    const res = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ content: "<b>bold</b> text" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toContain("&lt;b&gt;");
  });

  it("should only list approved comments publicly", async () => {
    const postId = await createPublishedPost();
    const { cookies } = await loginUser();

    await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ content: "Approved comment" }),
    });

    const res = await appFetch(`/api/posts/${postId}/comments`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].content).toBe("Approved comment");
  });

  it("should allow admin to moderate (reject) comments", async () => {
    const postId = await createPublishedPost();
    const { cookies } = await loginUser();

    const commentRes = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ content: "Moderate me" }),
    });
    const comment = await commentRes.json();

    const rejectRes = await appFetch(`/api/admin/comments/${comment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    expect(rejectRes.status).toBe(200);
    const rejected = await rejectRes.json();
    expect(rejected.status).toBe("rejected");

    const publicRes = await appFetch(`/api/posts/${postId}/comments`);
    const publicComments = await publicRes.json();
    expect(publicComments).toHaveLength(0);
  });

  it("should reject comment with empty content", async () => {
    const postId = await createPublishedPost();
    const { cookies } = await loginUser();

    const res = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ content: "" }),
    });
    expect(res.status).toBe(400);
  });
});
