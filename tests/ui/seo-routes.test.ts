import { describe, expect, it } from "vitest";
import { appFetch } from "../helpers";

describe("SEO routes", () => {
  it("renders robots directives for private paths and AI crawlers", async () => {
    const res = await appFetch("/robots.txt");
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain("Disallow: /admin/");
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("Sitemap: http://localhost/sitemap.xml");
    expect(text).toContain("User-agent: OAI-SearchBot");
    expect(text).toContain("User-agent: ClaudeBot");
    expect(text).toMatch(/User-agent: ClaudeBot\nAllow: \/\nDisallow: \/admin\/\nDisallow: \/api\//);
  });

  it("renders llms.txt with canonical sections and recent posts", async () => {
    await appFetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "GEO Discoverability Test",
        content: "<p>Content for AI discovery.</p>",
        excerpt: "A post for llms.txt discovery.",
        status: "published",
      }),
    });

    const res = await appFetch("/llms.txt");
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(text).toContain("# mrwuliu's blog");
    expect(text).toContain("## Recent Posts");
    expect(text).toContain("GEO Discoverability Test");
    expect(text).toContain("## Content Use Guidance");
  });
});
