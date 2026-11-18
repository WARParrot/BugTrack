import { randomUUID } from "node:crypto";

export abstract class Entity {
  protected constructor(protected readonly id: string = randomUUID()) {}

  getId(): string {
    return this.id;
  }
}

export class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function ensure(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new DomainError(status, message);
}

export function text(
  value: string,
  label: string,
  max = 10000,
  allowEmpty = false,
): string {
  const result = value.trim();
  ensure(
    (allowEmpty || result.length > 0) && result.length <= max,
    `${label}: до ${max} символов${allowEmpty ? "" : " (не пустое значение)"}`,
  );
  return result;
}
