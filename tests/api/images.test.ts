import { describe, it, expect } from "vitest";
import { appFetch } from "../helpers";

describe("Images API", () => {
  it("should upload an image", async () => {
    const formData = new FormData();
    const file = new File(["fake png content"], "test.png", { type: "image/png" });
    formData.append("file", file);

    const res = await appFetch("/api/images", {
      method: "POST",
      body: formData,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.url).toContain("/images/");
    expect(body.mimeType).toBe("image/png");
  });

  it("should reject non-image file type", async () => {
    const formData = new FormData();
    const file = new File(["text content"], "test.txt", { type: "text/plain" });
    formData.append("file", file);

    const res = await appFetch("/api/images", {
      method: "POST",
      body: formData,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid file type");
  });

  it("should list uploaded images", async () => {
    const formData = new FormData();
    const file = new File(["png-data"], "list.png", { type: "image/png" });
    formData.append("file", file);

    await appFetch("/api/images", {
      method: "POST",
      body: formData,
    });

    const res = await appFetch("/api/images");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.images).toBeDefined();
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it("should reject upload without file", async () => {
    const res = await appFetch("/api/images", {
      method: "POST",
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });
});
