import { describe, expect, it } from "vitest";
import { generateSitemap } from "../../src/utils/sitemap";

describe("generateSitemap", () => {
  it("uses /en instead of /en/ for homepage hreflang", () => {
    const xml = generateSitemap([], [], [], "https://mrwuliu.top");

    expect(xml).toContain('<loc>https://mrwuliu.top/</loc>');
    expect(xml).toContain('hreflang="en" href="https://mrwuliu.top/en"');
    expect(xml).not.toContain('hreflang="en" href="https://mrwuliu.top/en/"');
  });
});
