import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";
test("комментарий, ответы и parent восстанавливаются из хранилища", () => {
  const f = fixture();
  try {
    const t = f.service.createTicket(
      f.project,
      f.tester,
      "Ошибка",
      "Описание",
      "MEDIUM",
    );
    const root = f.service.addComment(t, f.tester, "Условия воспроизведения");
    const reply = f.service.addComment(
      t,
      f.developer,
      "Уточнение",
      root.getId(),
    );
    f.service.addComment(t, f.tester, "Ответ", reply.getId());
    const saved = f.service.get(t.getId(), f.manager);
    const replies = saved.comments[0].getReplies();
    assert.equal(replies[0].getParent(), saved.comments[0]);
    assert.equal(replies[0].getReplies()[0].getText(), "Ответ");
    assert.equal(replies[0].getAuthor().getId(), f.developer.getId());
    assert.throws(() => f.service.addComment(t, f.stranger, "Сообщение"), {
      statusCode: 403,
    });
    assert.throws(
      () => f.service.addComment(t, f.tester, "Сообщение", "чужой-parent"),
      { statusCode: 400 },
    );
    assert.throws(() => f.service.addComment(t, f.tester, "  "), {
      statusCode: 400,
    });
  } finally {
    f.db.close();
  }
});

test("глубокая цепочка ответов хранится плоско и восстанавливается", () => {
  const f = fixture();
  try {
    const ticket = f.service.createTicket(
      f.project,
      f.tester,
      "Глубокая ошибка",
      "Описание",
      "LOW",
    );
    let parent = ticket.addComment(f.tester, "root");
    for (let i = 0; i < 700; i++) parent = parent.addReply(f.tester, `reply-${i}`);
    f.repository.save(ticket);
    const restored = f.service.get(ticket.getId(), f.manager);
    let depth = 0;
    let current = restored.comments[0];
    while (current.getReplies().length) {
      depth += 1;
      current = current.getReplies()[0];
    }
    assert.equal(depth, 700);
  } finally {
    f.db.close();
  }
});
