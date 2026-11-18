import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Entity } from "../domain/entity.js";
import { ensure } from "../domain/entity.js";
import type { Repository } from "../application/repository.js";

export function openDatabase(path = ".data/bugtrack.sqlite") {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  try {
    const version = Number(db.pragma("user_version", { simple: true }));
    if (version > 2)
      throw new Error(`Неподдерживаемая версия хранилища: ${version}`);
    if (version === 0) {
      db.transaction(() => {
        db.exec(`CREATE TABLE IF NOT EXISTS entities(kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(kind,id));
        CREATE UNIQUE INDEX IF NOT EXISTS user_email ON entities(lower(json_extract(data,'$.email'))) WHERE kind='users';
        CREATE UNIQUE INDEX IF NOT EXISTS release_version ON entities(json_extract(data,'$.version')) WHERE kind='releases';`);
        db.pragma("user_version = 2");
      }).immediate();
    } else if (version === 1) {
      db.transaction(() => {
        db.exec("ALTER TABLE entities ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;");
        db.pragma("user_version = 2");
      }).immediate();
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export abstract class SqliteRepository<T extends Entity> implements Repository<T> {
  protected readonly kind: string;

  constructor(
    protected readonly db: Database.Database,
    kind: string,
  ) {
    this.kind = kind;
  }

  protected abstract encode(entity: T): object;
  protected abstract decode(value: any): T;

  findById(id: string): T | undefined {
    const row = this.db
      .prepare("SELECT data, revision FROM entities WHERE kind=? AND id=?")
      .get(this.kind, id) as { data: string; revision: number } | undefined;
    if (!row) return undefined;
    const entity = this.decode(JSON.parse(row.data));
    if ("setRevision" in entity && typeof entity.setRevision === "function")
      entity.setRevision(row.revision);
    return entity;
  }

  findAll(): T[] {
    return (
      this.db
        .prepare("SELECT data, revision FROM entities WHERE kind=? ORDER BY rowid")
        .all(this.kind) as { data: string; revision: number }[]
    ).map((row) => {
      const entity = this.decode(JSON.parse(row.data));
      if ("setRevision" in entity && typeof entity.setRevision === "function")
        entity.setRevision(row.revision);
      return entity;
    });
  }

  save(entity: T): void {
    this.db
      .prepare(
        "INSERT INTO entities(kind,id,data,revision) VALUES(?,?,?,0) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
      )
      .run(this.kind, entity.getId(), JSON.stringify(this.encode(entity)));
  }

  delete(entity: T): void {
    const dependent = this.db
      .prepare("SELECT kind FROM entities WHERE kind != ? AND data LIKE ? LIMIT 1")
      .get(this.kind, `%${entity.getId()}%`) as { kind: string } | undefined;
    ensure(!dependent, "Нельзя удалить запись с зависимыми данными", 409);
    this.db
      .prepare("DELETE FROM entities WHERE kind=? AND id=?")
      .run(this.kind, entity.getId());
  }
}
