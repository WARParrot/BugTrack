import { ensure } from "../domain/entity.js";
import {
  Ticket,
  Deadline,
  type TicketPriority,
  type TicketStatus,
} from "../domain/ticket.js";
import { Project } from "../domain/project.js";
import { User } from "../domain/user.js";
import type { NotificationService } from "./notifications.js";
import type { Repository } from "./repository.js";
import type { Attachment, AttachmentType } from "../domain/attachment.js";
import type { Comment } from "../domain/comment.js";
import type { ReleaseRepository } from "./releases.js";
import type { TicketEventRepository, Transactions } from "./events.js";
import { TicketEvent, type TicketEventType } from "../domain/event.js";
export interface TicketRepository extends Repository<Ticket> {
  findByProject(project: Project): Ticket[];
  findByAssignee(user: User): Ticket[];
  findByStatus(status: TicketStatus): Ticket[];
}
export class TicketService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly events: TicketEventRepository,
    private readonly transactions: Transactions,
    private readonly releases: ReleaseRepository,
    private readonly notifications: NotificationService,
  ) {}
  createTicket(
    project: Project,
    reporter: User,
    title: string,
    description: string,
    priority: TicketPriority,
    steps = "",
  ): Ticket {
    ensure(
      project.members.some((m) => m.user.getId() === reporter.getId()),
      "Нет доступа к проекту",
      403,
    );
    ensure(steps.length <= 10000, "Шаги слишком длинные");
    const ticket = new Ticket(
      project,
      reporter,
      title,
      description,
      priority,
      steps,
    );
    this.transactions.run(() => {
      this.tickets.save(ticket);
      this.events.save(
        new TicketEvent(ticket, reporter, "CREATED", null),
      );
      this.notifications.notifyProjectMembers(
        ticket.project,
        `Создан тикет: ${ticket.title}`,
      );
    });
    return ticket;
  }
  private snapshot(ticket: Ticket) {
    return ticket.captureState();
  }
  private restore(ticket: Ticket, snapshot: ReturnType<Ticket["captureState"]>): void {
    ticket.restoreState(snapshot);
  }
  private transition(
    ticket: Ticket,
    actor: User,
    type: TicketEventType,
    action: () => void,
    note: string | null = null,
  ): void {
    const snapshot = this.snapshot(ticket);
    try {
      action();
      this.persist(ticket, actor, type, note);
    } catch (error) {
      this.restore(ticket, snapshot);
      throw error;
    }
  }
  private mutate<T>(ticket: Ticket, action: () => T): T {
    const snapshot = ticket.captureState();
    try {
      const result = action();
      this.transactions.run(() => {
        ticket.setUpdatedAt(new Date().toISOString());
        this.tickets.save(ticket);
      });
      return result;
    } catch (error) {
      ticket.restoreState(snapshot);
      throw error;
    }
  }

  private persist(
    ticket: Ticket,
    actor: User,
    type: TicketEventType,
    note: string | null = null,
  ): void {
    this.transactions.run(() => {
      ticket.setUpdatedAt(new Date().toISOString());
      this.tickets.save(ticket);
      this.events.save(new TicketEvent(ticket, actor, type, note));
      this.notifications.notifyProjectMembers(
        ticket.project,
        `${ticket.title}: ${type}`,
      );
    });
  }
  assignTicket(ticket: Ticket, manager: User, developer: User): void {
    this.transition(
      ticket,
      manager,
      "ASSIGNED",
      () => ticket.assign(manager, developer),
      developer.fullName,
    );
  }
  takeOn(ticket: Ticket, developer: User): void {
    this.transition(ticket, developer, "TAKEN", () => ticket.takeOn(developer));
  }
  declineTicket(ticket: Ticket, developer: User, reason: string): void {
    this.transition(
      ticket,
      developer,
      "DECLINED",
      () => ticket.decline(developer, reason),
      reason.trim(),
    );
  }
  submitFix(ticket: Ticket, developer: User, mrUrl: string): void {
    this.transition(
      ticket,
      developer,
      "FIX_SUBMITTED",
      () => ticket.submitFix(developer, mrUrl),
      mrUrl.trim(),
    );
  }
  verifyAndClose(ticket: Ticket, tester: User): void {
    this.transition(ticket, tester, "CLOSED", () => ticket.close(tester));
  }
  requestRework(ticket: Ticket, tester: User, reason: string): void {
    this.transition(
      ticket,
      tester,
      "REOPENED",
      () => ticket.reopen(tester, reason),
      reason.trim(),
    );
  }
  archive(ticket: Ticket, manager: User): void {
    this.transition(ticket, manager, "ARCHIVED", () => ticket.archive(manager));
  }
  private requireManager(ticket: Ticket, actor: User): void {
    ensure(
      ticket.project.members.some(
        (m) => m.user.getId() === actor.getId() && m.hasRole("PROJECT_MANAGER"),
      ),
      "Требуется менеджер",
      403,
    );
    ensure(ticket.status !== "ARCHIVED", "Архивный тикет неизменяем", 409);
  }
  setDeadline(ticket: Ticket, actor: User, deadline: Deadline): void {
    this.requireManager(ticket, actor);
    this.mutate(ticket, () => ticket.setDeadline(deadline));
  }
  setPriority(ticket: Ticket, actor: User, priority: TicketPriority): void {
    this.requireManager(ticket, actor);
    this.mutate(ticket, () => ticket.setPriority(priority));
  }
  setRelease(ticket: Ticket, actor: User, version: string): void {
    ensure(
      ticket.project.members.some(
        (m) => m.user.getId() === actor.getId() && m.hasRole("PROJECT_MANAGER"),
      ),
      "Требуется менеджер",
      403,
    );
    ensure(ticket.status !== "ARCHIVED", "Архивный тикет неизменяем", 409);
    const release = this.releases.findByVersion(version);
    ensure(release, "Релиз не найден", 404);
    this.mutate(ticket, () => ticket.setRelease(release));
  }
  addComment(
    ticket: Ticket,
    actor: User,
    content: string,
    parentId?: string,
  ): Comment {
    ensure(
      ticket.project.members.some((m) => m.user.getId() === actor.getId()),
      "Нет доступа к обсуждению",
      403,
    );
    let comment!: Comment;
    this.mutate(ticket, () => {
      if (parentId) {
        const find = (items: readonly Comment[]): Comment | undefined => {
          for (const item of items) {
            if (item.getId() === parentId) return item;
            const child = find(item.replies);
            if (child) return child;
          }
        };
        const parent = find(ticket.comments);
        ensure(parent, "Родительский комментарий не найден в тикете", 400);
        comment = parent.addReply(actor, content);
      } else {
        comment = ticket.addComment(actor, content);
      }
    });
    return comment;
  }
  addAttachment(
    ticket: Ticket,
    actor: User,
    type: AttachmentType,
    url: string,
  ): Attachment {
    return this.mutate(ticket, () => ticket.addAttachment(actor, type, url));
  }
  history(ticket: Ticket): TicketEvent[] {
    return this.events.findByTicket(ticket);
  }
  list(project: Project): Ticket[] {
    return this.tickets.findByProject(project);
  }
  get(id: string, user: User): Ticket {
    const ticket = this.tickets.findById(id);
    ensure(ticket, "Тикет не найден", 404);
    ensure(
      ticket.project.members.some((m) => m.user.getId() === user.getId()),
      "Нет доступа к тикету",
      403,
    );
    return ticket;
  }
}
