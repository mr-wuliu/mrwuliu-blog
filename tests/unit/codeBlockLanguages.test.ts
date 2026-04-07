import { describe, expect, it } from "vitest";
import {
  CODE_BLOCK_LANGUAGES,
  normalizeCodeBlockLanguage,
} from "../../admin/src/components/codeBlockLanguages";

describe("codeBlockLanguages — mermaid support", () => {
  it("includes mermaid in the languages list", () => {
    const mermaid = CODE_BLOCK_LANGUAGES.find((l) => l.value === "mermaid");
    expect(mermaid).toBeDefined();
    expect(mermaid!.label).toBe("Mermaid");
  });

  it("normalizes 'mermaid' correctly", () => {
    expect(normalizeCodeBlockLanguage("mermaid")).toBe("mermaid");
  });

  it("normalizes 'MERMAID' (case-insensitive) correctly", () => {
    expect(normalizeCodeBlockLanguage("MERMAID")).toBe("mermaid");
  });

  it("normalizes '  mermaid  ' (whitespace-trimmed) correctly", () => {
    expect(normalizeCodeBlockLanguage("  mermaid  ")).toBe("mermaid");
  });

  it("returns empty string for unknown languages", () => {
    expect(normalizeCodeBlockLanguage("unknown-lang")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeCodeBlockLanguage("")).toBe("");
  });
});
