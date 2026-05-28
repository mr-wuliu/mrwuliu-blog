import { describe, expect, it } from "vitest";
import {
  langPath,
  otherLang,
  htmlLang,
  t,
  formatDateLang,
} from "../../src/i18n";
import type { Lang } from "../../src/i18n";

describe("langPath", () => {
  it("preserves root path for Chinese", () => {
    expect(langPath("/", "zh")).toBe("/");
  });

  it("does NOT produce trailing slash for English root", () => {
    expect(langPath("/", "en")).toBe("/en");
  });

  it("does NOT produce trailing slash before query string", () => {
    expect(langPath("/?page=2", "en")).toBe("/en?page=2");
  });

  it("prepends /en for regular English paths", () => {
    expect(langPath("/writings", "en")).toBe("/en/writings");
  });

  it("prepends /en for nested paths", () => {
    expect(langPath("/posts/my-post", "en")).toBe("/en/posts/my-post");
  });

  it("prepends /en for paths with trailing query params", () => {
    expect(langPath("/tags/test?page=1", "en")).toBe("/en/tags/test?page=1");
  });

  it("preserves Chinese paths unchanged", () => {
    expect(langPath("/writings", "zh")).toBe("/writings");
    expect(langPath("/posts/test", "zh")).toBe("/posts/test");
  });

  it("never produces /en/ in any output", () => {
    const paths = ["/", "/?page=1", "/?q=hello&sort=date", "/?page=2&limit=10"];
    for (const p of paths) {
      const result = langPath(p, "en");
      expect(result).not.toContain("/en/");
    }
  });
});

describe("otherLang", () => {
  it("returns 'en' for Chinese", () => {
    expect(otherLang("zh")).toBe("en");
  });

  it("returns 'zh' for English", () => {
    expect(otherLang("en")).toBe("zh");
  });
});

describe("htmlLang", () => {
  it("returns 'zh-CN' for Chinese", () => {
    expect(htmlLang("zh")).toBe("zh-CN");
  });

  it("returns 'en' for English", () => {
    expect(htmlLang("en")).toBe("en");
  });
});

describe("t", () => {
  it("returns Chinese translation", () => {
    const result = t("zh", "nav.writings");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns English translation", () => {
    const result = t("en", "nav.writings");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns key for missing translations", () => {
    expect(t("zh", "nonexistent.key.path")).toBe("nonexistent.key.path");
  });
});

describe("formatDateLang", () => {
  it("formats Chinese date", () => {
    const result = formatDateLang("2024-01-15T00:00:00Z", "zh");
    expect(result).toContain("2024");
    expect(result).toMatch(/\d{4}年\d{2}月\d{2}日/);
  });

  it("formats English date", () => {
    const result = formatDateLang("2024-01-15T00:00:00Z", "en");
    expect(result).toContain("2024");
    expect(result).toContain("January");
  });

  it("returns empty string for null", () => {
    expect(formatDateLang(null, "zh")).toBe("");
    expect(formatDateLang(null, "en")).toBe("");
  });
});

describe("langPath — round-trip consistency", () => {
  it("zh → en toggle preserves the path", () => {
    const currentPath = "/posts/hello";
    const zhPath = langPath(currentPath, "zh" as Lang);
    const enPath = langPath(currentPath, "en" as Lang);
    expect(zhPath).toBe("/posts/hello");
    expect(enPath).toBe("/en/posts/hello");
  });

  it("homepage round-trip has no trailing slash in either direction", () => {
    const zhHome = langPath("/", "zh");
    const enHome = langPath("/", "en");
    expect(zhHome).toBe("/");
    expect(enHome).toBe("/en");
    expect(zhHome.endsWith("//")).toBe(false);
    expect(enHome.endsWith("/en/")).toBe(false);
  });
});
