export type CommentTreeItem = {
  id: number;
  parentId: number | null;
};

export function removeCommentThread<T extends CommentTreeItem>(comments: T[], deletedId: number): T[] {
  return comments.filter((comment) => comment.id !== deletedId && comment.parentId !== deletedId);
}
