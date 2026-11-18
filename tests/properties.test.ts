import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";
import { Deadline } from "../src/domain/ticket.js";
test("менеджер задаёт приоритет и Deadline без самовольного расширения событий", () => {
  const f = fixture();
  try {
    const ticket = f.service.createTicket(
      f.project,
      f.tester,
      "Ошибка",
      "Описание",
      "LOW",
    );
    assert.throws(() => f.service.setPriority(ticket, f.developer, "HIGH"), {
      statusCode: 403,
    });
    f.service.setPriority(ticket, f.manager, "CRITICAL");
    f.service.setDeadline(
      ticket,
      f.manager,
      new Deadline("2030-01-01T10:00:00Z"),
    );
    const saved = f.service.get(ticket.getId(), f.manager);
    assert.equal(saved.priority, "CRITICAL");
    assert.equal(saved.deadline?.getDueAt(), "2030-01-01T10:00:00.000Z");
    assert.deepEqual(
      f.service.history(saved).map((e) => e.type),
      ["CREATED"],
    );
  } finally {
    f.db.close();
  }
});
