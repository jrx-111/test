/**
 * Todo 应用前端逻辑
 * 通过 fetch 调用后端 JSON API，负责渲染与交互
 */

// ---------- 常量与状态 ----------

const API = "/api/todos";          // 后端接口基础路径
let currentFilter = "all";         // 当前筛选状态：all / active / completed

// ---------- DOM 元素 ----------

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const listEl = document.getElementById("todo-list");
const emptyEl = document.getElementById("empty");
const counterEl = document.getElementById("counter");
const filtersEl = document.getElementById("filters");
const clearBtn = document.getElementById("clear-completed");
const todayEl = document.getElementById("today");

// 在标题下方显示今天的日期
todayEl.textContent = new Date().toLocaleDateString("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

// ---------- 通用请求封装 ----------

/**
 * 统一的 fetch 封装：自动带上 JSON 头并处理错误
 * @param {string} url     请求地址
 * @param {object} options fetch 配置项
 */
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => ({}));  // 响应体不是 JSON 时兜底

  if (!res.ok) {
    // 把后端返回的错误信息抛出去，由调用方提示
    throw new Error(data.error || `请求失败（${res.status}）`);
  }
  return data;
}

// ---------- 渲染 ----------

/** 根据当前筛选条件加载并渲染任务列表 */
async function loadTodos() {
  try {
    const todos = await request(`${API}?status=${currentFilter}`);
    renderTodos(todos);
    await loadStats();  // 同步刷新底部统计
  } catch (err) {
    alert(err.message);
  }
}

/** 把任务数组渲染到页面 */
function renderTodos(todos) {
  listEl.innerHTML = "";  // 先清空旧列表

  // 没有任务时显示空状态提示
  emptyEl.hidden = todos.length > 0;

  for (const todo of todos) {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " completed" : "");
    li.dataset.id = todo.id;

    // 完成状态复选框
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.title = todo.completed ? "标记为未完成" : "标记为已完成";
    checkbox.addEventListener("change", () => toggleTodo(todo.id, !todo.completed));

    // 任务标题（双击可编辑）
    const span = document.createElement("span");
    span.className = "todo-title";
    span.textContent = todo.title;
    span.title = "双击编辑";
    span.addEventListener("dblclick", () => startEdit(li, todo));

    // 删除按钮
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.title = "删除任务";
    delBtn.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, span, delBtn);
    listEl.appendChild(li);
  }
}

/** 刷新底部统计信息 */
async function loadStats() {
  try {
    const s = await request("/api/stats");
    counterEl.textContent = `${s.active} 项进行中 / 共 ${s.total} 项`;
    // 没有已完成任务时隐藏"清除已完成"按钮
    clearBtn.hidden = s.completed === 0;
  } catch {
    // 统计失败不影响主流程，静默忽略
  }
}

// ---------- 增删改操作 ----------

/** 添加新任务 */
async function addTodo(title) {
  try {
    await request(API, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    await loadTodos();
  } catch (err) {
    alert(err.message);
  }
}

/** 切换任务的完成状态 */
async function toggleTodo(id, completed) {
  try {
    await request(`${API}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    await loadTodos();
  } catch (err) {
    alert(err.message);
  }
}

/** 删除单个任务 */
async function deleteTodo(id) {
  try {
    await request(`${API}/${id}`, { method: "DELETE" });
    await loadTodos();
  } catch (err) {
    alert(err.message);
  }
}

/** 清除所有已完成的任务 */
async function clearCompleted() {
  try {
    await request(`${API}/completed`, { method: "DELETE" });
    await loadTodos();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- 双击编辑任务 ----------

/** 把标题变成输入框，回车保存、Esc 取消 */
function startEdit(li, todo) {
  const span = li.querySelector(".todo-title");

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = todo.title;
  editInput.maxLength = 200;
  editInput.className = "todo-title";
  span.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  let finished = false;  // 防止 blur 和回车重复提交

  // 保存修改
  const save = async () => {
    if (finished) return;
    finished = true;
    const newTitle = editInput.value.trim();
    if (newTitle && newTitle !== todo.title) {
      try {
        await request(`${API}/${todo.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: newTitle }),
        });
      } catch (err) {
        alert(err.message);
      }
    }
    await loadTodos();
  };

  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();          // 回车保存
    if (e.key === "Escape") { finished = true; loadTodos(); }  // Esc 取消
  });
  editInput.addEventListener("blur", save);  // 失焦也保存
}

// ---------- 事件绑定 ----------

// 表单提交：添加任务
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  addTodo(title);
  input.value = "";   // 添加后清空输入框
  input.focus();      // 焦点留在输入框，方便连续添加
});

// 筛选按钮：切换 all / active / completed
filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;

  currentFilter = btn.dataset.status;

  // 更新按钮的高亮状态
  filtersEl.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.toggle("active", b === btn);
  });

  loadTodos();
});

// 清除已完成
clearBtn.addEventListener("click", clearCompleted);

// ---------- 启动 ----------

loadTodos();  // 页面加载后立即拉取任务列表
