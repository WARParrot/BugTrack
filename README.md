# BugTrack (.NET 10)

Backend of the BugTrack bug tracker as a single ASP.NET Core MVC-style Web API project.
No frontend; the HTTP API is designed to be consumed by one later.

## Project layout

```
BugTrack.sln
scripts/smoke_test.py          black-box end-to-end test of the HTTP API (stdlib Python)
BugTrack/
  Controllers/                 thin API controllers: bind request → call a service → return a DTO
  DTO/                         what crosses the HTTP boundary
    Requests/                    request models with validation attributes
    Responses/                   response envelopes ({ "ticket": … }) and { "error": … }
    *.cs, Mappers.cs             response DTOs and Entity → DTO mapping
  Models/                      domain entities, value objects and business rules (Ticket, Project, …)
    Enums/                       Role, TicketStatus, TicketPriority, AttachmentType, TicketEventType
  Services/                    business logic (AuthenticationService, TicketService, …)
    Interfaces/                  service contracts injected into controllers
  Repositories/                EF Core repositories (UserRepository, TicketRepository, …)
    Interfaces/                  repository contracts from the class diagram
  Data/                        BugTrackDbContext, entity configurations, transactions, DB initializer
    Configurations/
  Infrastructure/              cross-cutting: error handling, cookie session, DI extension methods
  Migrations/                  EF Core migrations (empty until you add the first one)
  Properties/launchSettings.json
  Program.cs, appsettings*.json, BugTrack.csproj
```

Request flow: `Controller → IService → IRepository → DbContext`. Controllers only see request models, DTOs and
service interfaces; services work with `Models` and return DTOs. This is enforced by convention (namespaces),
not by project boundaries, so keep it in mind in code review.

Class names follow the UML diagram (`Ticket`, `TicketService`, `TicketRepository` → `ITicketRepository`, …).
Diagram getters (`getStatus()`) are C# properties (`Status`).

## Run

Requires the .NET 10 SDK.

```bash
Admin__Email=admin@example.org Admin__Password='a-long-password' dotnet run --project BugTrack
# → http://127.0.0.1:3001
python3 scripts/smoke_test.py http://127.0.0.1:3001 admin@example.org 'a-long-password'
```

| Setting (env var form)        | Default                | Meaning                                                              |
|-------------------------------|------------------------|----------------------------------------------------------------------|
| `Urls`                        | `http://127.0.0.1:3001`| listen address (was `HOST`/`PORT`)                                   |
| `Database__Path`              | `.data/bugtrack.sqlite`| SQLite file (was `DATABASE_PATH`)                                    |
| `Admin__Email` / `__Password` / `__Name` | –           | bootstrap administrator, password ≥ 12 chars; **required in Production** (was `ADMIN_*`) |
| `DataProtection__KeysPath`    | `.data/keys`           | where cookie-encryption keys are stored (replaces `JWT_SECRET`)      |
| `Cors__AllowedOrigins__0` …   | none                   | origins allowed to call the API with credentials                     |
| `ASPNETCORE_ENVIRONMENT`      | `Production`           | in Production the session cookie is `Secure`                         |

## Database and migrations

SQLite via EF Core. Until the `Migrations` folder contains migrations, the schema is created directly from the
model on first start. To switch to migrations:

```bash
dotnet tool install --global dotnet-ef        # once
dotnet ef migrations add InitialCreate --project BugTrack
```

From then on `DatabaseInitializer` applies pending migrations automatically at startup.

## API (unchanged from the TypeScript version)

All routes except `health`, `register` and `login` need the session cookie. Errors are `{ "error": "<message>" }`
(400 validation, 401 not signed in, 403 forbidden, 404, 409 conflict). Enums are sent as names
(`PROJECT_MANAGER`, `READY_FOR_REVIEW`, …); timestamps are UTC ISO-8601; `releasedAt` is `yyyy-MM-dd`.

```
GET  /api/health
POST /api/auth/register | login | logout        GET /api/auth/me
GET|POST /api/projects                          GET /api/projects/{id}
POST /api/projects/{id}/members                 PATCH|DELETE /api/projects/{id}/members/{userId}
PUT  /api/projects/{id}/repository
GET|POST /api/projects/{id}/tickets             GET /api/tickets/{id}      GET /api/tickets/{id}/events
POST /api/tickets/{id}/assign | take | decline | submit-fix | close | reopen | archive
PUT  /api/tickets/{id}/release | priority | deadline
POST /api/tickets/{id}/comments | attachments
GET|POST /api/releases
GET  /api/notifications[?unreadOnly=true]       POST /api/notifications/{id}/read
```

For a browser frontend: use `fetch(..., { credentials: "include" })`; the cookie is `HttpOnly; SameSite=Strict`,
so the frontend must be served from the same *site* (same host, any port is fine) or behind the same reverse proxy.
Add the dev-server origin to `Cors:AllowedOrigins`.

## Differences from the TypeScript version

* Sessions use ASP.NET Core cookie authentication (encrypted with Data Protection keys) instead of a JWT in a cookie.
  Same cookie name, 8 h lifetime, logout still invalidates all of a user's sessions.
* Passwords are PBKDF2-HMAC-SHA512 (scrypt is not in the .NET base library). **Existing TypeScript databases are not
  readable by this version** (different storage layout and password hash format).
* Validation errors name the offending field (`Некорректное поле: name`) instead of echoing zod messages.
* Domain/business error messages are kept in Russian, as in the original.
