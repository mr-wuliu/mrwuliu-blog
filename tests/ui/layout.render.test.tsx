import { describe, expect, it } from "vitest";
import { renderToString } from "hono/jsx/dom/server";
import Layout from "../../src/views/layout";

describe("Layout render", () => {
  it("renders theme selector and english nav links", () => {
    const html = renderToString(
      <Layout title="Test Page" lang="en" currentPath="/posts/test-post-001">
        <div id="page-body">body</div>
      </Layout>
    );

    expect(html).toContain('<html lang="en"');
    expect(html).toContain('class="theme-select"');
    expect(html).toContain('<option value="coffee">Coffee</option>');
    expect(html).toContain('href="/en/writings"');
    expect(html).toContain('lang-toggle-option-active');
  });

  it("renders chinese html lang and nav links", () => {
    const html = renderToString(
      <Layout title="测试页" lang="zh" currentPath="/posts/test-post-001">
        <div id="page-body">body</div>
      </Layout>
    );

    expect(html).toContain('<html lang="zh-CN"');
    expect(html).toContain('href="/writings"');
    expect(html).toContain('data-lang="zh">中文</span>');
  });
});
