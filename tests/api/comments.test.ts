import { describe, it, expect } from "vitest";
import { appFetch } from "../helpers";

async function createPublishedPost(): Promise<string> {
  const res = await appFetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Comment Post", content: "Content", status: "published" }),
  });
  const body = await res.json();
  return body.id;
}

describe("Comments API", () => {
  it("should submit a comment publicly (no auth)", async () => {
    const postId = await createPublishedPost();

    const res = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: "John", content: "Great post!" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.authorName).toBe("John");
    expect(body.content).toBe("Great post!");
  });

  it("should escape HTML in comments (XSS protection)", async () => {
    const postId = await createPublishedPost();

    const res = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName: "<script>alert('xss')</script>",
        content: "<b>bold</b> text",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.authorName).not.toContain("<script>");
    expect(body.authorName).toContain("&lt;");
    expect(body.content).toContain("&lt;b&gt;");
  });

  it("should only list approved comments publicly", async () => {
    const postId = await createPublishedPost();

    await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: "Alice", content: "Pending comment" }),
    });

    const res = await appFetch(`/api/posts/${postId}/comments`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("should allow admin to moderate comments", async () => {
    const postId = await createPublishedPost();

    const commentRes = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: "Bob", content: "Moderate me" }),
    });
    const comment = await commentRes.json();

    const approveRes = await appFetch(`/api/admin/comments/${comment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    expect(approveRes.status).toBe(200);
    const approved = await approveRes.json();
    expect(approved.status).toBe("approved");

    const publicRes = await appFetch(`/api/posts/${postId}/comments`);
    const publicComments = await publicRes.json();
    expect(publicComments).toHaveLength(1);
    expect(publicComments[0].content).toBe("Moderate me");
  });

  it("should reject comment with invalid data", async () => {
    const postId = await createPublishedPost();

    const res = await appFetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: "", content: "" }),
    });
    expect(res.status).toBe(400);
  });
});
