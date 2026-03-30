import { describe, it, expect } from "vitest";
import { appFetch, getAdminCookie, withAuth } from "../helpers";

describe("Posts API", () => {
  it("should create a post with tags (auth required)", async () => {
    const cookie = await getAdminCookie();
    const res = await appFetch("/api/posts", withAuth(cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Post",
        content: "Hello world",
        status: "draft",
        tags: ["test", "blog"],
      }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Test Post");
    expect(body.status).toBe("draft");
    expect(body.slug).toBeDefined();
    expect(body.tags).toHaveLength(2);
  });

  it("should list posts with pagination", async () => {
    const cookie = await getAdminCookie();
    const res = await appFetch("/api/posts", withAuth(cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toBeDefined();
    expect(typeof body.total).toBe("number");
    expect(body.page).toBeDefined();
  });

  it("should get, update, and delete a single post", async () => {
    const cookie = await getAdminCookie();

    // Create
    const createRes = await appFetch("/api/posts", withAuth(cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "CRUD Post", content: "Original", status: "draft" }),
    }));
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    // Read
    const getRes = await appFetch(`/api/posts/${created.id}`, withAuth(cookie));
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe(created.id);

    // Update
    const updateRes = await appFetch(`/api/posts/${created.id}`, withAuth(cookie, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Post", status: "published" }),
    }));
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.title).toBe("Updated Post");
    expect(updated.status).toBe("published");
    expect(updated.publishedAt).toBeDefined();

    // Delete
    const deleteRes = await appFetch(`/api/posts/${created.id}`, withAuth(cookie, { method: "DELETE" }));
    expect(deleteRes.status).toBe(200);
    const deleted = await deleteRes.json();
    expect(deleted.success).toBe(true);

    // Verify deleted
    const goneRes = await appFetch(`/api/posts/${created.id}`, withAuth(cookie));
    expect(goneRes.status).toBe(404);
  });

  it("should reject unauthenticated access", async () => {
    const res = await appFetch("/api/posts");
    expect(res.status).toBe(401);
  });

  it("should return 404 for non-existent post", async () => {
    const cookie = await getAdminCookie();
    const res = await appFetch("/api/posts/nonexistent-id", withAuth(cookie));
    expect(res.status).toBe(404);
  });
});
