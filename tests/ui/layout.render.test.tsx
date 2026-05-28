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

describe("Lang toggle button stability", () => {
  it("has fixed width and position attributes to prevent layout shift", () => {
    const html = renderToString(
      <Layout title="Test" lang="en" currentPath="/">
        <div>body</div>
      </Layout>
    );

    // The lang-toggle container must have the lang-toggle class (CSS sets width: 88px, position: relative)
    const toggleMatches = html.match(/class="lang-toggle"/g);
    expect(toggleMatches).toBeTruthy();
    expect(toggleMatches!.length).toBeGreaterThanOrEqual(1);
  });

  it("renders exactly two toggle options (EN and 中文) and one thumb", () => {
    const html = renderToString(
      <Layout title="Test" lang="en" currentPath="/">
        <div>body</div>
      </Layout>
    );

    // Extract the first lang-toggle block
    const toggleStart = html.indexOf('class="lang-toggle"');
    expect(toggleStart).toBeGreaterThan(-1);
    const toggleEnd = html.indexOf("</a>", toggleStart);
    expect(toggleEnd).toBeGreaterThan(toggleStart);
    const toggleBlock = html.slice(toggleStart, toggleEnd);

    // Must have exactly 2 options
    const options = toggleBlock.match(/class="lang-toggle-option/g);
    expect(options).toBeTruthy();
    expect(options!.length).toBe(2);

    // Must have exactly 1 thumb
    const thumbs = toggleBlock.match(/class="lang-toggle-thumb/g);
    expect(thumbs).toBeTruthy();
    expect(thumbs!.length).toBe(1);
  });

  it("active option and thumb text are consistent for zh", () => {
    const html = renderToString(
      <Layout title="Test" lang="zh" currentPath="/">
        <div>body</div>
      </Layout>
    );

    // zh active option should be zh
    expect(html).toContain('lang-toggle-option lang-toggle-option-active" data-lang="zh"');
    // zh thumb should show 中文 and be in end position
    expect(html).toContain('lang-toggle-thumb lang-toggle-thumb-end">中文');
  });

  it("active option and thumb text are consistent for en", () => {
    const html = renderToString(
      <Layout title="Test" lang="en" currentPath="/">
        <div>body</div>
      </Layout>
    );

    // en active option should be en
    expect(html).toContain('lang-toggle-option lang-toggle-option-active" data-lang="en"');
    // en thumb should show EN and NOT be in end position
    expect(html).toContain('lang-toggle-thumb">EN</span>');
    expect(html).not.toContain('lang-toggle-thumb lang-toggle-thumb-end">EN');
  });

  it("click handler uses __animateToggle instead of __applyLang to avoid double animation", () => {
    const html = renderToString(
      <Layout title="Test" lang="en" currentPath="/">
        <div>body</div>
      </Layout>
    );

    // The click handler should call __animateToggle for visual feedback
    expect(html).toContain("__animateToggle");
    // __applyLangPage should NOT call __applyLang (removed to prevent double animation)
    // Verify __applyLangPage does not contain the old __applyLang(nl) call
    const applyLangPageMatch = html.match(/function __applyLangPage[^}]+}/s);
    // The function should set __cur and lang directly instead of calling __applyLang
    expect(applyLangPageMatch).toBeTruthy();
    // __applyLangPage should NOT call __applyLang
    expect(applyLangPageMatch![0]).not.toMatch(/__applyLang\(nl\)/);
  });

  it("toggle href points to opposite language for zh", () => {
    const html = renderToString(
      <Layout title="Test" lang="zh" currentPath="/posts/slug-abc">
        <div>body</div>
      </Layout>
    );

    const match = html.match(/href="([^"]+)"[^>]*class="[^"]*lang-toggle[^"]*"/);
    expect(match).toBeTruthy();
    expect(match![1]).toBe("/en/posts/slug-abc");
  });

  it("toggle href points to opposite language for en", () => {
    const html = renderToString(
      <Layout title="Test" lang="en" currentPath="/posts/slug-abc">
        <div>body</div>
      </Layout>
    );

    const match = html.match(/href="([^"]+)"[^>]*class="[^"]*lang-toggle[^"]*"/);
    expect(match).toBeTruthy();
    expect(match![1]).toBe("/posts/slug-abc");
  });
});
