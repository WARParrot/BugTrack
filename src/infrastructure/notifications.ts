import type Database from "better-sqlite3";
import { SqliteRepository } from "./database.js";
import { Notification } from "../domain/notification.js";
import type { User } from "../domain/user.js";
import type { NotificationRepository } from "../application/notifications.js";
import { ensure } from "../domain/entity.js";
import { SqliteUserRepository } from "./users.js";
import { rehydrate } from "./rehydrate.js";
export class SqliteNotificationRepository
  extends SqliteRepository<Notification>
  implements NotificationRepository
{
  constructor(
    db: Database.Database,
    private readonly users: SqliteUserRepository,
  ) {
    super(db, "notifications");
  }
  protected encode(n: Notification) {
    return {
      id: n.getId(),
      recipientId: n.recipient.getId(),
      message: n.message,
      isRead: n.isRead(),
      createdAt: n.createdAt,
    };
  }
  protected decode(
    v: ReturnType<SqliteNotificationRepository["encode"]>,
  ): Notification {
    const user = this.users.findById(v.recipientId);
    ensure(user, "Получатель не найден", 500);
    return rehydrate(
      new Notification(user, v.message),
      v.id,
      { read: v.isRead, createdAt: v.createdAt },
    );
  }
  findByRecipient(user: User, unreadOnly: boolean): Notification[] {
    return this.findAll()
      .filter(
        (n) =>
          n.recipient.getId() === user.getId() && (!unreadOnly || !n.isRead()),
      )
      .reverse();
  }
}
