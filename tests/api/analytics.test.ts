import { describe, it, expect } from "vitest";
import { appFetch } from "../helpers";

describe("Analytics", () => {
  it("should track post views and deduplicate by visitor per day", async () => {
    const createRes = await appFetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Analytics Post",
        content: "Track me",
        status: "published",
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.slug).toBeDefined();

    const headers = {
      "User-Agent": "vitest-analytics-agent",
      "CF-Connecting-IP": "203.0.113.10",
    };

    const firstViewRes = await appFetch(`/posts/${created.slug}`, { headers });
    expect(firstViewRes.status).toBe(200);

    const secondViewRes = await appFetch(`/posts/${created.slug}`, { headers });
    expect(secondViewRes.status).toBe(200);

    const postsRes = await appFetch("/api/posts?limit=1000");
    expect(postsRes.status).toBe(200);
    const postsBody = await postsRes.json();
    const trackedPost = postsBody.posts.find((p: { id: string }) => p.id === created.id);

    expect(trackedPost).toBeTruthy();
    expect(trackedPost.viewCount).toBe(2);
    expect(trackedPost.uniqueViewCount).toBe(1);
  });
});
