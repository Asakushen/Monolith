import test from "node:test";
import assert from "node:assert/strict";
import { buildCommentForest, commentIndentStep, removeCommentThread } from "../src/lib/comments-state.ts";

test("deleting a parent removes it and its replies from admin state", () => {
  const comments = [
    { id: 1, parentId: null, content: "parent" },
    { id: 2, parentId: 1, content: "reply" },
    { id: 3, parentId: 2, content: "grandchild" },
    { id: 4, parentId: null, content: "other" },
  ];

  assert.deepEqual(removeCommentThread(comments, 1), [comments[3]]);
});

test("deleting a reply preserves its parent", () => {
  const comments = [
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
  ];

  assert.deepEqual(removeCommentThread(comments, 2), [comments[0]]);
});


test("buildCommentForest preserves arbitrary depth and orphans visibly", () => {
  const comments = [
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
    { id: 3, parentId: 2 },
    { id: 4, parentId: 999 },
  ];
  const forest = buildCommentForest(comments);
  assert.deepEqual(forest.map((node) => node.comment.id), [1, 4]);
  assert.equal(forest[0].children[0].children[0].comment.id, 3);
});


test("comment indentation stops increasing after four nested levels", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 10].map(commentIndentStep), [0, 10, 10, 10, 10, 0, 0]);
});
