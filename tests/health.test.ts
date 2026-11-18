import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/server/app.js";
test("сервер отвечает на проверку состояния", async () => {
  const app = await buildApp({ databasePath: ":memory:" });
  try {
    assert.equal(
      (await app.inject("/api/projects/not-a-uuid")).statusCode,
      400,
    );
    const response = await app.inject("/api/health");
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
  } finally {
    await app.close();
  }
});
