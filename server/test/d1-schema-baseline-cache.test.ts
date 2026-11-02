import { test } from "vitest";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../src/storage/factory.ts";

function createValidBaselineSqlite(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY, slug TEXT, title TEXT, content TEXT, excerpt TEXT, cover_color TEXT,
      published INTEGER, listed INTEGER, created_at TEXT, updated_at TEXT, view_count INTEGER,
      pinned INTEGER, publish_at TEXT, series_slug TEXT, series_order INTEGER, category TEXT,
      cover_image TEXT, card_width TEXT, card_height TEXT
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE pages (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, content TEXT, sort_order INTEGER, published INTEGER, show_in_nav INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id INTEGER, author_name TEXT, author_email TEXT, content TEXT, approved INTEGER, parent_id INTEGER, is_admin INTEGER, created_at TEXT);
    CREATE TABLE guestbook_messages (id INTEGER PRIMARY KEY, author_name TEXT, author_email TEXT, content TEXT, approved INTEGER, created_at TEXT);
    CREATE TABLE friend_links (id INTEGER PRIMARY KEY, name TEXT, url TEXT, description TEXT, avatar_url TEXT, owner_name TEXT, owner_email TEXT, status TEXT, source TEXT, sort_order INTEGER, created_at TEXT, updated_at TEXT, reviewed_at TEXT);
    CREATE TABLE post_versions (id INTEGER PRIMARY KEY, post_id INTEGER, title TEXT, content TEXT, excerpt TEXT, created_at TEXT);
    CREATE TABLE reactions (id INTEGER PRIMARY KEY, post_slug TEXT, type TEXT, ip_hash TEXT, created_at TEXT);
    CREATE TABLE visits (id INTEGER PRIMARY KEY, path TEXT, country TEXT, referer_domain TEXT, device_type TEXT, created_at TEXT);
  `);
  return sqlite;
}

interface MockD1Result {
  d1: any;
  getQueryCount: () => number;
  getExecutedQueries: () => string[];
  sqlite: DatabaseSync;
}

function createMockD1(sqlite: DatabaseSync = createValidBaselineSqlite()): MockD1Result {
  let queryCount = 0;
  const executedQueries: string[] = [];

  const d1 = {
    prepare(query: string) {
      return {
        _query: query,
        _params: [] as unknown[],
        bind(...params: unknown[]) {
          this._params = params;
          return this;
        },
        async run() {
          queryCount++;
          executedQueries.push(this._query);
          const stmt = sqlite.prepare(this._query);
          const results = stmt.all(...(this._params as any[]));
          return { results, success: true, meta: { changes: 0 } };
        },
        async all() {
          queryCount++;
          executedQueries.push(this._query);
          const stmt = sqlite.prepare(this._query);
          const results = stmt.all(...(this._params as any[]));
          return { results, success: true, meta: { changes: 0 } };
        },
      };
    },
  };

  return {
    d1,
    getQueryCount: () => queryCount,
    getExecutedQueries: () => [...executedQueries],
    sqlite,
  };
}

test("createDatabase with same D1 binding reuses cached baseline check instead of running baseline queries repeatedly", async () => {
  const mock = createMockD1();

  // First call: runs baseline queries (18 queries for 9 tables)
  const db1 = await createDatabase({ DB: mock.d1 });
  assert.ok(db1, "db1 should be created");
  const firstCount = mock.getQueryCount();
  assert.equal(firstCount, 18, "first call should run exactly 18 baseline queries");

  // Second call with same DB binding: should reuse cache without running any queries
  const db2 = await createDatabase({ DB: mock.d1 });
  assert.ok(db2, "db2 should be created");
  const secondCount = mock.getQueryCount();
  assert.equal(secondCount, 18, "second call with same binding should not re-run baseline queries");
});

test("concurrent createDatabase calls for same D1 binding single-flight to one baseline check", async () => {
  const mock = createMockD1();

  // 5 concurrent calls launched simultaneously
  const [db1, db2, db3, db4, db5] = await Promise.all([
    createDatabase({ DB: mock.d1 }),
    createDatabase({ DB: mock.d1 }),
    createDatabase({ DB: mock.d1 }),
    createDatabase({ DB: mock.d1 }),
    createDatabase({ DB: mock.d1 }),
  ]);

  assert.ok(db1 && db2 && db3 && db4 && db5, "all adapters should be created");
  // Fresh adapter creation is preserved
  assert.notEqual(db1, db2, "each call creates a fresh adapter instance");
  assert.notEqual(db2, db3, "each call creates a fresh adapter instance");

  const totalQueries = mock.getQueryCount();
  assert.equal(totalQueries, 18, "single-flight must deduplicate concurrent baseline checks to exactly 18 queries");
});

test("failed baseline checks evict from cache to allow subsequent retry", async () => {
  // Create an incomplete database (missing 'visits' table)
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY, slug TEXT, title TEXT, content TEXT, excerpt TEXT, cover_color TEXT,
      published INTEGER, listed INTEGER, created_at TEXT, updated_at TEXT, view_count INTEGER,
      pinned INTEGER, publish_at TEXT, series_slug TEXT, series_order INTEGER, category TEXT,
      cover_image TEXT, card_width TEXT, card_height TEXT
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE pages (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, content TEXT, sort_order INTEGER, published INTEGER, show_in_nav INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id INTEGER, author_name TEXT, author_email TEXT, content TEXT, approved INTEGER, parent_id INTEGER, is_admin INTEGER, created_at TEXT);
    CREATE TABLE guestbook_messages (id INTEGER PRIMARY KEY, author_name TEXT, author_email TEXT, content TEXT, approved INTEGER, created_at TEXT);
    CREATE TABLE friend_links (id INTEGER PRIMARY KEY, name TEXT, url TEXT, description TEXT, avatar_url TEXT, owner_name TEXT, owner_email TEXT, status TEXT, source TEXT, sort_order INTEGER, created_at TEXT, updated_at TEXT, reviewed_at TEXT);
    CREATE TABLE post_versions (id INTEGER PRIMARY KEY, post_id INTEGER, title TEXT, content TEXT, excerpt TEXT, created_at TEXT);
    CREATE TABLE reactions (id INTEGER PRIMARY KEY, post_slug TEXT, type TEXT, ip_hash TEXT, created_at TEXT);
    -- 'visits' table is intentionally missing
  `);

  const mock = createMockD1(sqlite);

  // First call should fail due to missing 'visits' table
  await assert.rejects(
    async () => {
      await createDatabase({ DB: mock.d1 });
    },
    (err: Error) => {
      assert.match(err.message, /缺少表：visits/);
      return true;
    }
  );

  // Now fix the schema by creating the missing 'visits' table
  sqlite.exec(`
    CREATE TABLE visits (id INTEGER PRIMARY KEY, path TEXT, country TEXT, referer_domain TEXT, device_type TEXT, created_at TEXT);
  `);

  // Second call with same binding: must retry and succeed now that schema is fixed
  const db = await createDatabase({ DB: mock.d1 });
  assert.ok(db, "adapter should be created successfully on retry");

  // Third call with same binding: should be cached
  const queryCountBeforeThird = mock.getQueryCount();
  const dbCached = await createDatabase({ DB: mock.d1 });
  assert.ok(dbCached, "adapter should be created from cache");
  assert.equal(mock.getQueryCount(), queryCountBeforeThird, "third call must reuse successful cache");
});

test("different D1 database bindings remain isolated", async () => {
  const mockA = createMockD1();
  const mockB = createMockD1();

  // Baseline check on binding A
  const dbA = await createDatabase({ DB: mockA.d1 });
  assert.ok(dbA, "dbA created");
  assert.equal(mockA.getQueryCount(), 18, "mockA ran 18 baseline queries");
  assert.equal(mockB.getQueryCount(), 0, "mockB has not been queried yet");

  // Baseline check on binding B (should not be satisfied by mockA's cache)
  const dbB = await createDatabase({ DB: mockB.d1 });
  assert.ok(dbB, "dbB created");
  assert.equal(mockB.getQueryCount(), 18, "mockB must run its own baseline queries");

  // Repeat calls on both: both hit their respective caches
  await createDatabase({ DB: mockA.d1 });
  await createDatabase({ DB: mockB.d1 });
  assert.equal(mockA.getQueryCount(), 18, "mockA still at 18 queries (cache hit)");
  assert.equal(mockB.getQueryCount(), 18, "mockB still at 18 queries (cache hit)");
});

test("missing table check fails and does not pollute cache", async () => {
  const sqlite = new DatabaseSync(":memory:");
  // Create all tables except 'comments'
  sqlite.exec(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY, slug TEXT, title TEXT, content TEXT, excerpt TEXT, cover_color TEXT,
      published INTEGER, listed INTEGER, created_at TEXT, updated_at TEXT, view_count INTEGER,
      pinned INTEGER, publish_at TEXT, series_slug TEXT, series_order INTEGER, category TEXT,
      cover_image TEXT, card_width TEXT, card_height TEXT
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE pages (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, content TEXT, sort_order INTEGER, published INTEGER, show_in_nav INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE guestbook_messages (id INTEGER PRIMARY KEY, author_name TEXT, author_email TEXT, content TEXT, approved INTEGER, created_at TEXT);
    CREATE TABLE friend_links (id INTEGER PRIMARY KEY, name TEXT, url TEXT, description TEXT, avatar_url TEXT, owner_name TEXT, owner_email TEXT, status TEXT, source TEXT, sort_order INTEGER, created_at TEXT, updated_at TEXT, reviewed_at TEXT);
    CREATE TABLE post_versions (id INTEGER PRIMARY KEY, post_id INTEGER, title TEXT, content TEXT, excerpt TEXT, created_at TEXT);
    CREATE TABLE reactions (id INTEGER PRIMARY KEY, post_slug TEXT, type TEXT, ip_hash TEXT, created_at TEXT);
    CREATE TABLE visits (id INTEGER PRIMARY KEY, path TEXT, country TEXT, referer_domain TEXT, device_type TEXT, created_at TEXT);
  `);
  const mock = createMockD1(sqlite);

  await assert.rejects(
    async () => {
      await createDatabase({ DB: mock.d1 });
    },
    (err: Error) => {
      assert.match(err.message, /缺少表：comments/);
      assert.match(err.message, /npm run db:migrate:local/);
      return true;
    }
  );
});

test("missing column check fails and does not pollute cache", async () => {
  const sqlite = new DatabaseSync(":memory:");
  // Create posts table without card_width and card_height
  sqlite.exec(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY, slug TEXT, title TEXT, content TEXT, excerpt TEXT, cover_color TEXT,
      published INTEGER, listed INTEGER, created_at TEXT, updated_at TEXT, view_count INTEGER,
      pinned INTEGER, publish_at TEXT, series_slug TEXT, series_order INTEGER, category TEXT,
      cover_image TEXT
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE pages (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, content TEXT, sort_order INTEGER, published INTEGER, show_in_nav INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id INTEGER, author_name TEXT, author_email TEXT, content TEXT, approved INTEGER, parent_id INTEGER, is_admin INTEGER, created_at TEXT);
    CREATE TABLE guestbook_messages (id INTEGER PRIMARY KEY, author_name TEXT, author_email TEXT, content TEXT, approved INTEGER, created_at TEXT);
    CREATE TABLE friend_links (id INTEGER PRIMARY KEY, name TEXT, url TEXT, description TEXT, avatar_url TEXT, owner_name TEXT, owner_email TEXT, status TEXT, source TEXT, sort_order INTEGER, created_at TEXT, updated_at TEXT, reviewed_at TEXT);
    CREATE TABLE post_versions (id INTEGER PRIMARY KEY, post_id INTEGER, title TEXT, content TEXT, excerpt TEXT, created_at TEXT);
    CREATE TABLE reactions (id INTEGER PRIMARY KEY, post_slug TEXT, type TEXT, ip_hash TEXT, created_at TEXT);
    CREATE TABLE visits (id INTEGER PRIMARY KEY, path TEXT, country TEXT, referer_domain TEXT, device_type TEXT, created_at TEXT);
  `);
  const mock = createMockD1(sqlite);

  await assert.rejects(
    async () => {
      await createDatabase({ DB: mock.d1 });
    },
    (err: Error) => {
      assert.match(err.message, /缺少列：posts\.card_width, posts\.card_height/);
      assert.match(err.message, /npm run db:reconcile/);
      return true;
    }
  );
});

test("missing DB binding throws error", async () => {
  await assert.rejects(
    async () => {
      await createDatabase({});
    },
    (err: Error) => {
      assert.match(err.message, /缺少 D1 数据库绑定 \(env\.DB\)/);
      return true;
    }
  );
});

test("AUTO_SCHEMA_MIGRATION=true does not satisfy or use read-only baseline cache", async () => {
  const mock = createMockD1();

  // Call with AUTO_SCHEMA_MIGRATION=true
  const db1 = await createDatabase({ DB: mock.d1, AUTO_SCHEMA_MIGRATION: "true" });
  assert.ok(db1, "db1 created with auto migration");

  // ensureSchema does ALTER TABLE/CREATE TABLE IF NOT EXISTS queries, not baseline queries
  const autoMigrationQueries = mock.getExecutedQueries();
  const ranBaselineQuery = autoMigrationQueries.some((q) => q.includes("sqlite_master WHERE type = 'table'"));
  assert.equal(ranBaselineQuery, false, "ensureSchema does not run sqlite_master baseline queries");

  // Now call with default (AUTO_SCHEMA_MIGRATION=false)
  // It MUST run the real read-only baseline check (not bypassed by the prior AUTO_SCHEMA_MIGRATION run)
  const countBeforeBaseline = mock.getQueryCount();
  const db2 = await createDatabase({ DB: mock.d1, AUTO_SCHEMA_MIGRATION: "false" });
  assert.ok(db2, "db2 created with baseline check");
  const countAfterBaseline = mock.getQueryCount();
  assert.equal(countAfterBaseline - countBeforeBaseline, 18, "baseline check must run 18 queries");

  // Subsequent call with AUTO_SCHEMA_MIGRATION=false uses the cached baseline
  await createDatabase({ DB: mock.d1, AUTO_SCHEMA_MIGRATION: "false" });
  assert.equal(mock.getQueryCount(), countAfterBaseline, "cached baseline reused");
});
