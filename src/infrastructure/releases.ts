import type Database from "better-sqlite3";
import { SqliteRepository } from "./database.js";
import type { ReleaseRepository } from "../application/releases.js";
import { Release } from "../domain/release.js";
import { rehydrate } from "./rehydrate.js";
export class SqliteReleaseRepository
  extends SqliteRepository<Release>
  implements ReleaseRepository
{
  constructor(db: Database.Database) {
    super(db, "releases");
  }
  protected encode(r: Release) {
    return { id: r.getId(), version: r.version, releasedAt: r.releasedAt };
  }
  protected decode(v: ReturnType<SqliteReleaseRepository["encode"]>): Release {
    return rehydrate(new Release(v.version, v.releasedAt), v.id);
  }
  findByVersion(version: string): Release | undefined {
    return this.findAll().find((r) => r.version === version);
  }
}
