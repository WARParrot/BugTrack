import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";
import { Attachment } from "../src/domain/attachment.js";
test("вложение хранит тип, URL и автора; небезопасные URL отклоняются", () => {
  const f = fixture();
  try {
    const t = f.service.createTicket(
      f.project,
      f.tester,
      "Ошибка",
      "Описание",
      "LOW",
    );
    f.service.addAttachment(
      t,
      f.tester,
      "SCREENSHOT",
      "https://files.example.org/error.png",
    );
    const a = f.service.get(t.getId(), f.manager).attachments[0];
    assert.equal(a.getType(), "SCREENSHOT");
    assert.equal(a.getUrl(), "https://files.example.org/error.png");
    assert.equal(a.uploader.getId(), f.tester.getId());
    assert.throws(() => new Attachment(f.tester, "LOG", "javascript:alert(1)"));
    assert.throws(
      () =>
        new Attachment(
          f.tester,
          "LOG",
          "https://user:password@example.org/secret",
        ),
    );
    assert.throws(
      () =>
        f.service.addAttachment(
          t,
          f.stranger,
          "LOG",
          "https://files.example.org/log",
        ),
      { statusCode: 403 },
    );
  } finally {
    f.db.close();
  }
});
