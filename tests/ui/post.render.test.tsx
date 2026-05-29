import { describe, expect, it } from "vitest";
import { renderToString } from "hono/jsx/dom/server";
import PostPage from "../../src/views/post";

describe("PostPage render", () => {
  it("renders post body divider placeholder and localized comment area", () => {
    const html = renderToString(
      <PostPage
        lang="en"
        post={{
          id: "p1",
          title: "Test Post 001",
          slug: "test-post-001",
          content: "raw",
          excerpt: "excerpt",
          coverImageKey: null,
          status: "published",
          hidden: false,
          pinned: false,
          publishedAt: "2026-04-03T00:00:00.000Z",
          createdAt: "2026-04-03T00:00:00.000Z",
          updatedAt: "2026-04-03T00:00:00.000Z",
          tags: [{ id: "t1", name: "infra", slug: "infra", createdAt: "2026-04-03T00:00:00.000Z" }],
        }}
        content={'<p id="post-body">Hello</p>'}
        headings={[{ level: 2, id: "intro", text: "Intro" }]}
        comments={[]}
        prev={{ slug: "test-post-000", title: "Test Post 000" }}
        next={{ slug: "test-post-002", title: "Test Post 002" }}
      />
    );

    expect(html).toContain('class="post-body-divider mb-3"');
    expect(html).toContain("Table of Contents");
    expect(html).toContain('data-t="post.leaveComment"');
    expect(html).toContain("Leave a Comment");
    expect(html).toContain('href="/en/posts/test-post-002"');
  });

  it("renders article SEO tags and structured data", () => {
    const html = renderToString(
      <PostPage
        lang="zh"
        post={{
          id: "p2",
          title: "SEO Test",
          slug: "seo-test",
          content: "raw",
          excerpt: "Search description",
          coverImageKey: "images/cover.webp",
          status: "published",
          hidden: false,
          pinned: false,
          publishedAt: "2026-04-03T00:00:00.000Z",
          createdAt: "2026-04-03T00:00:00.000Z",
          updatedAt: "2026-04-04T00:00:00.000Z",
          tags: [{ id: "t1", name: "SEO", slug: "seo", createdAt: "2026-04-03T00:00:00.000Z" }],
        }}
        content={'<p>Search engine content</p>'}
        headings={[]}
        comments={[]}
        prev={null}
        next={null}
      />
    );

    expect(html).toContain('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"');
    expect(html).toContain('<meta name="keywords" content="SEO"');
    expect(html).toContain('<meta property="article:tag" content="SEO"');
    expect(html).toContain('<meta property="og:image" content="https://mrwuliu.top/images/images/cover.webp"');
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('"keywords":"SEO"');
    expect(html).toContain('"inLanguage":"zh-CN"');
  });
});
