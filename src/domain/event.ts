import { Entity, ensure } from "./entity.js";
import type { Ticket } from "./ticket.js";
import { User } from "./user.js";
export const eventTypes = [
  "CREATED",
  "ASSIGNED",
  "TAKEN",
  "DECLINED",
  "FIX_SUBMITTED",
  "REOPENED",
  "CLOSED",
  "ARCHIVED",
] as const;
export type TicketEventType = (typeof eventTypes)[number];
export class TicketEvent extends Entity {
  readonly occurredAt: string;

  constructor(
    readonly ticket: Ticket,
    readonly actor: User,
    readonly type: TicketEventType,
    readonly note: string | null,
  ) {
    super();
    ensure(eventTypes.includes(type), "Неизвестный тип события");
    this.occurredAt = new Date().toISOString();
  }
  getActor(): User {
    return this.actor;
  }
  getType(): TicketEventType {
    return this.type;
  }
  getNote(): string | null {
    return this.note;
  }
  getOccurredAt(): string {
    return this.occurredAt;
  }
}
