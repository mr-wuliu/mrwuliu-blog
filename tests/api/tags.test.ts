import { describe, it, expect } from "vitest";
import { appFetch, getAdminCookie, withAuth } from "../helpers";

describe("Tags API", () => {
  it("should list tags (public) with postCount field", async () => {
    const res = await appFetch("/api/tags");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("should create and retrieve a tag", async () => {
    const cookie = await getAdminCookie();
    const res = await appFetch("/api/tags", withAuth(cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "JavaScript" }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("JavaScript");
    expect(body.slug).toBe("javascript");

    const slugRes = await appFetch(`/api/tags/${body.slug}`);
    expect(slugRes.status).toBe(200);
    const tagData = await slugRes.json();
    expect(tagData.tag.name).toBe("JavaScript");
  });

  it("should reject duplicate tag name", async () => {
    const cookie = await getAdminCookie();
    await appFetch("/api/tags", withAuth(cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "UniqueTag" }),
    }));

    const res = await appFetch("/api/tags", withAuth(cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "UniqueTag" }),
    }));
    expect(res.status).toBe(409);
  });

  it("should delete a tag", async () => {
    const cookie = await getAdminCookie();
    const createRes = await appFetch("/api/tags", withAuth(cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "ToDelete" }),
    }));
    const created = await createRes.json();

    const res = await appFetch(`/api/tags/${created.id}`, withAuth(cookie, { method: "DELETE" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("should show postCount for tags on published posts", async () => {
    const cookie = await getAdminCookie();

    const tagRes = await appFetch("/api/tags", withAuth(cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Counted" }),
    }));
    const tag = await tagRes.json();

    await appFetch("/api/posts", withAuth(cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Tag Count Test",
        content: "Content",
        status: "published",
        tags: ["Counted"],
      }),
    }));

    const listRes = await appFetch("/api/tags");
    const allTags = await listRes.json();
    const found = allTags.find((t: { id: string }) => t.id === tag.id);
    expect(found).toBeDefined();
    expect(found.postCount).toBeGreaterThanOrEqual(1);
  });
});
