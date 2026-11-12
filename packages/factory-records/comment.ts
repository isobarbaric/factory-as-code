export type CommentTarget = "document" | "ticket";

export interface Comment {
  repo_id: string;
  comment_id: string;
  target_type: CommentTarget;
  target_id: string;
  author: string;
  body: string;
  resolved: boolean;
  created_at: string;
}
