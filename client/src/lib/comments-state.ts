export type CommentTreeItem = {
  id: number;
  parentId: number | null;
};

export type CommentTreeNode<T extends CommentTreeItem> = {
  comment: T;
  children: CommentTreeNode<T>[];
};

export function buildCommentForest<T extends CommentTreeItem>(comments: T[]): CommentTreeNode<T>[] {
  const nodes = new Map<number, CommentTreeNode<T>>(
    comments.map((comment) => [comment.id, { comment, children: [] }]),
  );
  const roots: CommentTreeNode<T>[] = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId == null ? undefined : nodes.get(comment.parentId);
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function commentIndentStep(depth: number): number {
  return depth > 0 && depth <= 4 ? 10 : 0;
}

export function removeCommentThread<T extends CommentTreeItem>(comments: T[], deletedId: number): T[] {
  const removed = new Set<number>([deletedId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const comment of comments) {
      if (comment.parentId != null && removed.has(comment.parentId) && !removed.has(comment.id)) {
        removed.add(comment.id);
        changed = true;
      }
    }
  }
  return comments.filter((comment) => !removed.has(comment.id));
}
