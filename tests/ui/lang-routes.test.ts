import { describe, expect, it } from "vitest";
import { appFetch } from "../helpers";

describe("Language routes", () => {
  it("/en/ redirects to /en (trailing slash normalization)", async () => {
    const res = await appFetch("/en/", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/en");
  });

  it("/en returns 200", async () => {
    const res = await appFetch("/en");
    expect(res.status).toBe(200);
  });

  it("/ returns 200", async () => {
    const res = await appFetch("/");
    expect(res.status).toBe(200);
  });

  it("zh homepage language toggle links to /en (no trailing slash)", async () => {
    const res = await appFetch("/");
    const html = await res.text();
    const match = html.match(/href="([^"]+)"[^>]*class="[^"]*lang-toggle[^"]*"/);
    expect(match).toBeTruthy();
    expect(match![1]).toBe("/en");
    expect(match![1]).not.toContain("/en/");
  });

  it("en homepage language toggle links to / (no trailing slash)", async () => {
    const res = await appFetch("/en");
    const html = await res.text();
    const match = html.match(/href="([^"]+)"[^>]*class="[^"]*lang-toggle[^"]*"/);
    expect(match).toBeTruthy();
    expect(match![1]).toBe("/");
  });

  it("zh page nav links have no /en/ prefix", async () => {
    const res = await appFetch("/");
    const html = await res.text();
    const zhNavLinks = html.match(/href="\/writings"/g);
    expect(zhNavLinks!.length).toBeGreaterThan(0);
  });

  it("en page nav links have /en/ prefix", async () => {
    const res = await appFetch("/en");
    const html = await res.text();
    const enNavLinks = html.match(/href="\/en\/writings"/g);
    expect(enNavLinks!.length).toBeGreaterThan(0);
  });

  it("/en?query works without trailing slash redirect", async () => {
    const res = await appFetch("/en?page=2");
    expect(res.status).toBe(200);
  });
});
