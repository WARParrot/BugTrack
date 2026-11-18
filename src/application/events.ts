import type { Ticket } from "../domain/ticket.js";
import type { TicketEvent } from "../domain/event.js";
import type { Repository } from "./repository.js";
export interface TicketEventRepository extends Repository<TicketEvent> {
  findByTicket(ticket: Ticket): TicketEvent[];
}
export interface Transactions {
  run<T>(operation: () => T): T;
}
