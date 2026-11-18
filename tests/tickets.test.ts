import { test } from "node:test";
import assert from "node:assert/strict";
import { Deadline, statuses } from "../src/domain/ticket.js";
import { fixture } from "./fixture.js";
test("тикет создаётся в OPEN и сохраняется с объектами исходной модели", () => {
  const f = fixture();
  try {
    const ticket = f.service.createTicket(
      f.project,
      f.tester,
      "Ошибка",
      "Описание ошибки",
      "HIGH",
      "Шаг 1",
    );
    const saved = f.service.get(ticket.getId(), f.developer);
    assert.equal(saved.getStatus(), "OPEN");
    assert.equal(saved.getAssignee(), null);
    assert.equal(saved.stepsToReproduce, "Шаг 1");
    assert.equal(f.repository.findByProject(f.project).length, 1);
    assert.equal(f.repository.findByStatus("OPEN").length, 1);
    assert.equal(f.repository.findByAssignee(f.developer).length, 0);
    assert.throws(() => f.service.get(ticket.getId(), f.stranger), {
      statusCode: 403,
    });
    assert.throws(
      () =>
        f.service.createTicket(
          f.project,
          f.stranger,
          "Ошибка",
          "Описание",
          "LOW",
        ),
      { statusCode: 403 },
    );
    f.service.assignTicket(saved, f.manager, f.developer);
    assert.equal(f.repository.findByAssignee(f.developer).length, 1);
    assert.throws(() => saved.takeOn(f.tester), { statusCode: 403 });
    f.service.takeOn(saved, f.developer);
    assert.equal(
      f.service.get(saved.getId(), f.developer).status,
      "IN_PROGRESS",
    );
    assert.throws(() => saved.takeOn(f.developer), { statusCode: 409 });
    assert.throws(() => f.service.declineTicket(saved, f.developer, " "), {
      statusCode: 400,
    });
    f.service.declineTicket(saved, f.developer, "Нужна другая специализация");
    assert.equal(f.service.get(saved.getId(), f.manager).assignee, null);
    assert.deepEqual(
      f.service.history(saved).map((e) => e.type),
      ["CREATED", "ASSIGNED", "TAKEN", "DECLINED"],
    );
    assert.equal(statuses.length, 6);
    assert.equal(new Deadline("2000-01-01T00:00:00Z").isOverdue(), true);
    assert.throws(() => new Deadline("invalid"));
  } finally {
    f.db.close();
  }
});

test("конкурирующая запись тикета получает конфликт ревизии", () => {
  const f = fixture();
  try {
    const ticket = f.service.createTicket(
      f.project,
      f.tester,
      "Гонка",
      "Описание",
      "LOW",
    );
    const first = f.repository.findById(ticket.getId())!;
    const second = f.repository.findById(ticket.getId())!;
    first.setPriority("HIGH");
    f.repository.save(first);
    second.setPriority("CRITICAL");
    assert.throws(() => f.repository.save(second), { statusCode: 409 });
  } finally {
    f.db.close();
  }
});
