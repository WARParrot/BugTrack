import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/server/app.js";
import { Email, User } from "../src/domain/user.js";
import {
  hashPassword,
  verifyPassword,
} from "../src/infrastructure/security.js";

test("Email и User сохраняют поведение исходных объектов", () => {
  assert.equal(new Email(" User@Example.org ").getValue(), "user@example.org");
  assert.throws(() => new Email("invalid"));
  const user = new User("Иван", new Email("u@example.org"), "hash");
  user.changePassword("new");
  assert.equal(user.getPasswordHash(), "new");
});
test("scrypt использует соль и проверяет пароль", async () => {
  const a = await hashPassword("password123");
  const b = await hashPassword("password123");
  assert.notEqual(a, b);
  assert.ok(await verifyPassword("password123", a));
  assert.equal(await verifyPassword("wrong", a), false);
});
test("регистрация, cookie-сессия, дубликат и ошибочный вход", async () => {
  const app = await buildApp({ databasePath: ":memory:" });
  try {
    assert.equal((await app.inject("/api/auth/me")).statusCode, 401);
    const payload = {
      fullName: "Тест",
      email: "user@example.org",
      password: "password123",
    };
    const registered = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload,
    });
    assert.equal(registered.statusCode, 201);
    assert.equal("passwordHash" in registered.json().user, false);
    const cookie = String(registered.headers["set-cookie"]).split(";")[0];
    assert.equal(
      (await app.inject({ url: "/api/auth/me", headers: { cookie } }))
        .statusCode,
      200,
    );
    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { cookie },
    });
    assert.equal(logout.statusCode, 204);
    assert.equal(
      (await app.inject({ url: "/api/auth/me", headers: { cookie } }))
        .statusCode,
      401,
    );
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/auth/register", payload }))
        .statusCode,
      409,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { email: payload.email, password: "wrong" },
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/auth/login", payload }))
        .statusCode,
      200,
    );
    const concurrent = await Promise.all(
      [1, 2].map(() =>
        app.inject({
          method: "POST",
          url: "/api/auth/register",
          payload: { ...payload, email: "race@example.org" },
        }),
      ),
    );
    assert.deepEqual(concurrent.map((r) => r.statusCode).sort(), [201, 409]);
  } finally {
    await app.close();
  }
});

test("production требует секрет и bootstrap администратора", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSecret = process.env.JWT_SECRET;
  const oldEmail = process.env.ADMIN_EMAIL;
  const oldPassword = process.env.ADMIN_PASSWORD;
  process.env.NODE_ENV = "production";
  delete process.env.JWT_SECRET;
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_PASSWORD;
  try {
    await assert.rejects(
      buildApp({ databasePath: ":memory:" }),
      /JWT_SECRET/,
    );
    process.env.JWT_SECRET = "x".repeat(32);
    await assert.rejects(
      buildApp({ databasePath: ":memory:" }),
      /ADMIN_EMAIL/,
    );
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
    if (oldEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = oldEmail;
    if (oldPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = oldPassword;
  }
});
