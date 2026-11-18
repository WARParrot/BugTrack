import { Entity, ensure, text } from "./entity.js";
import { User } from "./user.js";
export const roles = ["PROJECT_MANAGER", "DEVELOPER", "TESTER"] as const;
export type Role = (typeof roles)[number];
export class Membership extends Entity {
  constructor(
    readonly user: User,
    private readonly project: Project,
    private role: Role,
  ) {
    super();
    ensure(roles.includes(role), "Неизвестная роль");
  }
  getUser(): User {
    return this.user;
  }
  getProject(): Project {
    return this.project;
  }
  getRole(): Role {
    return this.role;
  }
  changeRole(role: Role): void {
    ensure(roles.includes(role), "Неизвестная роль");
    this.role = role;
  }
  hasRole(role: Role): boolean {
    return this.role === role;
  }
}
export class SourceRepository extends Entity {
  readonly name: string;
  readonly url: string;
  constructor(name: string, url: string) {
    super();
    this.name = text(name, "Название репозитория", 150);
    this.url = url.trim();
    let valid = false;
    try {
      const parsed = new URL(this.url);
      valid =
        ["https:", "ssh:"].includes(parsed.protocol) &&
        !!parsed.hostname &&
        !parsed.password &&
        (parsed.protocol === "ssh:" || !parsed.username);
    } catch {}
    ensure(valid, "Укажите HTTPS или SSH URL репозитория без пароля");
  }
  getUrl(): string {
    return this.url;
  }
}
export class Project extends Entity {
  repository: SourceRepository | null = null;
  linkRepository(repo: SourceRepository): void {
    this.repository = repo;
  }
  readonly name: string;
  readonly description: string;
  readonly createdAt: string;
  private readonly _members: Membership[] = [];
  get members(): readonly Membership[] {
    return [...this._members];
  }
  constructor(
    name: string,
    description: string,
    creator: User,
  ) {
    super();
    this.name = text(name, "Название", 150);
    this.description = description.trim();
    this.createdAt = new Date().toISOString();
    ensure(this.description.length <= 10000, "Описание слишком длинное");
    this._members.push(new Membership(creator, this, "PROJECT_MANAGER"));
  }
  getMembers(): Membership[] {
    return [...this.members];
  }
  getMembersByRole(role: Role): Membership[] {
    return this._members.filter((m) => m.hasRole(role));
  }
  addMember(user: User, role: Role): Membership {
    ensure(
      !this._members.some((m) => m.user.getId() === user.getId()),
      "Участник уже в проекте",
      409,
    );
    const member = new Membership(user, this, role);
    this._members.push(member);
    return member;
  }
  removeMember(user: User): void {
    const index = this._members.findIndex(
      (m) => m.user.getId() === user.getId(),
    );
    ensure(index >= 0, "Участник не найден", 404);
    ensure(
      this.members.length > 1,
      "Нельзя удалить последнего участника",
      409,
    );
    if (this.members[index].hasRole("PROJECT_MANAGER"))
      ensure(
        this.getMembersByRole("PROJECT_MANAGER").length > 1,
        "Нельзя удалить последнего менеджера",
        409,
      );
    this._members.splice(index, 1);
  }
  restoreMembers(members: Membership[]): void {
    this._members.splice(0, this._members.length, ...members);
  }

  changeMemberRole(user: User, role: Role): void {
    const member = this._members.find((m) => m.user.getId() === user.getId());
    ensure(member, "Участник не найден", 404);
    if (
      member.hasRole("PROJECT_MANAGER") &&
      role !== "PROJECT_MANAGER"
    )
      ensure(
        this.getMembersByRole("PROJECT_MANAGER").length > 1,
        "Нельзя изменить роль последнего менеджера",
        409,
      );
    member.changeRole(role);
  }
}
