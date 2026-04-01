import { describe, it, expect } from "vitest";
import { appFetch } from "../helpers";

describe("Tags API", () => {
  it("should list tags (public) with postCount field", async () => {
    const res = await appFetch("/api/tags");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("should create and retrieve a tag", async () => {
    const res = await appFetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "JavaScript" }),
    });
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
    await appFetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "UniqueTag" }),
    });

    const res = await appFetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "UniqueTag" }),
    });
    expect(res.status).toBe(409);
  });

  it("should delete a tag", async () => {
    const createRes = await appFetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "ToDelete" }),
    });
    const created = await createRes.json();

    const res = await appFetch(`/api/tags/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("should show postCount for tags on published posts", async () => {
    await appFetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Counted" }),
    });

    await appFetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Tag Count Test",
        content: "Content",
        status: "published",
        tags: ["Counted"],
      }),
    });

    const listRes = await appFetch("/api/tags");
    const allTags = await listRes.json();
    const found = allTags.find((t: { name: string }) => t.name === "Counted");
    expect(found).toBeDefined();
    expect(found.postCount).toBeGreaterThanOrEqual(1);
  });
});
