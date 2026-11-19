import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/server/app.js";
import { openDatabase } from "../src/infrastructure/database.js";
import { SqliteUserRepository } from "../src/infrastructure/users.js";
import { User, Email } from "../src/domain/user.js";
import { hashPassword } from "../src/infrastructure/security.js";

test("HTTP: роли, workflow, совместная работа, уведомления и сохранность после перезапуска", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bugtrack-http-"));
  const path = join(directory, "test.sqlite");
  const db = openDatabase(path);
  new SqliteUserRepository(db).save(
      User.admin(
        "Админ",
        new Email("admin@example.org"),
        await hashPassword("test-password123"),
      ),
  );
  db.close();
  let app = await buildApp({ databasePath: path });
  async function request(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    cookie?: string,
    payload?: object,
    expected = 200,
  ) {
    const response = await app.inject({
      method,
      url: "/api" + url,
      headers: cookie ? { cookie } : {},
      payload,
    });
    assert.equal(
      response.statusCode,
      expected,
      `${method} ${url}: ${response.body}`,
    );
    return response;
  }
  async function register(email: string) {
    const r = await request(
      "POST",
      "/auth/register",
      undefined,
      { fullName: email, email, password: "test-password123" },
      201,
    );
    return {
      cookie: String(r.headers["set-cookie"]).split(";")[0],
      user: r.json().user,
    };
  }
  try {
    await request("GET", "/projects", undefined, undefined, 401);
    const login = await request("POST", "/auth/login", undefined, {
      email: "admin@example.org",
      password: "test-password123",
    });
    const admin = String(login.headers["set-cookie"]).split(";")[0];
    assert.match(String(login.headers["set-cookie"]), /HttpOnly/i);
    assert.match(String(login.headers["set-cookie"]), /SameSite=Strict/i);
    const developer = await register("developer@example.org");
    const tester = await register("tester@example.org");
    const stranger = await register("stranger@example.org");
    await request(
      "POST",
      "/projects",
      developer.cookie,
      { name: "Нельзя", description: "" },
      403,
    );
    const project = (
      await request(
        "POST",
        "/projects",
        admin,
        { name: "Проверка", description: "Тестовый проект" },
        201,
      )
    ).json().project;
    const root = `/projects/${project.id}`;
    for (const [user, role] of [
      [developer, "DEVELOPER"],
      [tester, "TESTER"],
    ] as const)
      await request(
        "POST",
        `${root}/members`,
        admin,
        { email: user.user.email, role },
        201,
      );
    await request(
      "POST",
      `${root}/members`,
      developer.cookie,
      { email: stranger.user.email, role: "TESTER" },
      403,
    );
    await request(
      "POST",
      `${root}/members`,
      admin,
      { email: tester.user.email, role: "TESTER" },
      409,
    );
    await request("PATCH", `${root}/members/${tester.user.id}`, admin, {
      role: "DEVELOPER",
    });
    await request("PATCH", `${root}/members/${tester.user.id}`, admin, {
      role: "TESTER",
    });
    await request("GET", root, stranger.cookie, undefined, 403);
    await request("PUT", root + "/repository", admin, {
      name: "Исходники",
      url: "https://git.example.org/team/app",
    });
    await request(
      "PUT",
      root + "/repository",
      developer.cookie,
      { name: "Нельзя", url: "https://git.example.org/other" },
      403,
    );
    const t = (
      await request(
        "POST",
        root + "/tickets",
        tester.cookie,
        {
          title: "Ошибка оплаты",
          description: "Повторный запрос",
          priority: "HIGH",
        },
        201,
      )
    ).json().ticket;
    const ticket = `/tickets/${t.id}`;
    await request("GET", ticket, stranger.cookie, undefined, 403);
    await request(
      "POST",
      ticket + "/assign",
      tester.cookie,
      { userId: developer.user.id },
      403,
    );
    await request("POST", ticket + "/assign", admin, {
      userId: developer.user.id,
    });
    await request("POST", ticket + "/take", developer.cookie, {});
    await request(
      "PATCH",
      `${root}/members/${developer.user.id}`,
      admin,
      { role: "TESTER" },
      409,
    );
    await request(
      "DELETE",
      `${root}/members/${developer.user.id}`,
      admin,
      undefined,
      409,
    );
    await request("POST", ticket + "/take", developer.cookie, {}, 409);
    await request("PUT", ticket + "/priority", admin, { priority: "CRITICAL" });
    await request("PUT", ticket + "/deadline", admin, {
      deadline: "2030-01-01T12:00:00Z",
    });
    await request(
      "PUT",
      ticket + "/deadline",
      admin,
      { deadline: "invalid" },
      400,
    );
    const comment = (
      await request(
        "POST",
        ticket + "/comments",
        tester.cookie,
        { text: "Первый комментарий" },
        201,
      )
    ).json().comment;
    await request(
      "POST",
      ticket + "/comments",
      developer.cookie,
      { text: "Ответ разработчика", parentId: comment.id },
      201,
    );
    await request(
      "POST",
      ticket + "/comments",
      developer.cookie,
      { text: "Чужой parent", parentId: "missing" },
      400,
    );
    await request(
      "POST",
      ticket + "/attachments",
      tester.cookie,
      { type: "LOG", url: "javascript:alert(1)" },
      400,
    );
    await request(
      "POST",
      ticket + "/attachments",
      tester.cookie,
      { type: "LOG", url: "https://files.example.org/log.txt" },
      201,
    );
    await request("POST", ticket + "/submit-fix", developer.cookie, {
      url: "https://git.example.org/mr/1",
    });
    assert.equal(
      (await request("GET", ticket, tester.cookie)).json().ticket.status,
      "READY_FOR_REVIEW",
    );
    await request("POST", ticket + "/close", developer.cookie, {}, 403);
    await request("POST", ticket + "/reopen", tester.cookie, {
      reason: "Повторяется",
    });
    await request("POST", ticket + "/take", developer.cookie, {});
    await request("POST", ticket + "/submit-fix", developer.cookie, {
      url: "https://git.example.org/mr/2",
    });
    await request(
      "POST",
      "/releases",
      admin,
      { version: "1.0", releasedAt: "2026-11-18" },
      201,
    );
    await request("PUT", ticket + "/release", admin, { version: "1.0" });
    await request("POST", ticket + "/close", tester.cookie, {});
    await request("POST", ticket + "/archive", admin, {});
    await request(
      "POST",
      ticket + "/comments",
      tester.cookie,
      { text: "После архива запрещено" },
      409,
    );
    await request(
      "POST",
      ticket + "/comments",
      tester.cookie,
      { text: "Ответ после архива запрещен", parentId: comment.id },
      409,
    );
    await request("PUT", ticket + "/priority", admin, { priority: "LOW" }, 409);
    const notifications = (
      await request("GET", "/notifications", tester.cookie)
    ).json().notifications;
    assert.ok(notifications.length > 0);
    await request(
      "POST",
      `/notifications/${notifications[0].id}/read`,
      developer.cookie,
      {},
      404,
    );
    await request(
      "POST",
      `/notifications/${notifications[0].id}/read`,
      tester.cookie,
      {},
      204,
    );
    assert.equal(
      (await request("GET", "/notifications", stranger.cookie)).json()
        .notifications.length,
      0,
    );
    await request(
      "DELETE",
      `${root}/members/${developer.user.id}`,
      admin,
      undefined,
      204,
    );
    await request("GET", ticket, developer.cookie, undefined, 403);
    await app.close();
    app = await buildApp({ databasePath: path });
    const saved = (await request("GET", ticket, admin)).json().ticket;
    assert.equal(saved.status, "ARCHIVED");
    assert.equal(saved.comments[0].replies[0].text, "Ответ разработчика");
    assert.equal(saved.release.version, "1.0");
    assert.equal(saved.attachments.length, 1);
    assert.deepEqual(
      (await request("GET", ticket + "/events", admin))
        .json()
        .events.map((e: any) => e.type),
      [
        "CREATED",
        "ASSIGNED",
        "TAKEN",
        "FIX_SUBMITTED",
        "REOPENED",
        "TAKEN",
        "FIX_SUBMITTED",
        "CLOSED",
        "ARCHIVED",
      ],
    );
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
