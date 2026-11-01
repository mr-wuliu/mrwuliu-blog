import { describe, it, expect } from "vitest";
import { appFetch } from "../helpers";

describe("Posts API", () => {
  it("should create a post with tags", async () => {
    const res = await appFetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Post",
        content: "Hello world",
        status: "draft",
        tags: ["test", "blog"],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Test Post");
    expect(body.status).toBe("draft");
    expect(body.slug).toBeDefined();
    expect(body.tags).toHaveLength(2);
  });

  it("persists covers, preserves them on unrelated edits, and supports replacement and removal", async () => {
    const createdRes = await appFetch('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Cover round trip', content: '', coverImageKey: 'images/portrait.webp' }),
    });
    expect(createdRes.status).toBe(201);
    const created = await createdRes.json();
    expect(created.coverImageKey).toBe('images/portrait.webp');
    for (const [patch, expected] of [
      [{ title: 'Updated title' }, 'images/portrait.webp'],
      [{ coverImageKey: 'images/landscape.webp' }, 'images/landscape.webp'],
      [{ coverImageKey: null }, null],
    ] as const) {
      const res = await appFetch(`/api/posts/${created.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      expect(res.status).toBe(200);
      expect((await res.json()).coverImageKey).toBe(expected);
      expect((await (await appFetch(`/api/posts/${created.id}`)).json()).coverImageKey).toBe(expected);
    }
  });

  it("should list posts with pagination", async () => {
    const res = await appFetch("/api/posts");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toBeDefined();
    expect(typeof body.total).toBe("number");
    expect(body.page).toBeDefined();
  });

  it("should get, update, and delete a single post", async () => {
    const createRes = await appFetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "CRUD Post", content: "Original", status: "draft" }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const getRes = await appFetch(`/api/posts/${created.id}`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updateRes = await appFetch(`/api/posts/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Post", status: "published" }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.title).toBe("Updated Post");
    expect(updated.status).toBe("published");
    expect(updated.publishedAt).toBeDefined();

    const deleteRes = await appFetch(`/api/posts/${created.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);
    const deleted = await deleteRes.json();
    expect(deleted.success).toBe(true);

    const goneRes = await appFetch(`/api/posts/${created.id}`);
    expect(goneRes.status).toBe(404);
  });

  it("should return 404 for non-existent post", async () => {
    const res = await appFetch("/api/posts/nonexistent-id");
    expect(res.status).toBe(404);
  });
});
