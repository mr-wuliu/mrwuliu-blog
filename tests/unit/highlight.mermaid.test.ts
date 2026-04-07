import { describe, expect, it } from "vitest";
import { highlightCode } from "../../src/utils/highlight";

describe("highlightCode — mermaid blocks", () => {
  it("wraps mermaid code blocks in mermaid-source div with data-mermaid attribute", () => {
    const input =
      '<pre><code class="language-mermaid">graph TD\n  A --&gt; B</code></pre>';
    const result = highlightCode(input);

    expect(result).toContain('class="mermaid-source"');
    expect(result).toContain('data-language="Mermaid"');
    expect(result).toContain("data-mermaid=");
    // Should contain the decoded mermaid source in data-mermaid
    expect(result).toContain("graph TD");
    expect(result).toContain("A");
    expect(result).toContain("B");
    // Should contain the original code in a pre/code for fallback
    expect(result).toContain('class="language-mermaid"');
    expect(result).toContain("<pre>");
    expect(result).toContain("<code");
  });

  it("escapes double quotes in data-mermaid attribute", () => {
    const input =
      '<pre><code class="language-mermaid">graph TD\n  A["Node with &quot;quotes&quot;"]</code></pre>';
    const result = highlightCode(input);

    expect(result).toContain('class="mermaid-source"');
    // The data-mermaid attribute should have &quot; for quotes
    expect(result).toMatch(/data-mermaid="[^"]*&quot;[^"]*"/);
  });

  it("does NOT run highlight.js on mermaid blocks", () => {
    const input =
      '<pre><code class="language-mermaid">graph TD\n  A--&gt;B</code></pre>';
    const result = highlightCode(input);

    // Should NOT have hljs class or data-language other than Mermaid
    expect(result).not.toContain("hljs");
    expect(result).not.toContain('data-language="JavaScript"');
  });

  it("still highlights non-mermaid code blocks normally", () => {
    const input =
      '<pre><code class="language-javascript">const x = 1;</code></pre>';
    const result = highlightCode(input);

    expect(result).not.toContain("mermaid-source");
    expect(result).toContain('data-language="JavaScript"');
    expect(result).toContain('class="language-javascript"');
  });

  it("handles empty mermaid blocks", () => {
    const input = '<pre><code class="language-mermaid"></code></pre>';
    const result = highlightCode(input);

    expect(result).toContain('class="mermaid-source"');
    expect(result).toContain('data-language="Mermaid"');
  });

  it("handles mermaid blocks with special HTML entities", () => {
    const input =
      '<pre><code class="language-mermaid">A[Hello &amp; World]</code></pre>';
    const result = highlightCode(input);

    expect(result).toContain('class="mermaid-source"');
    // The decoded code should be in the pre/code
    expect(result).toContain("A[Hello & World]");
  });
});
