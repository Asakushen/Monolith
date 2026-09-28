import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { TursoAdapter } from "../src/storage/db/turso.ts";
import { createDatabase } from "../src/storage/factory.ts";
import { toCommentReplyErrorResponse } from "../src/comment-reply-errors.ts";

test("Turso rejects replying to an existing reply", async () => {
  const directory = await mkdtemp(join(tmpdir(), "monolith-comment-replies-"));
  try {
    const adapter = new TursoAdapter(`file:${join(directory, "test.db")}`);
    await adapter.ensureCoreTables();
    await adapter.createPost({
      slug: "reply-test",
      title: "Reply test",
      content: "Post body",
    });
    const parent = await adapter.addComment({
      postSlug: "reply-test",
      authorName: "Reader",
      authorEmail: "reader@example.com",
      content: "Parent",
    });
    await adapter.approveComment(parent.id);
    const { reply } = await adapter.addCommentReply(parent.id, {
      authorName: "Author",
      content: "First-level reply",
    });

    await assert.rejects(
      adapter.addCommentReply(reply.id, { authorName: "Author", content: "Nested reply" }),
      /只能回复已审核的一级评论/,
    );
    assert.equal((await adapter.getApprovedComments("reply-test")).length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the existing Turso factory lifecycle provisions the reply column", async () => {
  const directory = await mkdtemp(join(tmpdir(), "monolith-comment-schema-"));
  const databaseUrl = `file:${join(directory, "factory.db")}`;
  try {
    await createDatabase({ DB_PROVIDER: "turso", TURSO_URL: databaseUrl });
    const client = createClient({ url: databaseUrl });
    const result = await client.execute("PRAGMA table_info(comments)");

    assert.ok(result.rows.some((row) => row.name === "parent_id"));
    client.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("unexpected reply errors are logged and hidden from clients", () => {
  const logged: unknown[][] = [];
  const result = toCommentReplyErrorResponse(new Error("database credentials leaked"), (...args) => logged.push(args));

  assert.deepEqual(result, { error: "回复失败", status: 500 });
  assert.equal(logged.length, 1);
  assert.equal(logged[0][0], "Failed to add comment reply");
  assert.match(String(logged[0][1]), /database credentials leaked/);
});

test("ineligible parents retain a specific client error", () => {
  const logged: unknown[][] = [];
  const result = toCommentReplyErrorResponse(new Error("只能回复已审核的一级评论"), (...args) => logged.push(args));

  assert.deepEqual(result, { error: "只能回复已审核的一级评论", status: 400 });
  assert.equal(logged.length, 0);
});
