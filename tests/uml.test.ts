import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  statuses,
  priorities,
  Ticket,
  Deadline,
} from "../src/domain/ticket.js";
import {
  roles,
  Project,
  Membership,
  SourceRepository,
} from "../src/domain/project.js";
import { attachmentTypes, Attachment } from "../src/domain/attachment.js";
import { eventTypes, TicketEvent } from "../src/domain/event.js";
import { Notification } from "../src/domain/notification.js";
import { Comment } from "../src/domain/comment.js";
import { Release } from "../src/domain/release.js";
import { Email, User } from "../src/domain/user.js";
import { SqliteUserRepository } from "../src/infrastructure/users.js";
import { SqliteProjectRepository } from "../src/infrastructure/projects.js";
import { SqliteTicketRepository } from "../src/infrastructure/tickets.js";
import { SqliteReleaseRepository } from "../src/infrastructure/releases.js";
import { SqliteTicketEventRepository } from "../src/infrastructure/events.js";
import { SqliteNotificationRepository } from "../src/infrastructure/notifications.js";

test("исходная draw.io диаграмма не изменена; перечисления совпадают с XML", async () => {
  const bytes = await readFile("docs/source/domain.drawio");
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "7a9c8d19a31a194eb9f83ccd204bb2a2cc430aa13b819f972089cd05a9fa3483",
  );
  const xml = bytes.toString();
  const cells = [...xml.matchAll(/<mxCell\s+([^>]+)>/g)].map((match) =>
    Object.fromEntries(
      [...match[1].matchAll(/([\w]+)="([^"]*)"/g)].map((a) => [
        a[1],
        a[2].replace(/&#xa;/g, "\n"),
      ]),
    ),
  );
  for (const [name, actual] of [
    ["Role", roles],
    ["TicketStatus", statuses],
    ["TicketPriority", priorities],
    ["AttachmentType", attachmentTypes],
    ["TicketEventType", eventTypes],
  ] as const) {
    const cell = cells.find((c) => c.value?.endsWith("\n" + name));
    assert.ok(cell, name);
    const child = cells.find((c) => c.parent === cell.id && c.value);
    assert.ok(child, name);
    assert.deepEqual([...actual], child.value.split("\n"), name);
  }
});

test("методы сущностей и специализированных репозиториев присутствуют по исходной UML", () => {
  for (const [type, names] of [
    [
      Ticket,
      [
        "assign",
        "takeOn",
        "decline",
        "submitFix",
        "close",
        "reopen",
        "archive",
        "setRelease",
        "setDeadline",
        "setPriority",
        "addComment",
        "addAttachment",
        "getStatus",
        "getAssignee",
      ],
    ],
    [
      Project,
      [
        "addMember",
        "removeMember",
        "changeMemberRole",
        "getMembers",
        "getMembersByRole",
        "linkRepository",
      ],
    ],
    [Membership, ["getUser", "getProject", "getRole", "changeRole", "hasRole"]],
    [Notification, ["markAsRead", "isRead"]],
    [Comment, ["getAuthor", "getText", "getReplies", "addReply"]],
    [Attachment, ["getType", "getUrl"]],
    [Release, ["getVersion"]],
    [TicketEvent, ["getActor", "getType", "getNote", "getOccurredAt"]],
    [User, ["getFullName", "getEmail", "changePassword"]],
    [Email, ["getValue"]],
    [Deadline, ["isOverdue", "getDueAt"]],
    [SourceRepository, ["getUrl"]],
    [SqliteUserRepository, ["findByEmail"]],
    [SqliteProjectRepository, ["findByParticipant"]],
    [
      SqliteTicketRepository,
      ["findByProject", "findByAssignee", "findByStatus"],
    ],
    [SqliteReleaseRepository, ["findByVersion"]],
    [SqliteTicketEventRepository, ["findByTicket"]],
    [SqliteNotificationRepository, ["findByRecipient"]],
  ] as const)
    for (const method of names)
      assert.equal(
        typeof (type.prototype as any)[method],
        "function",
        type.name + "." + method,
      );
});

test("конструкторы сущностей соответствуют UML-бизнес-сигнатурам", () => {
  for (const [type, length] of [
    [User, 3],
    [Project, 3],
    [Membership, 3],
    [SourceRepository, 2],
    [Ticket, 5],
    [Comment, 2],
    [Attachment, 3],
    [Notification, 2],
    [Release, 2],
    [TicketEvent, 4],
    [Email, 1],
    [Deadline, 1],
  ] as const)
    assert.equal(type.length, length, `${type.name} constructor`);
});
