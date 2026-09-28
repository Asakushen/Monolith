import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { TursoAdapter } from "../src/storage/db/turso.ts";
import { createDatabase } from "../src/storage/factory.ts";
import { toCommentReplyErrorResponse } from "../src/comment-reply-errors.ts";

test("Turso allows arbitrary-depth approved admin replies", async () => {
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

    const { reply: nested } = await adapter.addCommentReply(reply.id, { authorName: "Author", content: "Nested reply" });
    assert.equal(nested.parentId, reply.id);
    assert.equal(nested.approved, true);
    assert.equal((await adapter.getApprovedComments("reply-test")).length, 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("public replies stay pending and require an approved parent on the same post", async () => {
  const directory = await mkdtemp(join(tmpdir(), "monolith-public-replies-"));
  try {
    const adapter = new TursoAdapter(`file:${join(directory, "test.db")}`);
    await adapter.ensureCoreTables();
    await adapter.createPost({ slug: "one", title: "One", content: "Body" });
    await adapter.createPost({ slug: "two", title: "Two", content: "Body" });
    const parent = await adapter.addComment({ postSlug: "one", authorName: "Reader", authorEmail: "reader@example.com", content: "Parent" });
    await assert.rejects(adapter.addComment({ postSlug: "one", authorName: "Other", content: "Too soon", parentId: parent.id }), /只能回复同一文章中已审核的评论/);
    await adapter.approveComment(parent.id);
    await assert.rejects(adapter.addComment({ postSlug: "two", authorName: "Other", content: "Wrong post", parentId: parent.id }), /只能回复同一文章中已审核的评论/);
    const reply = await adapter.addComment({ postSlug: "one", authorName: "Other", authorEmail: "other@example.com", content: "Pending reply", parentId: parent.id });
    assert.equal(reply.approved, false);
    assert.equal(reply.parentId, parent.id);
    assert.equal((await adapter.getApprovedComments("one")).length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("approval reports a pending reply exactly once with its direct parent", async () => {
  const directory = await mkdtemp(join(tmpdir(), "monolith-reply-approval-"));
  try {
    const adapter = new TursoAdapter(`file:${join(directory, "test.db")}`);
    await adapter.ensureCoreTables();
    await adapter.createPost({ slug: "approval", title: "Approval", content: "Body" });
    const parent = await adapter.addComment({ postSlug: "approval", authorName: "Parent", authorEmail: "parent@example.com", content: "Parent" });
    await adapter.approveComment(parent.id);
    const reply = await adapter.addComment({ postSlug: "approval", authorName: "Child", authorEmail: "child@example.com", content: "Child", parentId: parent.id });
    const first = await adapter.approveComment(reply.id);
    const repeated = await adapter.approveComment(reply.id);
    assert.equal(first.found, true);
    assert.equal(first.becameApproved, true);
    assert.equal(first.parent?.id, parent.id);
    assert.equal(first.parent?.authorEmail, "parent@example.com");
    assert.equal(repeated.found, true);
    assert.equal(repeated.becameApproved, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("deleting a comment cascades through every descendant", async () => {
  const directory = await mkdtemp(join(tmpdir(), "monolith-reply-delete-"));
  try {
    const adapter = new TursoAdapter(`file:${join(directory, "test.db")}`);
    await adapter.ensureCoreTables();
    await adapter.createPost({ slug: "delete", title: "Delete", content: "Body" });
    const root = await adapter.addComment({ postSlug: "delete", authorName: "Root", content: "Root" });
    await adapter.approveComment(root.id);
    const { reply: child } = await adapter.addCommentReply(root.id, { authorName: "Admin", content: "Child" });
    await adapter.addCommentReply(child.id, { authorName: "Admin", content: "Grandchild" });
    assert.equal(await adapter.deleteComment(root.id), true);
    assert.equal((await adapter.getAllComments()).length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
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
  const result = toCommentReplyErrorResponse(new Error("只能回复同一文章中已审核的评论"), (...args) => logged.push(args));

  assert.deepEqual(result, { error: "只能回复同一文章中已审核的评论", status: 400 });
  assert.equal(logged.length, 0);
});
