import { ensure } from "../domain/entity.js";
import { Project, SourceRepository, type Role } from "../domain/project.js";
import { User, Email } from "../domain/user.js";
import { Membership } from "../domain/project.js";
import type { Repository } from "./repository.js";
import type { TicketStatus } from "../domain/ticket.js";
import type { UserRepository } from "./authentication.js";
import type { TicketRepository } from "./tickets.js";
export interface ProjectRepository extends Repository<Project> {
  findByParticipant(user: User): Project[];
}
export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly users: UserRepository,
    private readonly tickets?: TicketRepository,
  ) {}
  createProject(admin: User, name: string, description: string): Project {
    ensure(admin.isAdmin, "Создавать проекты может администратор", 403);
    const project = new Project(name, description, admin);
    this.projects.save(project);
    return project;
  }
  list(user: User): Project[] {
    return this.projects.findByParticipant(user);
  }
  requireAccess(id: string, user: User): Project {
    const project = this.projects.findById(id);
    ensure(project, "Проект не найден", 404);
    ensure(
      project.members.some((m) => m.user.getId() === user.getId()),
      "Нет доступа к проекту",
      403,
    );
    return project;
  }
  addMember(project: Project, user: User, role: Role): Membership {
    const membership = project.addMember(user, role);
    this.projects.save(project);
    return membership;
  }
  removeMember(project: Project, user: User): void {
    if (this.tickets) {
      const active = this.tickets
        .findByAssignee(user)
        .some(
          (ticket) =>
            ticket.project.getId() === project.getId() &&
            !(["CLOSED", "ARCHIVED"] as TicketStatus[]).includes(ticket.status),
        );
      ensure(!active, "Нельзя удалить исполнителя активного тикета", 409);
    }
    project.removeMember(user);
    this.projects.save(project);
  }
  changeMemberRole(project: Project, user: User, role: Role): void {
    const member = project.members.find((item) => item.user.getId() === user.getId());
    ensure(member, "Участник не найден", 404);
    if (
      this.tickets &&
      member.getRole() === "DEVELOPER" &&
      role !== "DEVELOPER"
    ) {
      const active = this.tickets.findByAssignee(user).some(
        (ticket) =>
          ticket.project.getId() === project.getId() &&
          !(["CLOSED", "ARCHIVED"] as TicketStatus[]).includes(ticket.status),
      );
      ensure(!active, "Нельзя изменить роль исполнителя активного тикета", 409);
    }
    project.changeMemberRole(user, role);
    this.projects.save(project);
  }
  linkRepository(project: Project, repo: SourceRepository): void {
    project.linkRepository(repo);
    this.projects.save(project);
  }
  findUser(email: string): User {
    const user = this.users.findByEmail(new Email(email));
    ensure(user, "Пользователь не найден", 404);
    return user;
  }
  requireManager(id: string, user: User): Project {
    const project = this.requireAccess(id, user);
    ensure(
      project.members.some(
        (m) => m.user.getId() === user.getId() && m.hasRole("PROJECT_MANAGER"),
      ),
      "Требуется менеджер проекта",
      403,
    );
    return project;
  }
}
