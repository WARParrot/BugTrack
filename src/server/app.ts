import Fastify, { type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { z, ZodError } from "zod";
import { DomainError, isUuid } from "../domain/entity.js";
import { Email, User, publicUser } from "../domain/user.js";
import { AuthenticationService } from "../application/authentication.js";
import { openDatabase } from "../infrastructure/database.js";
import { SqliteUserRepository } from "../infrastructure/users.js";
import { hashPassword, verifyPassword } from "../infrastructure/security.js";
import { Release } from "../domain/release.js";
import { NotificationService } from "../application/notifications.js";
import { SqliteNotificationRepository } from "../infrastructure/notifications.js";
import { SqliteReleaseRepository } from "../infrastructure/releases.js";
import { ProjectService } from "../application/projects.js";
import { TicketService } from "../application/tickets.js";
import { Ticket, Deadline, priorities } from "../domain/ticket.js";
import { SqliteTicketRepository } from "../infrastructure/tickets.js";
import {
  SqliteTicketEventRepository,
  SqliteTransactions,
} from "../infrastructure/events.js";
import { Comment } from "../domain/comment.js";
import { attachmentTypes } from "../domain/attachment.js";
export function commentDto(c: Comment): {
  id: string;
  author: ReturnType<typeof publicUser>;
  text: string;
  createdAt: string;
  replies: ReturnType<typeof commentDto>[];
} {
  return {
    id: c.getId(),
    author: publicUser(c.author),
    text: c.text,
    createdAt: c.createdAt,
    replies: c.replies.map(commentDto),
  };
}
export function ticketDto(t: Ticket) {
  return {
    attachments: t.attachments.map((a) => ({
      id: a.getId(),
      type: a.type,
      url: a.url,
      uploader: publicUser(a.uploader),
      uploadedAt: a.uploadedAt,
    })),
    comments: t.comments.map(commentDto),
    id: t.getId(),
    projectId: t.project.getId(),
    title: t.title,
    description: t.description,
    stepsToReproduce: t.stepsToReproduce,
    status: t.status,
    priority: t.priority,
    reporter: publicUser(t.reporter),
    assignee: t.assignee ? publicUser(t.assignee) : null,
    deadline: t.deadline?.getDueAt() ?? null,
    release: t.release
      ? {
          id: t.release.getId(),
          version: t.release.version,
          releasedAt: t.release.releasedAt,
        }
      : null,
    mergeRequestUrl: t.mergeRequestUrl,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
import { SqliteProjectRepository } from "../infrastructure/projects.js";
import { Project, SourceRepository, roles } from "../domain/project.js";

export function projectDto(project: Project) {
  return {
    id: project.getId(),
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    repository: project.repository
      ? { name: project.repository.name, url: project.repository.url }
      : null,
    members: project.members.map((m) => ({
      id: m.getId(),
      role: m.getRole(),
      user: publicUser(m.user),
    })),
  };
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; sessionVersion: number };
    user: { sub: string; sessionVersion: number };
  }
}
const idSchema = z.string().uuid();
const credentials = z.object({
  email: z.string().max(254),
  password: z.string().min(1).max(128),
});
const registration = credentials.extend({
  fullName: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
});
export async function buildApp(options: { databasePath?: string } = {}) {
  const production = process.env.NODE_ENV === "production";
  if (
    production &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
  )
    throw new Error("JWT_SECRET: минимум 32 символа");
  if (production && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD))
    throw new Error("ADMIN_EMAIL и ADMIN_PASSWORD обязательны в production");
  const app = Fastify({ bodyLimit: 64 * 1024 });
  const db = openDatabase(options.databasePath ?? process.env.DATABASE_PATH);
  app.addHook("onClose", async () => {
    db.close();
  });
  const users = new SqliteUserRepository(db);
  const auth = new AuthenticationService(users);
  const projectRepository = new SqliteProjectRepository(db, users);
  const releases = new SqliteReleaseRepository(db);
  const ticketRepository = new SqliteTicketRepository(
    db,
    projectRepository,
    users,
  );
  const projects = new ProjectService(projectRepository, users, ticketRepository);
  const notifications = new NotificationService(
    new SqliteNotificationRepository(db, users),
  );
  const ticketEvents = new SqliteTicketEventRepository(
    db,
    users,
    ticketRepository,
  );
  const tickets = new TicketService(
    ticketRepository,
    ticketEvents,
    new SqliteTransactions(db),
    releases,
    notifications,
  );
  if (
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD &&
    !users.findByEmail(new Email(process.env.ADMIN_EMAIL))
  ) {
    if (process.env.ADMIN_PASSWORD.length < 12) {
      db.close();
      throw new Error("ADMIN_PASSWORD: минимум 12 символов");
    }
    users.save(
      User.admin(
        process.env.ADMIN_NAME ?? "Администратор",
        new Email(process.env.ADMIN_EMAIL),
        await hashPassword(process.env.ADMIN_PASSWORD),
      ),
    );
  }
  await app.register(cookie);
  await app.register(jwt, {
    secret:
      process.env.JWT_SECRET ??
      "local-development-session-secret-not-for-production",
    cookie: { cookieName: "bugtrack_session", signed: false },
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError)
      return reply.code(error.statusCode).send({ error: error.message });
    if (error instanceof ZodError)
      return reply
        .code(400)
        .send({ error: error.issues[0]?.message ?? "Некорректные данные" });
    const code = (error as { code?: string }).code;
    if (code?.startsWith("SQLITE_CONSTRAINT"))
      return reply
        .code(409)
        .send({ error: "Запись уже существует или нарушает ограничения" });
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500)
      return reply
        .code(status)
        .send({
          error: status === 401 ? "Требуется вход" : "Некорректный запрос",
        });
    app.log.error(error);
    return reply.code(500).send({ error: "Внутренняя ошибка сервера" });
  });
  app.addHook("preHandler", async (request) => {
    const params = request.params as Record<string, unknown>;
    for (const key of ["id", "userId"])
      if (typeof params[key] === "string" && !isUuid(params[key]))
        throw new DomainError(400, "Некорректный UUID");
  });
  async function actor(request: FastifyRequest): Promise<User> {
    await request.jwtVerify({ onlyCookie: true });
    const user = users.findById(request.user.sub);
    if (!user || user.getSessionVersion() !== request.user.sessionVersion)
      throw new DomainError(401, "Требуется вход");
    return user;
  }
  const sessionOptions = {
    httpOnly: true,
    secure: production,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 8 * 3600,
  };
  app.get("/api/health", async () => ({ ok: true }));
  app.post("/api/auth/register", async (request, reply) => {
    const data = registration.parse(request.body);
    const user = auth.register(
      data.fullName,
      new Email(data.email),
      await hashPassword(data.password),
    );
    reply.setCookie(
      "bugtrack_session",
      app.jwt.sign(
        { sub: user.getId(), sessionVersion: user.getSessionVersion() },
        { expiresIn: "8h" },
      ),
      sessionOptions,
    );
    return reply
      .code(201)
      .send({ user: publicUser(user) });
  });
  app.post("/api/auth/login", async (request, reply) => {
    const data = credentials.parse(request.body);
    const email = new Email(data.email);
    const user = users.findByEmail(email);
    // И для неизвестного email выполняется scrypt, чтобы не создавать быстрый путь перебора аккаунтов.
    const candidate =
      user?.getPasswordHash() ??
      "00000000000000000000000000000000:" + "00".repeat(64);
    if (!(await verifyPassword(data.password, candidate)) || !user)
      throw new DomainError(401, "Неверный email или пароль");
    const authenticated = auth.authenticate(email, user.getPasswordHash());
    reply.setCookie(
      "bugtrack_session",
      app.jwt.sign(
        {
          sub: authenticated.getId(),
          sessionVersion: authenticated.getSessionVersion(),
        },
        { expiresIn: "8h" },
      ),
      sessionOptions,
    );
    return { user: publicUser(authenticated) };
  });
  app.get("/api/auth/me", async (request) => ({
    user: publicUser(await actor(request)),
  }));
  app.post("/api/auth/logout", async (request, reply) => {
    const user = await actor(request);
    user.invalidateSessions();
    users.save(user);
    reply.clearCookie("bugtrack_session", { path: "/" });
    return reply.code(204).send();
  });
  app.get("/api/projects", async (request) => ({
    projects: projects.list(await actor(request)).map(projectDto),
  }));
  app.post("/api/projects", async (request, reply) => {
    const user = await actor(request);
    const data = z
      .object({
        name: z.string().trim().min(1).max(150),
        description: z.string().max(10000).default(""),
      })
      .parse(request.body);
    return reply
      .code(201)
      .send({
        project: projectDto(
          projects.createProject(user, data.name, data.description),
        ),
      });
  });
  app.get<{ Params: { id: string } }>("/api/projects/:id", async (request) => ({
    project: projectDto(
      projects.requireAccess(request.params.id, await actor(request)),
    ),
  }));
  app.post<{ Params: { id: string } }>(
    "/api/projects/:id/members",
    async (request, reply) => {
      const project = projects.requireManager(
        request.params.id,
        await actor(request),
      );
      const data = z
        .object({ email: z.string().max(254), role: z.enum(roles) })
        .parse(request.body);
      projects.addMember(project, projects.findUser(data.email), data.role);
      return reply.code(201).send({ project: projectDto(project) });
    },
  );
  app.patch<{ Params: { id: string; userId: string } }>(
    "/api/projects/:id/members/:userId",
    async (request) => {
      const project = projects.requireManager(
        request.params.id,
        await actor(request),
      );
      const data = z.object({ role: z.enum(roles) }).parse(request.body);
      const target = project.members.find(
        (m) => m.user.getId() === request.params.userId,
      )?.user;
      if (!target) throw new DomainError(404, "Участник не найден");
      projects.changeMemberRole(project, target, data.role);
      return { project: projectDto(project) };
    },
  );
  app.delete<{ Params: { id: string; userId: string } }>(
    "/api/projects/:id/members/:userId",
    async (request, reply) => {
      const project = projects.requireManager(
        request.params.id,
        await actor(request),
      );
      const target = project.members.find(
        (m) => m.user.getId() === request.params.userId,
      )?.user;
      if (!target) throw new DomainError(404, "Участник не найден");
      projects.removeMember(project, target);
      return reply.code(204).send();
    },
  );
  app.put<{ Params: { id: string } }>(
    "/api/projects/:id/repository",
    async (request) => {
      const project = projects.requireManager(
        request.params.id,
        await actor(request),
      );
      const data = z
        .object({ name: z.string().max(150), url: z.string().max(2048) })
        .parse(request.body);
      projects.linkRepository(
        project,
        new SourceRepository(data.name, data.url),
      );
      return { project: projectDto(project) };
    },
  );
  app.get<{ Params: { id: string } }>(
    "/api/projects/:id/tickets",
    async (request) => {
      const project = projects.requireAccess(
        request.params.id,
        await actor(request),
      );
      return { tickets: tickets.list(project).map(ticketDto) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/projects/:id/tickets",
    async (request, reply) => {
      const user = await actor(request);
      const project = projects.requireAccess(request.params.id, user);
      const data = z
        .object({
          title: z.string().trim().min(1).max(200),
          description: z.string().trim().min(1).max(10000),
          stepsToReproduce: z.string().max(10000).default(""),
          priority: z.enum(priorities),
        })
        .parse(request.body);
      return reply.code(201).send({
        ticket: ticketDto(
          tickets.createTicket(
            project,
            user,
            data.title,
            data.description,
            data.priority,
            data.stepsToReproduce,
          ),
        ),
      });
    },
  );
  app.get<{ Params: { id: string } }>("/api/tickets/:id", async (request) => ({
    ticket: ticketDto(tickets.get(request.params.id, await actor(request))),
  }));
  app.get<{ Params: { id: string } }>(
    "/api/tickets/:id/events",
    async (request) => {
      const ticket = tickets.get(request.params.id, await actor(request));
      return {
        events: tickets
          .history(ticket)
          .map((e) => ({
            id: e.getId(),
            type: e.type,
            actor: publicUser(e.actor),
            note: e.note,
            occurredAt: e.occurredAt,
          })),
      };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/assign",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      const data = z.object({ userId: idSchema }).parse(request.body);
      const developer = users.findById(data.userId);
      if (!developer) throw new DomainError(404, "Разработчик не найден");
      tickets.assignTicket(ticket, user, developer);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/take",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      tickets.takeOn(ticket, user);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/decline",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      const data = z
        .object({ reason: z.string().trim().min(1).max(2000) })
        .parse(request.body);
      tickets.declineTicket(ticket, user, data.reason);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/submit-fix",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      const data = z.object({ url: z.string().max(2048) }).parse(request.body);
      tickets.submitFix(ticket, user, data.url);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/close",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      tickets.verifyAndClose(ticket, user);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/reopen",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      const data = z
        .object({ reason: z.string().trim().min(1).max(2000) })
        .parse(request.body);
      tickets.requestRework(ticket, user, data.reason);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/archive",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      tickets.archive(ticket, user);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.get("/api/releases", async (request) => {
    await actor(request);
    return {
      releases: releases
        .findAll()
        .map((r) => ({
          id: r.getId(),
          version: r.version,
          releasedAt: r.releasedAt,
        })),
    };
  });
  app.post("/api/releases", async (request, reply) => {
    if (!(await actor(request)).isAdmin)
      throw new DomainError(403, "Требуется администратор");
    const data = z
      .object({
        version: z.string().trim().min(1).max(100),
        releasedAt: z.string(),
      })
      .parse(request.body);
    if (releases.findByVersion(data.version))
      throw new DomainError(409, "Версия уже существует");
    const release = new Release(data.version, data.releasedAt);
    releases.save(release);
    return reply
      .code(201)
      .send({
        release: {
          id: release.getId(),
          version: release.version,
          releasedAt: release.releasedAt,
        },
      });
  });
  app.put<{ Params: { id: string } }>(
    "/api/tickets/:id/release",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      projects.requireManager(ticket.project.getId(), user);
      const data = z
        .object({ version: z.string().max(100) })
        .parse(request.body);
      tickets.setRelease(ticket, user, data.version);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.put<{ Params: { id: string } }>(
    "/api/tickets/:id/priority",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      const data = z
        .object({ priority: z.enum(priorities) })
        .parse(request.body);
      tickets.setPriority(ticket, user, data.priority);
      return { ticket: ticketDto(ticket) };
    },
  );
  app.put<{ Params: { id: string } }>(
    "/api/tickets/:id/deadline",
    async (request) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      const data = z
        .object({ deadline: z.string().datetime({ offset: true }) })
        .parse(request.body);
      tickets.setDeadline(ticket, user, new Deadline(data.deadline));
      return { ticket: ticketDto(ticket) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/comments",
    async (request, reply) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      const data = z
        .object({
          text: z.string().trim().min(1).max(5000),
          parentId: idSchema.optional(),
        })
        .parse(request.body);
      const comment = tickets.addComment(
        ticket,
        user,
        data.text,
        data.parentId,
      );
      return reply.code(201).send({ comment: commentDto(comment) });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/tickets/:id/attachments",
    async (request, reply) => {
      const user = await actor(request);
      const ticket = tickets.get(request.params.id, user);
      const data = z
        .object({ type: z.enum(attachmentTypes), url: z.string().max(2048) })
        .parse(request.body);
      const attachment = tickets.addAttachment(
        ticket,
        user,
        data.type,
        data.url,
      );
      return reply
        .code(201)
        .send({
          attachment: {
            id: attachment.getId(),
            type: attachment.type,
            url: attachment.url,
          },
        });
    },
  );
  app.get("/api/notifications", async (request) => ({
    notifications: notifications
      .list(await actor(request))
      .map((n) => ({
        id: n.getId(),
        message: n.message,
        isRead: n.isRead(),
        createdAt: n.createdAt,
      })),
  }));
  app.post<{ Params: { id: string } }>(
    "/api/notifications/:id/read",
    async (request, reply) => {
      notifications.markAsReadForUser(request.params.id, await actor(request));
      return reply.code(204).send();
    },
  );
  return app;
}
