import type Database from "better-sqlite3";
import { SqliteRepository } from "./database.js";
import type { TicketEventRepository, Transactions } from "../application/events.js";
import type { TicketRepository } from "../application/tickets.js";
import { TicketEvent } from "../domain/event.js";
import type { Ticket } from "../domain/ticket.js";
import { ensure } from "../domain/entity.js";
import { SqliteUserRepository } from "./users.js";
import { rehydrate } from "./rehydrate.js";

export class SqliteTicketEventRepository
  extends SqliteRepository<TicketEvent>
  implements TicketEventRepository
{
  constructor(
    db: Database.Database,
    private readonly users: SqliteUserRepository,
    private readonly tickets: TicketRepository,
  ) {
    super(db, "ticket_events");
  }

  protected encode(event: TicketEvent) {
    return {
      id: event.getId(),
      ticketId: event.ticket.getId(),
      actorId: event.actor.getId(),
      type: event.type,
      note: event.note,
      occurredAt: event.occurredAt,
    };
  }

  protected decode(
    value: ReturnType<SqliteTicketEventRepository["encode"]>,
  ): TicketEvent {
    const user = this.users.findById(value.actorId);
    const ticket = this.tickets.findById(value.ticketId);
    ensure(user && ticket, "Нарушена связь события тикета", 500);
    return rehydrate(
      new TicketEvent(ticket, user, value.type, value.note),
      value.id,
      { occurredAt: value.occurredAt },
    );
  }

  findByTicket(ticket: Ticket): TicketEvent[] {
    return this.findAll().filter(
      (event) => event.ticket.getId() === ticket.getId(),
    );
  }
}

export class SqliteTransactions implements Transactions {
  constructor(private readonly db: Database.Database) {}

  run<T>(operation: () => T): T {
    const transaction = this.db.transaction(operation) as typeof this.db.transaction & {
      immediate: () => T;
    };
    return transaction.immediate();
  }
}
