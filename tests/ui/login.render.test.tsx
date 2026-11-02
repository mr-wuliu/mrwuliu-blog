import { describe, expect, it } from "vitest";
import { renderToString } from "hono/jsx/dom/server";
import LoginPage from "../../src/views/login";

describe("Login return navigation", () => {
  it.each(["zh", "en"] as const)("keeps the return destination when switching from %s", (lang) => {
    const next = "/posts/example#comments";
    const html = renderToString(<LoginPage lang={lang} nextPath={next} />);
    const path = `${lang === 'zh' ? '/en' : ''}/login?next=${encodeURIComponent(next)}`;
    expect(html).toContain(`href="${path}" class="lang-toggle"`);
    expect(html).toContain('id="login-resend-btn"');
    expect(html).not.toContain('/en/en/login');
  });
});
