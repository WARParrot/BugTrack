import { Entity, ensure, text } from "./entity.js";
import { Project } from "./project.js";
import { User } from "./user.js";
import { Release } from "./release.js";
import { Comment, type CommentSnapshot } from "./comment.js";
import { Attachment, type AttachmentType } from "./attachment.js";
export const statuses = [
  "OPEN",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "REOPENED",
  "CLOSED",
  "ARCHIVED",
] as const;
export type TicketStatus = (typeof statuses)[number];
export const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TicketPriority = (typeof priorities)[number];
export class Deadline {
  private readonly dueAt: string;
  constructor(dueAt: string) {
    ensure(Number.isFinite(Date.parse(dueAt)), "Некорректный срок");
    this.dueAt = new Date(dueAt).toISOString();
  }
  getDueAt(): string {
    return this.dueAt;
  }
  isOverdue(): boolean {
    return Date.parse(this.dueAt) < Date.now();
  }
}
export type TicketSnapshot = {
  status: TicketStatus;
  priority: TicketPriority;
  deadline: Deadline | null;
  release: Release | null;
  assignee: User | null;
  mergeRequestUrl: string | null;
  updatedAt: string;
  revision: number;
  stepsToReproduce: string;
  attachments: Attachment[];
  comments: CommentSnapshot[];
};

export class Ticket extends Entity {
  readonly title: string;
  readonly description: string;
  stepsToReproduce = "";
  private readonly _attachments: Attachment[] = [];
  get attachments(): readonly Attachment[] {
    return [...this._attachments];
  }
  addAttachment(uploader: User, type: AttachmentType, url: string): Attachment {
    ensure(this.status !== "ARCHIVED", "Архивный тикет неизменяем", 409);
    ensure(
      this.project.members.some((m) => m.user.getId() === uploader.getId()),
      "Нет доступа к вложениям",
      403,
    );
    const attachment = new Attachment(uploader, type, url);
    this._attachments.push(attachment);
    return attachment;
  }
  private readonly _comments: Comment[] = [];
  get comments(): readonly Comment[] {
    return [...this._comments];
  }
  addComment(author: User, content: string): Comment {
    ensure(this.status !== "ARCHIVED", "Архивный тикет неизменяем", 409);
    ensure(
      this.project.members.some((m) => m.user.getId() === author.getId()),
      "Нет доступа к обсуждению",
      403,
    );
    const comment = new Comment(author, content);
    this._comments.push(comment);
    return comment;
  }
  private _status: TicketStatus = "OPEN";
  get status(): TicketStatus {
    return this._status;
  }
  private _priority: TicketPriority;
  get priority(): TicketPriority {
    return this._priority;
  }
  private _deadline: Deadline | null = null;
  get deadline(): Deadline | null {
    return this._deadline;
  }
  private _release: Release | null = null;
  get release(): Release | null {
    return this._release;
  }
  setRelease(release: Release): void {
    ensure(this.status !== "ARCHIVED", "Архивный тикет неизменяем", 409);
    this._release = release;
  }
  setDeadline(deadline: Deadline | null): void {
    ensure(this.status !== "ARCHIVED", "Архивный тикет неизменяем", 409);
    this._deadline = deadline;
  }
  setPriority(priority: TicketPriority): void {
    ensure(this.status !== "ARCHIVED", "Архивный тикет неизменяем", 409);
    ensure(priorities.includes(priority), "Неизвестный приоритет");
    this._priority = priority;
  }
  private _mergeRequestUrl: string | null = null;
  get mergeRequestUrl(): string | null {
    return this._mergeRequestUrl;
  }
  private _assignee: User | null = null;
  get assignee(): User | null {
    return this._assignee;
  }
  private _updatedAt: string;
  get updatedAt(): string {
    return this._updatedAt;
  }
  readonly createdAt: string;
  constructor(
    readonly project: Project,
    readonly reporter: User,
    title: string,
    description: string,
    priority: TicketPriority,
    stepsToReproduce = "",
  ) {
    super();
    this.title = text(title, "Название", 200);
    this.description = text(description, "Описание");
    ensure(priorities.includes(priority), "Неизвестный приоритет");
    this._priority = priority;
    this.stepsToReproduce = text(stepsToReproduce, "Шаги", 10000, true);
    this.createdAt = new Date().toISOString();
    this._updatedAt = this.createdAt;
  }
  private hasRole(
    user: User,
    role: "PROJECT_MANAGER" | "DEVELOPER" | "TESTER",
  ): void {
    ensure(
      this.project.members.some(
        (m) => m.user.getId() === user.getId() && m.hasRole(role),
      ),
      "Недостаточно прав для действия",
      403,
    );
  }
  private assigned(developer: User): void {
    this.hasRole(developer, "DEVELOPER");
    ensure(
      this.assignee?.getId() === developer.getId(),
      "Действие доступно назначенному разработчику",
      403,
    );
  }
  assign(manager: User, developer: User): void {
    this.hasRole(manager, "PROJECT_MANAGER");
    this.hasRole(developer, "DEVELOPER");
    ensure(
      this.status === "OPEN" || this.status === "REOPENED",
      "Назначение доступно до начала работы",
      409,
    );
    this._assignee = developer;
  }
  takeOn(developer: User): void {
    this.assigned(developer);
    ensure(
      this.status === "OPEN" || this.status === "REOPENED",
      "Тикет нельзя взять в работу",
      409,
    );
    this._status = "IN_PROGRESS";
  }
  decline(developer: User, reason: string): void {
    this.assigned(developer);
    text(reason, "Причина отказа", 2000);
    ensure(
      ["OPEN", "REOPENED", "IN_PROGRESS"].includes(this.status),
      "Нельзя отказаться от этого тикета",
      409,
    );
    this._status = "OPEN";
    this._assignee = null;
  }
  submitFix(developer: User, mrUrl: string): void {
    this.assigned(developer);
    ensure(
      this.status === "IN_PROGRESS",
      "Сначала возьмите тикет в работу",
      409,
    );
    let valid = false;
    try {
      const url = new URL(mrUrl);
      valid =
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password;
    } catch {}
    ensure(valid && mrUrl.length <= 2048, "Укажите HTTP(S) URL Merge Request");
    this._mergeRequestUrl = mrUrl.trim();
    this._status = "READY_FOR_REVIEW";
  }
  close(tester: User): void {
    this.hasRole(tester, "TESTER");
    ensure(
      this.status === "READY_FOR_REVIEW",
      "Тикет не ожидает проверки",
      409,
    );
    this._status = "CLOSED";
  }
  reopen(tester: User, reason: string): void {
    this.hasRole(tester, "TESTER");
    text(reason, "Причина доработки", 2000);
    ensure(
      this.status === "READY_FOR_REVIEW",
      "Возврат доступен на проверке",
      409,
    );
    this._status = "REOPENED";
  }
  archive(manager: User): void {
    this.hasRole(manager, "PROJECT_MANAGER");
    ensure(this._status === "CLOSED", "Архивировать можно закрытый тикет", 409);
    this._status = "ARCHIVED";
  }
  private _revision = 0;
  get revision(): number {
    return this._revision;
  }
  setRevision(revision: number): void {
    ensure(Number.isSafeInteger(revision) && revision >= 0, "Некорректная ревизия", 500);
    this._revision = revision;
  }
  captureState(): TicketSnapshot {
    return {
      status: this._status,
      priority: this._priority,
      deadline: this._deadline,
      release: this._release,
      assignee: this._assignee,
      mergeRequestUrl: this._mergeRequestUrl,
      updatedAt: this._updatedAt,
      revision: this._revision,
      stepsToReproduce: this.stepsToReproduce,
      attachments: [...this._attachments],
      comments: this._comments.map((comment) => comment.captureState()),
    };
  }
  setUpdatedAt(value: string): void {
    this._updatedAt = value;
  }

  restoreState(state: TicketSnapshot): void {
    this._status = state.status;
    this._priority = state.priority;
    this._deadline = state.deadline;
    this._release = state.release;
    this._assignee = state.assignee;
    this._mergeRequestUrl = state.mergeRequestUrl;
    this._updatedAt = state.updatedAt;
    this._revision = state.revision;
    this.stepsToReproduce = state.stepsToReproduce;
    this._attachments.splice(0, this._attachments.length, ...state.attachments);
    this._comments.splice(
      0,
      this._comments.length,
      ...state.comments.map((comment) => {
        comment.comment.restoreState(comment);
        return comment.comment;
      }),
    );
  }

  restoreStateForStorage(state: {
    status: TicketStatus;
    assignee: User | null;
    mergeRequestUrl: string | null;
    updatedAt: string;
  }): void {
    this._status = state.status;
    this._assignee = state.assignee;
    this._mergeRequestUrl = state.mergeRequestUrl;
    this._updatedAt = state.updatedAt;
  }

  restoreCollections(
    attachments: Attachment[],
    comments: readonly Comment[],
  ): void {
    this._attachments.splice(0, this._attachments.length, ...attachments);
    this._comments.splice(0, this._comments.length, ...comments);
  }

  getStatus(): TicketStatus {
    return this.status;
  }
  getAssignee(): User | null {
    return this.assignee;
  }
}
