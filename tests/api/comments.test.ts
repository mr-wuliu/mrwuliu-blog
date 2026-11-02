import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { appFetch } from "../helpers";
import { createDb } from "../../src/db";
import { rateLimits, comments, siteConfig } from "../../src/db/schema";
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

describe("Public article comment flow", () => {
  async function article() {
    const id = await createPublishedPost();
    const res = await appFetch(`/api/posts/${id}`);
    return res.json() as Promise<{ id: string; slug: string }>;
  }

  it.each(["", "/en"])("returns JSON for a successful submission on %s", async (prefix) => {
    const post = await article();
    const { cookies, name } = await loginUser();
    const res = await appFetch(`${prefix}/posts/${post.slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
      body: JSON.stringify({ content: "  Hello\n<b>reader</b>  " }),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBeNull();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const data = await res.json();
    expect(data).toMatchObject({ status: "approved", authorName: name });
    const [row] = await db.select().from(comments).where(eq(comments.id, data.id));
    expect(row.content).toBe("Hello\n&lt;b&gt;reader&lt;/b&gt;");
    expect(row.createdAt).toBe(data.createdAt);
  });

  it("returns 401 instead of a login redirect for an expired session", async () => {
    const post = await article();
    const res = await appFetch(`/posts/${post.slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Keep my draft" }),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "login_required" });
    expect(res.headers.get("Location")).toBeNull();
  });

  it("reports invalid content and unavailable replies without a success redirect", async () => {
    const post = await article();
    const { cookies } = await loginUser();
    for (const [body, error] of [
      [{ content: "   " }, "invalid_comment"],
      [{ content: "Reply", parentId: crypto.randomUUID() }, "parent_not_found"],
    ] as const) {
      const res = await appFetch(`/posts/${post.slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error });
    }
    expect(await db.select().from(comments).where(eq(comments.postId, post.id))).toHaveLength(0);
  });

  it("returns pending status while keeping a moderated comment out of the public page", async () => {
    const post = await article();
    const { cookies } = await loginUser();
    await db.insert(siteConfig).values({ key: "comment_registered_auto_approve", value: "false" })
      .onConflictDoUpdate({ target: siteConfig.key, set: { value: "false" } });
    try {
      const res = await appFetch(`/posts/${post.slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
        body: JSON.stringify({ content: "Waiting for review" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.status).toBe("pending");
      const page = await appFetch(`/posts/${post.slug}`);
      expect(await page.text()).not.toContain(`id="comment-${data.id}"`);
    } finally {
      await db.delete(siteConfig).where(eq(siteConfig.key, "comment_registered_auto_approve"));
    }
  });

  it("renews an expired access session before saving a comment", async () => {
    const post = await article();
    const { cookies } = await loginUser();
    const res = await appFetch(`/posts/${post.slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `refresh_token=${cookies.refresh_token}` },
      body: JSON.stringify({ content: "Still logged in" }),
    });
    expect(res.status).toBe(201);
    expect(extractCookies(res).access_token).toBeDefined();
    expect(extractCookies(res).refresh_token).not.toBe(cookies.refresh_token);
  });

  it("preserves a comment anchor for native form submissions", async () => {
    const post = await article();
    const { cookies } = await loginUser();
    const res = await appFetch(`/en/posts/${post.slug}/comments`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader(cookies) },
      body: new URLSearchParams({ content: "Native form" }),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toMatch(new RegExp(`^/en/posts/${post.slug}#comment-`));
  });
});
