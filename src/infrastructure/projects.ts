import type Database from "better-sqlite3";
import { SqliteRepository } from "./database.js";
import type { ProjectRepository } from "../application/projects.js";
import { Project, Membership, SourceRepository } from "../domain/project.js";
import { User } from "../domain/user.js";
import { ensure } from "../domain/entity.js";
import { rehydrate } from "./rehydrate.js";
import { SqliteUserRepository } from "./users.js";
export class SqliteProjectRepository
  extends SqliteRepository<Project>
  implements ProjectRepository
{
  constructor(
    db: Database.Database,
    private readonly users: SqliteUserRepository,
  ) {
    super(db, "projects");
  }
  protected encode(project: Project) {
    return {
      id: project.getId(),
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      repository: project.repository
        ? {
            id: project.repository.getId(),
            name: project.repository.name,
            url: project.repository.url,
          }
        : null,
      members: project.members.map((m) => ({
        id: m.getId(),
        userId: m.user.getId(),
        role: m.getRole(),
      })),
    };
  }
  protected decode(
    value: ReturnType<SqliteProjectRepository["encode"]>,
  ): Project {
    const creator = this.users.findById(value.members[0]?.userId);
    ensure(creator, "Нарушена связь участника проекта", 500);
    const project = rehydrate(
      new Project(value.name, value.description, creator),
      value.id,
      { createdAt: value.createdAt },
    );
    if (value.repository)
      project.linkRepository(
        rehydrate(
          new SourceRepository(value.repository.name, value.repository.url),
          value.repository.id,
        ),
      );
    project.restoreMembers(
      value.members.map((m) => {
        const user = this.users.findById(m.userId);
        ensure(user, "Участник не найден", 500);
        return rehydrate(
          new Membership(user, project, m.role),
          m.id,
        );
      }),
    );
    return project;
  }
  findByParticipant(user: User): Project[] {
    return this.findAll().filter((p) =>
      p.members.some((m) => m.user.getId() === user.getId()),
    );
  }
}
