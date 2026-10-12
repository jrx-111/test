# Vibe Todo · 待办清单

一个简约现代的 Todo 应用：Flask + SQLAlchemy + SQLite 后端，纯 HTML/CSS/JS 前端。

## 功能

- ✅ 添加、完成、删除任务（双击标题可编辑）
- 🔍 按状态筛选：全部 / 进行中 / 已完成
- 🧹 一键清除所有已完成任务
- 📊 底部实时统计
- 📱 移动端适配

## 快速开始

```powershell
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动服务
python app.py
```

浏览器访问 <http://127.0.0.1:5000> 即可使用。数据库文件 `todo.db` 会在首次运行时自动创建。

## 项目结构

```
vibe-todo/
├── app.py             # Flask 入口与 API 路由
├── models.py          # SQLAlchemy 数据模型
├── requirements.txt   # Python 依赖
├── todo.db            # SQLite 数据库（自动生成）
└── static/
    ├── index.html     # 页面结构
    ├── style.css      # 样式（简约现代风）
    └── script.js      # 前端逻辑（fetch 调用 API）
```

## API 一览

| 方法   | 路径                      | 说明                                   |
| ------ | ------------------------- | -------------------------------------- |
| GET    | `/api/todos?status=all`   | 获取任务列表（`all`/`active`/`completed`） |
| POST   | `/api/todos`              | 新增任务，请求体 `{"title": "..."}`     |
| PATCH  | `/api/todos/<id>`         | 更新任务（`title` 和/或 `completed`）   |
| DELETE | `/api/todos/<id>`         | 删除单个任务                            |
| DELETE | `/api/todos/completed`    | 清除所有已完成任务                      |
| GET    | `/api/stats`              | 任务数量统计                            |

所有接口均返回 JSON；出错时返回 `{"error": "错误信息"}` 及相应 HTTP 状态码。
