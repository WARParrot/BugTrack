import { Entity, ensure, text } from "./entity.js";
export class Release extends Entity {
  readonly version: string;
  readonly releasedAt: string;
  constructor(version: string, releasedAt: string) {
    super();
    this.version = text(version, "Версия", 100);
    this.releasedAt = releasedAt;
    ensure(
      /^\d{4}-\d{2}-\d{2}$/.test(releasedAt) &&
        Number.isFinite(Date.parse(releasedAt)) &&
        new Date(releasedAt).toISOString().slice(0, 10) === releasedAt,
      "Некорректная дата релиза",
    );
  }
  getVersion(): string {
    return this.version;
  }
}
