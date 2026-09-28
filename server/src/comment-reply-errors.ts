export const INELIGIBLE_COMMENT_REPLY_ERROR = "只能回复同一文章中已审核的评论";

type ReplyErrorResponse = {
  error: string;
  status: 400 | 500;
};

type ErrorLogger = (...args: unknown[]) => void;

export function toCommentReplyErrorResponse(error: unknown, logError: ErrorLogger = console.error): ReplyErrorResponse {
  if (error instanceof Error && error.message === INELIGIBLE_COMMENT_REPLY_ERROR) {
    return { error: INELIGIBLE_COMMENT_REPLY_ERROR, status: 400 };
  }

  logError("Failed to add comment reply", error);
  return { error: "回复失败", status: 500 };
}
