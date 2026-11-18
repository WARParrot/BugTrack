import type { Entity } from "../domain/entity.js";
export interface Repository<T extends Entity> {
  findById(id: string): T | undefined;
  findAll(): T[];
  save(entity: T): void;
  delete(entity: T): void;
}
