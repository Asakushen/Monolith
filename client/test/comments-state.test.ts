import test from "node:test";
import assert from "node:assert/strict";
import { removeCommentThread } from "../src/lib/comments-state.ts";

test("deleting a parent removes it and its replies from admin state", () => {
  const comments = [
    { id: 1, parentId: null, content: "parent" },
    { id: 2, parentId: 1, content: "reply" },
    { id: 3, parentId: null, content: "other" },
  ];

  assert.deepEqual(removeCommentThread(comments, 1), [comments[2]]);
});

test("deleting a reply preserves its parent", () => {
  const comments = [
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
  ];

  assert.deepEqual(removeCommentThread(comments, 2), [comments[0]]);
});
