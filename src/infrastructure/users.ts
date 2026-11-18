import type Database from "better-sqlite3";
import { SqliteRepository } from "./database.js";
import { Email, User } from "../domain/user.js";
import { rehydrate } from "./rehydrate.js";
import type { UserRepository } from "../application/authentication.js";
export class SqliteUserRepository
  extends SqliteRepository<User>
  implements UserRepository
{
  constructor(db: Database.Database) {
    super(db, "users");
  }
  protected encode(user: User) {
    return {
      id: user.getId(),
      fullName: user.fullName,
      email: user.email.value,
      passwordHash: user.getPasswordHash(),
      isAdmin: user.isAdmin,
      sessionVersion: user.getSessionVersion(),
      createdAt: user.createdAt,
    };
  }
  protected decode(value: ReturnType<SqliteUserRepository["encode"]>) {
    return rehydrate(
      new User(
        value.fullName,
        new Email(value.email),
        value.passwordHash,
      ),
      value.id,
      { createdAt: value.createdAt, sessionVersion: value.sessionVersion ?? 0, isAdmin: value.isAdmin },
    );
  }
  findByEmail(email: Email): User | undefined {
    const row = this.db
      .prepare(
        "SELECT id FROM entities WHERE kind='users' AND lower(json_extract(data,'$.email'))=?",
      )
      .get(email.value) as { id: string } | undefined;
    return row && this.findById(row.id);
  }
}
