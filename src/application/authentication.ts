import { DomainError } from "../domain/entity.js";
import { Email, User } from "../domain/user.js";
import type { Repository } from "./repository.js";
export interface UserRepository extends Repository<User> {
  findByEmail(email: Email): User | undefined;
}
export class AuthenticationService {
  constructor(private readonly users: UserRepository) {}
  register(fullName: string, email: Email, passwordHash: string): User {
    if (this.users.findByEmail(email))
      throw new DomainError(409, "Email уже зарегистрирован");
    const user = new User(fullName, email, passwordHash);
    this.users.save(user);
    return user;
  }
  authenticate(email: Email, passwordHash: string): User {
    const user = this.users.findByEmail(email);
    if (!user || user.getPasswordHash() !== passwordHash)
      throw new DomainError(401, "Неверный email или пароль");
    return user;
  }
}
