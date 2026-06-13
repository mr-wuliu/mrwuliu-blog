import { describe, expect, it } from "vitest";
import { signJwt, verifyJwt, generateJti } from "../../src/utils/jwt";

const SECRET = "test-secret-key";

describe("signJwt + verifyJwt", () => {
  it("signs and verifies a valid access token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "user",
        type: "access",
        exp: now + 900,
      },
      SECRET,
    );

    expect(token.split(".")).toHaveLength(3);

    const claims = await verifyJwt(token, SECRET);
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe("user-123");
    expect(claims!.email).toBe("test@example.com");
    expect(claims!.type).toBe("access");
    expect(claims!.iat).toBeLessThanOrEqual(now + 1);
    expect(claims!.exp).toBe(now + 900);
  });

  it("signs and verifies a refresh token with jti", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      {
        sub: "user-456",
        email: "refresh@example.com",
        name: "Refresh User",
        role: "user",
        type: "refresh",
        jti: "test-jti-abc",
        exp: now + 2592000,
      },
      SECRET,
    );

    const claims = await verifyJwt(token, SECRET);
    expect(claims).not.toBeNull();
    expect(claims!.type).toBe("refresh");
    expect(claims!.jti).toBe("test-jti-abc");
  });

  it("rejects an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 100;
    const token = await signJwt(
      {
        sub: "user-expired",
        email: "expired@example.com",
        name: "Expired",
        role: "user",
        type: "access",
        exp: past,
      },
      SECRET,
    );

    const claims = await verifyJwt(token, SECRET);
    expect(claims).toBeNull();
  });

  it("rejects a token with wrong secret", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      {
        sub: "user-tampered",
        email: "tampered@example.com",
        name: "Tampered",
        role: "user",
        type: "access",
        exp: now + 900,
      },
      SECRET,
    );

    const claims = await verifyJwt(token, "wrong-secret");
    expect(claims).toBeNull();
  });

  it("rejects a tampered token (modified payload)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      {
        sub: "user-original",
        email: "original@example.com",
        name: "Original",
        role: "user",
        type: "access",
        exp: now + 900,
      },
      SECRET,
    );

    const parts = token.split(".");
    const tamperedToken = `${parts[0]}.${parts[1].slice(0, -4) + "AAAA"}.${parts[2]}`;

    const claims = await verifyJwt(tamperedToken, SECRET);
    expect(claims).toBeNull();
  });

  it("rejects a malformed token (not 3 parts)", async () => {
    const claims = await verifyJwt("not.a.valid.jwt.token", SECRET);
    expect(claims).toBeNull();
  });

  it("rejects an empty string", async () => {
    const claims = await verifyJwt("", SECRET);
    expect(claims).toBeNull();
  });

  it("admin role is preserved through sign/verify cycle", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      {
        sub: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        type: "access",
        exp: now + 900,
      },
      SECRET,
    );

    const claims = await verifyJwt(token, SECRET);
    expect(claims!.role).toBe("admin");
  });
});

describe("generateJti", () => {
  it("generates unique IDs", () => {
    const jti1 = generateJti();
    const jti2 = generateJti();
    const jti3 = generateJti();

    expect(jti1).not.toBe(jti2);
    expect(jti2).not.toBe(jti3);
    expect(jti1).not.toBe(jti3);
  });

  it("generates UUID-format strings", () => {
    const jti = generateJti();
    expect(jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
