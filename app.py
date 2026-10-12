"""Todo 应用后端入口：Flask + SQLAlchemy + SQLite

运行方式：
    python app.py
然后浏览器访问 http://127.0.0.1:5000
"""
import os

from flask import Flask, jsonify, request, send_from_directory

from models import Todo, db

# ---------- 应用初始化 ----------

app = Flask(__name__, static_folder="static", static_url_path="")

# 数据库文件放在项目根目录下的 todo.db
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "todo.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # 关闭事件追踪，节省内存
app.json.ensure_ascii = False                         # 让 JSON 响应直接输出中文而非 \uXXXX 转义

db.init_app(app)

# 首次运行时自动建表
with app.app_context():
    db.create_all()


# ---------- 工具函数 ----------

def error(message, status=400):
    """统一的 JSON 错误响应"""
    return jsonify({"error": message}), status


# ---------- 页面路由 ----------

@app.route("/")
def index():
    """返回前端页面"""
    return send_from_directory(app.static_folder, "index.html")


# ---------- API 路由 ----------

@app.route("/api/todos", methods=["GET"])
def list_todos():
    """获取任务列表，支持 ?status=all|active|completed 筛选"""
    status = request.args.get("status", "all")

    query = Todo.query
    if status == "active":
        query = query.filter_by(completed=False)   # 只看未完成
    elif status == "completed":
        query = query.filter_by(completed=True)    # 只看已完成
    elif status != "all":
        return error("无效的筛选参数，可选值：all / active / completed")

    # 按创建时间倒序，最新的排在最前面
    todos = query.order_by(Todo.created_at.desc()).all()
    return jsonify([t.to_dict() for t in todos])


@app.route("/api/todos", methods=["POST"])
def create_todo():
    """新增任务，请求体：{"title": "任务内容"}"""
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()

    if not title:
        return error("任务标题不能为空")
    if len(title) > 200:
        return error("任务标题不能超过 200 个字符")

    todo = Todo(title=title)
    db.session.add(todo)
    db.session.commit()
    return jsonify(todo.to_dict()), 201


@app.route("/api/todos/<int:todo_id>", methods=["PATCH"])
def update_todo(todo_id):
    """更新任务，请求体可包含 title 和 / 或 completed"""
    todo = db.session.get(Todo, todo_id)
    if todo is None:
        return error("任务不存在", 404)

    data = request.get_json(silent=True) or {}

    # 更新标题（如果传了 title 字段）
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return error("任务标题不能为空")
        if len(title) > 200:
            return error("任务标题不能超过 200 个字符")
        todo.title = title

    # 更新完成状态（如果传了 completed 字段）
    if "completed" in data:
        todo.completed = bool(data.get("completed"))

    db.session.commit()
    return jsonify(todo.to_dict())


@app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):
    """删除单个任务"""
    todo = db.session.get(Todo, todo_id)
    if todo is None:
        return error("任务不存在", 404)

    db.session.delete(todo)
    db.session.commit()
    return jsonify({"message": "删除成功", "id": todo_id})


@app.route("/api/stats", methods=["GET"])
def stats():
    """返回任务统计信息，供前端底部状态栏使用"""
    total = Todo.query.count()
    completed = Todo.query.filter_by(completed=True).count()
    return jsonify({"total": total, "completed": completed, "active": total - completed})


@app.route("/api/todos/completed", methods=["DELETE"])
def clear_completed():
    """一键清除所有已完成的任务"""
    count = Todo.query.filter_by(completed=True).delete()
    db.session.commit()
    return jsonify({"message": "已清除完成的任务", "deleted": count})


# ---------- 错误处理 ----------

@app.errorhandler(404)
def not_found(e):
    """未匹配到路由时返回 JSON（仅限 API 请求）"""
    if request.path.startswith("/api/"):
        return error("接口不存在", 404)
    return e


@app.errorhandler(405)
def method_not_allowed(e):
    """请求方法不允许"""
    return error("请求方法不允许", 405)


@app.errorhandler(500)
def server_error(e):
    """服务器内部错误"""
    db.session.rollback()  # 出错时回滚，避免会话残留脏数据
    return error("服务器内部错误", 500)


if __name__ == "__main__":
    # 开发模式启动，debug=True 支持代码热重载
    app.run(host="127.0.0.1", port=5000, debug=True)
