import { Entity, ensure, text } from "./entity.js";
export class Email {
  readonly value: string;
  constructor(value: string) {
    this.value = value.trim().toLowerCase();
    ensure(
      this.value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value),
      "Некорректный email",
    );
  }
  getValue(): string {
    return this.value;
  }
}
export class User extends Entity {
  readonly fullName: string;
  readonly createdAt: string;
  private passwordHash: string;
  readonly isAdmin: boolean;
  private sessionVersion = 0;

  constructor(
    fullName: string,
    readonly email: Email,
    passwordHash: string,
  ) {
    super();
    this.fullName = text(fullName, "Имя", 100);
    this.passwordHash = text(passwordHash, "Хеш пароля", 512);
    this.isAdmin = false;
    this.createdAt = new Date().toISOString();
  }
  static admin(fullName: string, email: Email, passwordHash: string): User {
    const user = new User(fullName, email, passwordHash);
    Object.defineProperty(user, "isAdmin", { value: true, writable: false });
    return user;
  }
  getSessionVersion(): number {
    return this.sessionVersion;
  }
  invalidateSessions(): void {
    this.sessionVersion += 1;
  }
  getFullName(): string {
    return this.fullName;
  }
  getEmail(): Email {
    return this.email;
  }
  getPasswordHash(): string {
    return this.passwordHash;
  }
  changePassword(newHash: string): void {
    this.passwordHash = text(newHash, "Хеш пароля", 512);
  }
}
export function publicUser(user: User) {
  return {
    id: user.getId(),
    fullName: user.fullName,
    email: user.email.value,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  };
}
