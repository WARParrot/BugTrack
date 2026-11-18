import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";
import { NotificationService } from "../src/application/notifications.js";
import { SqliteNotificationRepository } from "../src/infrastructure/notifications.js";
test("событие уведомляет участников; прочтение доступно только получателю", () => {
  const f = fixture();
  try {
    const notifications = new NotificationService(
      new SqliteNotificationRepository(f.db, f.users),
    );
    f.service.createTicket(f.project, f.tester, "Ошибка", "Описание", "MEDIUM");
    assert.equal(notifications.list(f.manager, true).length, 1);
    assert.equal(notifications.list(f.developer, true).length, 1);
    assert.equal(notifications.list(f.stranger).length, 0);
    const notification = notifications.list(f.manager)[0];
    assert.throws(
      () => notifications.markAsReadForUser(notification.getId(), f.developer),
      { statusCode: 404 },
    );
    notifications.markAsRead(notification);
    assert.equal(notifications.list(f.manager, true).length, 0);
    assert.equal(notifications.list(f.manager)[0].isRead(), true);
  } finally {
    f.db.close();
  }
});
