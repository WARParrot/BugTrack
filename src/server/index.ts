import "dotenv/config";
import { buildApp } from "./app.js";
const app = await buildApp();
await app.listen({
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3001),
});
console.log("BugTrack: http://localhost:" + (process.env.PORT ?? 3001));
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => void app.close());
