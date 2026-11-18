import { User, Email } from "../src/domain/user.js";
import { Project } from "../src/domain/project.js";
import { Deadline, statuses } from "../src/domain/ticket.js";
import { TicketService } from "../src/application/tickets.js";
import { openDatabase } from "../src/infrastructure/database.js";
import { SqliteUserRepository } from "../src/infrastructure/users.js";
import { SqliteProjectRepository } from "../src/infrastructure/projects.js";
import {
  SqliteTicketEventRepository,
  SqliteTransactions,
} from "../src/infrastructure/events.js";
import { NotificationService } from "../src/application/notifications.js";
import { SqliteNotificationRepository } from "../src/infrastructure/notifications.js";
import { SqliteReleaseRepository } from "../src/infrastructure/releases.js";
import { SqliteTicketRepository } from "../src/infrastructure/tickets.js";
export function fixture() {
  const db = openDatabase(":memory:");
  const users = new SqliteUserRepository(db);
  const projects = new SqliteProjectRepository(db, users);
  const manager = new User(
    "Менеджер",
    new Email("manager@example.org"),
    "hash",
  );
  const developer = new User(
    "Разработчик",
    new Email("dev@example.org"),
    "hash",
  );
  const tester = new User(
    "Тестировщик",
    new Email("tester@example.org"),
    "hash",
  );
  const stranger = new User(
    "Посторонний",
    new Email("stranger@example.org"),
    "hash",
  );
  [manager, developer, tester, stranger].forEach((u) => users.save(u));
  const project = new Project("Проект", "Описание", manager);
  project.addMember(developer, "DEVELOPER");
  project.addMember(tester, "TESTER");
  projects.save(project);
  const repository = new SqliteTicketRepository(db, projects, users);
  const ticketEvents = new SqliteTicketEventRepository(db, users, repository);
  const service = new TicketService(
    repository,
    ticketEvents,
    new SqliteTransactions(db),
    new SqliteReleaseRepository(db),
    new NotificationService(new SqliteNotificationRepository(db, users)),
  );
  return {
    db,
    users,
    projects,
    manager,
    developer,
    tester,
    stranger,
    project,
    repository,
    service,
  };
}
