import type { Release } from "../domain/release.js";
import type { Repository } from "./repository.js";
export interface ReleaseRepository extends Repository<Release> {
  findByVersion(version: string): Release | undefined;
}
