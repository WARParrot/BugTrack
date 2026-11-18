import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";
import { Release } from "../src/domain/release.js";
import { SqliteReleaseRepository } from "../src/infrastructure/releases.js";
test("ReleaseRepository.findByVersion и Ticket.setRelease сохраняют исходную связь", () => {
  const f = fixture();
  try {
    const releases = new SqliteReleaseRepository(f.db);
    const release = new Release("1.0.0", "2026-11-18");
    releases.save(release);
    assert.equal(releases.findByVersion("1.0.0")?.getId(), release.getId());
    assert.throws(() => releases.save(new Release("1.0.0", "2026-11-19")));
    assert.equal(f.db.pragma("user_version", { simple: true }), 2);
    assert.throws(() => new Release("v", "2026-02-30"));
    const ticket = f.service.createTicket(
      f.project,
      f.tester,
      "Ошибка",
      "Описание",
      "LOW",
    );
    ticket.setRelease(release);
    f.repository.save(ticket);
    assert.equal(
      f.repository.findById(ticket.getId())?.release?.version,
      "1.0.0",
    );
  } finally {
    f.db.close();
  }
});
