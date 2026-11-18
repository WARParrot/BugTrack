import { Entity, text } from "./entity.js";
import { User } from "./user.js";
export class Notification extends Entity {
  readonly message: string;
  private read = false;
  readonly createdAt: string;
  constructor(
    readonly recipient: User,
    message: string,
  ) {
    super();
    this.message = text(message, "Уведомление", 1000);
    this.createdAt = new Date().toISOString();
  }
  isRead(): boolean {
    return this.read;
  }
  markAsRead(): void {
    this.read = true;
  }
}
