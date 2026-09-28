import test from "node:test";
import assert from "node:assert/strict";
import { buildCommentReplyEmail } from "../src/comment-notifications.ts";

test("buildCommentReplyEmail escapes user content and links to the replied comment", () => {
  const message = buildCommentReplyEmail({
    recipientName: "<Reader>",
    replyAuthorName: "博主 & editor",
    replyContent: "谢谢 <script>alert(1)</script>",
    postTitle: "A & B",
    postSlug: "hello world",
    parentCommentId: 42,
    siteOrigin: "https://example.com/",
  });

  assert.equal(message.subject, "[Monolith] 你在《A & B》的评论收到了回复");
  assert.match(message.html, /你好，&lt;Reader&gt;：/);
  assert.match(message.html, /博主 &amp; editor/);
  assert.doesNotMatch(message.html, /<script>/);
  assert.match(message.html, /https:\/\/example\.com\/posts\/hello%20world#comment-42/);
});

import { shouldNotifyCommentReply } from "../src/comment-notifications.ts";

test("reply notifications require an approved parent with an email", () => {
  assert.equal(shouldNotifyCommentReply({ approved: true, authorEmail: " reader@example.com " }), true);
  assert.equal(shouldNotifyCommentReply({ approved: false, authorEmail: "reader@example.com" }), false);
  assert.equal(shouldNotifyCommentReply({ approved: true, authorEmail: "   " }), false);
});
