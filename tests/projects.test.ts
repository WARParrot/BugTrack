import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/infrastructure/database.js";
import { SqliteUserRepository } from "../src/infrastructure/users.js";
import { SqliteProjectRepository } from "../src/infrastructure/projects.js";
import { SourceRepository } from "../src/domain/project.js";
import { ProjectService } from "../src/application/projects.js";
import { Email, User } from "../src/domain/user.js";
test("создание проекта администратором, членство создателя, изоляция проектов", () => {
  const db = openDatabase(":memory:");
  try {
    const users = new SqliteUserRepository(db);
    const repo = new SqliteProjectRepository(db, users);
    const service = new ProjectService(repo, users);
    const admin = User.admin(
      "Админ",
      new Email("admin@example.org"),
      "hash",
    );
    const other = new User("Другой", new Email("other@example.org"), "hash");
    users.save(admin);
    users.save(other);
    assert.throws(() => service.createProject(other, "Проект", ""), {
      statusCode: 403,
    });
    const project = service.createProject(admin, "Проект", "Описание");
    assert.throws(() => users.delete(admin), { statusCode: 409 });
    assert.equal(service.list(admin).length, 1);
    assert.equal(service.list(other).length, 0);
    assert.equal(
      repo
        .findById(project.getId())
        ?.getMembersByRole("PROJECT_MANAGER")[0]
        .user.getId(),
      admin.getId(),
    );
    assert.throws(() => service.requireAccess(project.getId(), other), {
      statusCode: 403,
    });
    assert.throws(() => project.removeMember(admin), { statusCode: 409 });
    assert.throws(() => project.changeMemberRole(admin, "DEVELOPER"), {
      statusCode: 409,
    });
    service.addMember(project, other, "DEVELOPER");
    assert.equal(service.list(other).length, 1);
    assert.equal(project.members[1].getProject(), project);
    assert.throws(() => service.requireManager(project.getId(), other), {
      statusCode: 403,
    });
    assert.throws(() => service.addMember(project, other, "TESTER"), {
      statusCode: 409,
    });
    service.changeMemberRole(project, other, "TESTER");
    assert.equal(
      repo.findById(project.getId())?.getMembersByRole("TESTER").length,
      1,
    );
    service.linkRepository(
      project,
      new SourceRepository("Код", "ssh://git@example.org/team/app.git"),
    );
    assert.equal(
      repo.findById(project.getId())?.repository?.getUrl(),
      "ssh://git@example.org/team/app.git",
    );
    assert.throws(() => new SourceRepository("Код", "javascript:alert(1)"));
    assert.throws(
      () => new SourceRepository("Код", "https://u:pass@example.org/repo"),
    );
    service.removeMember(project, other);
    assert.equal(service.list(other).length, 0);
  } finally {
    db.close();
  }
});
