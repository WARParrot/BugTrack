import type Database from "better-sqlite3";
import { SqliteRepository } from "./database.js";
import type { TicketRepository } from "../application/tickets.js";
import { Ticket, Deadline, type TicketStatus } from "../domain/ticket.js";
import { Project } from "../domain/project.js";
import { User } from "../domain/user.js";
import { ensure, DomainError } from "../domain/entity.js";
import { SqliteProjectRepository } from "./projects.js";
import { Comment } from "../domain/comment.js";
import { Attachment } from "../domain/attachment.js";
import { SqliteReleaseRepository } from "./releases.js";
import { SqliteUserRepository } from "./users.js";
import { rehydrate } from "./rehydrate.js";

type StoredComment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  parentId: string | null;
};

export class SqliteTicketRepository
  extends SqliteRepository<Ticket>
  implements TicketRepository
{
  constructor(
    db: Database.Database,
    private readonly projects: SqliteProjectRepository,
    private readonly users: SqliteUserRepository,
  ) {
    super(db, "tickets");
  }

  private encodeComments(comments: readonly Comment[]): StoredComment[] {
    const result: StoredComment[] = [];
    const stack = comments
      .map((comment) => ({ comment, parentId: null as string | null }))
      .reverse();
    while (stack.length) {
      const current = stack.pop()!;
      result.push({
        id: current.comment.getId(),
        authorId: current.comment.author.getId(),
        text: current.comment.text,
        createdAt: current.comment.createdAt,
        parentId: current.parentId,
      });
      for (const reply of [...current.comment.replies].reverse())
        stack.push({ comment: reply, parentId: current.comment.getId() });
    }
    return result;
  }

  private decodeComments(values: unknown[]): Comment[] {
    const rows: StoredComment[] = [];
    const flatten = (value: any, parentId: string | null): void => {
      rows.push({
        id: value.id,
        authorId: value.authorId,
        text: value.text,
        createdAt: value.createdAt,
        parentId: value.parentId ?? parentId,
      });
      for (const reply of value.replies ?? []) flatten(reply, value.id);
    };
    for (const value of values) flatten(value, null);

    const comments = new Map<string, Comment>();
    const roots: Comment[] = [];
    for (const row of rows) {
      const user = this.users.findById(row.authorId);
      ensure(user, "Автор комментария не найден", 500);
      const parent = row.parentId ? comments.get(row.parentId) : undefined;
      ensure(!row.parentId || parent, "Родительский комментарий не найден", 500);
      const comment = parent
        ? parent.addReply(user, row.text)
        : new Comment(user, row.text);
      rehydrate(comment, row.id, { createdAt: row.createdAt });
      comments.set(row.id, comment);
      if (!parent) roots.push(comment);
    }
    return roots;
  }

  protected encode(t: Ticket) {
    return {
      attachments: t.attachments.map((a) => ({
        id: a.getId(),
        uploaderId: a.uploader.getId(),
        type: a.type,
        url: a.url,
        uploadedAt: a.uploadedAt,
      })),
      comments: this.encodeComments(t.comments),
      id: t.getId(),
      projectId: t.project.getId(),
      reporterId: t.reporter.getId(),
      assigneeId: t.assignee?.getId() ?? null,
      title: t.title,
      description: t.description,
      stepsToReproduce: t.stepsToReproduce,
      status: t.status,
      priority: t.priority,
      deadline: t.deadline?.getDueAt() ?? null,
      releaseId: t.release?.getId() ?? null,
      mergeRequestUrl: t.mergeRequestUrl,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      revision: t.revision,
    };
  }

  save(ticket: Ticket): void {
    const existing = this.db
      .prepare("SELECT revision FROM entities WHERE kind=? AND id=?")
      .get(this.kind, ticket.getId()) as { revision: number } | undefined;
    if (!existing) {
      this.db
        .prepare("INSERT INTO entities(kind,id,data,revision) VALUES(?,?,?,0)")
        .run(this.kind, ticket.getId(), JSON.stringify(this.encode(ticket)));
      ticket.setRevision(0);
      return;
    }
    if (ticket.revision !== existing.revision)
      throw new DomainError(409, "Тикет изменён другим запросом");
    const nextRevision = existing.revision + 1;
    const result = this.db
      .prepare(
        "UPDATE entities SET data=?, revision=? WHERE kind=? AND id=? AND revision=?",
      )
      .run(
        JSON.stringify(this.encode(ticket)),
        nextRevision,
        this.kind,
        ticket.getId(),
        existing.revision,
      );
    if (result.changes !== 1)
      throw new DomainError(409, "Тикет изменён другим запросом");
    ticket.setRevision(nextRevision);
  }

  protected decode(v: ReturnType<SqliteTicketRepository["encode"]>): Ticket {
    const project = this.projects.findById(v.projectId);
    const reporter = this.users.findById(v.reporterId);
    ensure(project && reporter, "Нарушена связь тикета", 500);
    const ticket = rehydrate(
      new Ticket(
        project,
        reporter,
        v.title,
        v.description,
        v.priority,
        v.stepsToReproduce,
      ),
      v.id,
      { createdAt: v.createdAt },
    );
    ticket.setRevision(v.revision ?? 0);
    const attachments = v.attachments.map((a) => {
      const user = this.users.findById(a.uploaderId);
      ensure(user, "Автор вложения не найден", 500);
      return rehydrate(
        new Attachment(user, a.type, a.url),
        a.id,
        { uploadedAt: a.uploadedAt },
      );
    });
    ticket.restoreCollections(attachments, this.decodeComments(v.comments));
    ticket.setDeadline(v.deadline ? new Deadline(v.deadline) : null);
    if (v.releaseId) {
      const release = new SqliteReleaseRepository(this.db).findById(v.releaseId);
      ensure(release, "Релиз не найден", 500);
      ticket.setRelease(release);
    }
    ticket.restoreStateForStorage({
      status: v.status,
      assignee: v.assigneeId ? this.users.findById(v.assigneeId) ?? null : null,
      mergeRequestUrl: v.mergeRequestUrl,
      updatedAt: v.updatedAt,
    });
    return ticket;
  }

  findByProject(project: Project): Ticket[] {
    return this.findAll().filter((t) => t.project.getId() === project.getId());
  }

  findByAssignee(user: User): Ticket[] {
    return this.findAll().filter((t) => t.assignee?.getId() === user.getId());
  }

  findByStatus(status: TicketStatus): Ticket[] {
    return this.findAll().filter((t) => t.status === status);
  }
}
