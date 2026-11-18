import { ensure, type Entity } from "../domain/entity.js";

export function rehydrate<T extends Entity>(
  entity: T,
  id: string,
  state: Record<string, unknown> = {},
): T {
  ensure(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
    "Некорректный UUID в хранилище",
    500,
  );
  Object.defineProperty(entity, "id", { value: id, writable: false });
  for (const [key, value] of Object.entries(state))
    Object.defineProperty(entity, key, {
      value,
      writable: true,
      configurable: true,
    });
  return entity;
}
