import { ensure } from "../domain/entity.js";
import { Notification } from "../domain/notification.js";
import type { Project } from "../domain/project.js";
import type { User } from "../domain/user.js";
import type { Repository } from "./repository.js";
export interface NotificationRepository extends Repository<Notification> {
  findByRecipient(user: User, unreadOnly: boolean): Notification[];
}
export class NotificationService {
  constructor(private readonly notifications: NotificationRepository) {}
  notify(recipient: User, message: string): void {
    this.notifications.save(new Notification(recipient, message));
  }
  notifyProjectMembers(project: Project, message: string): void {
    project.getMembers().forEach((m) => this.notify(m.getUser(), message));
  }
  list(user: User, unreadOnly = false): Notification[] {
    return this.notifications.findByRecipient(user, unreadOnly);
  }
  markAsRead(notification: Notification): void {
    notification.markAsRead();
    this.notifications.save(notification);
  }
  markAsReadForUser(id: string, user: User): void {
    const notification = this.notifications.findById(id);
    ensure(
      notification && notification.recipient.getId() === user.getId(),
      "Уведомление не найдено",
      404,
    );
    this.markAsRead(notification);
  }
}
