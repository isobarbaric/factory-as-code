from sqlalchemy import Engine, select
from sqlmodel import Session

from ..models import Comment, CommentTarget


class CommentRepository:
    def __init__(self, engine: Engine):
        self.engine = engine

    def list(self, repo_id: str, target_type: CommentTarget, target_id: str) -> list[Comment]:
        query = (
            select(Comment)
            .where(
                Comment.repo_id == repo_id,
                Comment.target_type == target_type,
                Comment.target_id == target_id,
            )
            .order_by(Comment.created_at, Comment.comment_id)
        )
        with Session(self.engine) as session:
            return list(session.execute(query).scalars().all())
