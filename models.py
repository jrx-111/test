"""数据库模型定义"""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

# 全局唯一的 SQLAlchemy 实例，在 app.py 中完成初始化
db = SQLAlchemy()


class Todo(db.Model):
    """待办任务模型"""

    __tablename__ = "todos"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # 主键
    title = db.Column(db.String(200), nullable=False)                 # 任务标题
    completed = db.Column(db.Boolean, default=False, nullable=False)  # 是否已完成
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),  # 使用 UTC 时间，避免时区问题
        nullable=False,
    )

    def to_dict(self):
        """把模型序列化成 JSON 友好的字典"""
        return {
            "id": self.id,
            "title": self.title,
            "completed": self.completed,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }

    def __repr__(self):  # 方便调试时打印
        return f"<Todo {self.id}: {self.title}>"
