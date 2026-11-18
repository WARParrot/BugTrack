import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";

test("цикл исправления проходит исходные статусы без FIXED и восстанавливаемого архива", () => {
  const f = fixture();
  try {
    const t = f.service.createTicket(
      f.project,
      f.tester,
      "Ошибка",
      "Описание",
      "HIGH",
    );
    f.service.assignTicket(t, f.manager, f.developer);
    assert.throws(
      () => t.submitFix(f.developer, "https://git.example.org/mr/1"),
      { statusCode: 409 },
    );
    f.service.takeOn(t, f.developer);
    assert.throws(() => t.submitFix(f.developer, "javascript:alert(1)"), {
      statusCode: 400,
    });
    f.service.submitFix(t, f.developer, "https://git.example.org/mr/1");
    assert.equal(f.service.get(t.getId(), f.tester).status, "READY_FOR_REVIEW");
    assert.throws(() => t.close(f.manager), { statusCode: 403 });
    assert.throws(() => t.reopen(f.tester, "  "), { statusCode: 400 });
    f.service.requestRework(t, f.tester, "Не обработан повторный запрос");
    assert.equal(t.status, "REOPENED");
    f.service.takeOn(t, f.developer);
    f.service.submitFix(t, f.developer, "https://git.example.org/mr/2");
    f.service.verifyAndClose(t, f.tester);
    f.service.archive(t, f.manager);
    assert.equal(f.service.get(t.getId(), f.manager).status, "ARCHIVED");
    assert.throws(() => t.close(f.tester), { statusCode: 409 });
    assert.throws(() => t.takeOn(f.developer), { statusCode: 409 });
    assert.deepEqual(
      f.service.history(t).map((e) => e.type),
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
    f.db.close();
  }
});

test("ошибка записи события откатывает сохранение статуса", () => {
  const f = fixture();
  try {
    const t = f.service.createTicket(
      f.project,
      f.tester,
      "Ошибка",
      "Описание",
      "MEDIUM",
    );
    f.service.assignTicket(t, f.manager, f.developer);
    f.db.exec(
      "CREATE TRIGGER reject_events BEFORE INSERT ON entities WHEN NEW.kind='ticket_events' BEGIN SELECT RAISE(ABORT,'test'); END;",
    );
    assert.throws(() => f.service.takeOn(t, f.developer));
    assert.equal(t.status, "OPEN");
    assert.equal(f.service.get(t.getId(), f.developer).status, "OPEN");
    assert.equal(f.service.history(t).length, 2);
  } finally {
    f.db.close();
  }
});
