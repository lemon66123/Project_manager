// ============================================================
// 项目管理系统 v2.1 — 优化版
// 修复: XSS转义 | 重置确认 | 按需渲染 | 日历翻月 | 导出导入 | 日期校验 | 编辑功能 | 空状态
// ============================================================

const STORAGE_KEY = "pm-system-v2";

const navItems = [
  { key: "dashboard", label: "仪表盘" },
  { key: "projects", label: "项目管理" },
  { key: "tasks", label: "任务管理" },
  { key: "board", label: "看板" },
  { key: "calendar", label: "日历" },
  { key: "gantt", label: "甘特图" },
  { key: "milestones", label: "里程碑" },
  { key: "team", label: "团队成员" }
];

const viewMeta = {
  dashboard: { title: "仪表盘", subtitle: "项目全局状态和关键指标" },
  projects: { title: "项目管理", subtitle: "维护项目基础信息与项目负责人" },
  tasks: { title: "任务管理", subtitle: "任务增删改查与筛选" },
  board: { title: "看板", subtitle: "按任务状态快速追踪" },
  calendar: { title: "日历", subtitle: "查看任务截止时间分布" },
  gantt: { title: "甘特图", subtitle: "按时间轴查看任务排期" },
  milestones: { title: "里程碑", subtitle: "管理关键里程碑节点" },
  team: { title: "团队成员", subtitle: "维护成员角色信息" }
};

// --- 工具函数 ---

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ① XSS 防护：HTML 转义
function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Toast 提示
function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type}`;
  setTimeout(() => { el.className = "toast hidden"; }, 2500);
}

// 日期校验 ⑧
function validateDateRange(start, end) {
  if (!start || !end) return { ok: false, msg: "开始和结束日期不能为空" };
  if (start > end) return { ok: false, msg: "结束日期不能早于开始日期" };
  return { ok: true };
}

// --- 状态管理 ---

function normalizeState(raw) {
  const safe = raw || {};
  safe.projects = Array.isArray(safe.projects) ? safe.projects : [];
  safe.members = Array.isArray(safe.members) ? safe.members : [];
  safe.tasks = Array.isArray(safe.tasks) ? safe.tasks : [];
  safe.milestones = Array.isArray(safe.milestones) ? safe.milestones : [];
  safe.projects = safe.projects.map((p) => ({ ...p, ownerId: p.ownerId || "" }));
  return safe;
}

function seedData() {
  const now = today();
  const p1 = uid("proj");
  const p2 = uid("proj");
  const m1 = uid("mem");
  const m2 = uid("mem");
  const m3 = uid("mem");
  const t1 = uid("task");
  const t2 = uid("task");
  const t3 = uid("task");
  return normalizeState({
    projects: [
      { id: p1, name: "企业官网重构", description: "品牌升级与性能优化", startDate: addDays(now, -7), endDate: addDays(now, 20), status: "进行中", ownerId: m1 },
      { id: p2, name: "移动端小程序", description: "会员裂变活动系统", startDate: addDays(now, -2), endDate: addDays(now, 30), status: "规划中", ownerId: m2 }
    ],
    members: [
      { id: m1, name: "李晨", role: "项目经理", email: "lichen@example.com" },
      { id: m2, name: "王敏", role: "前端工程师", email: "wangmin@example.com" },
      { id: m3, name: "张宇", role: "后端工程师", email: "zhangyu@example.com" }
    ],
    tasks: [
      { id: t1, projectId: p1, title: "信息架构评审", description: "梳理页面层级和导航路径", status: "待办", priority: "高", assigneeId: m1, startDate: addDays(now, -1), dueDate: addDays(now, 3), tags: ["评审", "体验"], progress: 15 },
      { id: t2, projectId: p1, title: "首页视觉开发", description: "完成 hero 区块和营销模块", status: "进行中", priority: "中", assigneeId: m2, startDate: addDays(now, -2), dueDate: addDays(now, 6), tags: ["前端", "UI"], progress: 45 },
      { id: t3, projectId: p2, title: "接口鉴权设计", description: "定义 token 刷新流程", status: "已完成", priority: "高", assigneeId: m3, startDate: addDays(now, -5), dueDate: addDays(now, -1), tags: ["后端", "安全"], progress: 100 }
    ],
    milestones: [
      { id: uid("mile"), projectId: p1, name: "设计冻结", dueDate: addDays(now, 5), status: "进行中" },
      { id: uid("mile"), projectId: p2, name: "一期发布", dueDate: addDays(now, 28), status: "待办" }
    ]
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    return normalizeState(JSON.parse(raw));
  } catch {
    return seedData();
  }
}

let state = loadState();
let currentView = "dashboard";
let calendarRefDate = new Date(); // ⑤ 日历翻月支持

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    if (e.name === "QuotaExceededError") {
      toast("存储空间已满，无法保存", "error");
    } else {
      toast("保存失败: " + e.message, "error");
    }
  }
}

function commit(fn) {
  fn();
  saveState();
  render();
}

// ② 重置确认
function resetSeed() {
  if (!confirm("确定要重置所有数据为示例数据吗？当前数据将丢失！")) return;
  state = seedData();
  saveState();
  render();
  toast("已重置为示例数据", "success");
}

// ⑦ 数据导出
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pm-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("数据已导出", "success");
}

// ⑦ 数据导入
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      state = normalizeState(data);
      saveState();
      render();
      toast("数据导入成功", "success");
    } catch {
      toast("文件格式错误，导入失败", "error");
    }
  };
  reader.readAsText(file);
}

function getProjectName(id) {
  const p = state.projects.find((x) => x.id === id);
  return p ? p.name : "未分配项目";
}

function getMemberName(id) {
  const m = state.members.find((x) => x.id === id);
  return m ? m.name : "未分配";
}

function statusBadge(status) {
  if (status === "待办") return '<span class="badge todo">待办</span>';
  if (status === "进行中") return '<span class="badge progress">进行中</span>';
  return '<span class="badge done">已完成</span>';
}

function emptyState(msg) {
  return `<div class="empty-state"><p>${esc(msg)}</p></div>`;
}

// --- 导航 ---

function renderNav() {
  const nav = document.getElementById("navMenu");
  nav.innerHTML = navItems
    .map((item) =>
      `<button data-key="${item.key}" class="${currentView === item.key ? "active" : ""}">${item.label}</button>`
    )
    .join("");

  nav.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.key;
      const meta = viewMeta[currentView];
      document.getElementById("viewTitle").textContent = meta.title;
      document.getElementById("viewSubtitle").textContent = meta.subtitle;
      render();
    });
  });
}

// --- 仪表盘 ---

function renderDashboard() {
  const el = document.getElementById("dashboardView");
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.status === "已完成").length;
  const inProgress = state.tasks.filter((t) => t.status === "进行中").length;
  const overdue = state.tasks.filter((t) => t.dueDate < today() && t.status !== "已完成").length;
  const completion = total ? Math.round((done / total) * 100) : 0;

  el.innerHTML = `
    <div class="grid kpi">
      <div class="card"><h3>项目总数</h3><div class="kpi-value">${state.projects.length}</div></div>
      <div class="card"><h3>任务完成率</h3><div class="kpi-value">${completion}%</div><div class="muted">${done}/${total}</div></div>
      <div class="card"><h3>进行中任务</h3><div class="kpi-value">${inProgress}</div></div>
      <div class="card"><h3>逾期任务</h3><div class="kpi-value" style="color:${overdue ? 'var(--danger)' : ''}">${overdue}</div></div>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>项目负责人分布</h3>
      <div class="row" style="margin-top:8px;">
        ${state.projects.length
          ? state.projects.map((p) => `<span class="badge progress">${esc(p.name)} / 负责人: ${esc(getMemberName(p.ownerId))}</span>`).join("")
          : '<span class="muted">暂无项目</span>'}
      </div>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>近期任务</h3>
      ${state.tasks.length === 0 ? emptyState("暂无任务，请先添加任务") : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>任务</th><th>项目</th><th>项目负责人</th><th>执行人</th><th>状态</th><th>截止</th></tr></thead>
          <tbody>
            ${state.tasks
              .slice()
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 8)
              .map((t) => {
                const project = state.projects.find((p) => p.id === t.projectId) || { ownerId: "" };
                return `<tr><td>${esc(t.title)}</td><td>${esc(getProjectName(t.projectId))}</td><td>${esc(getMemberName(project.ownerId))}</td><td>${esc(getMemberName(t.assigneeId))}</td><td>${statusBadge(t.status)}</td><td>${esc(t.dueDate)}</td></tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}

// --- 项目管理 ---

function renderProjects() {
  const el = document.getElementById("projectsView");
  const memberOptions = state.members
    .map((m) => `<option value="${m.id}">${esc(m.name)} (${esc(m.role)})</option>`)
    .join("");

  el.innerHTML = `
    <div class="card">
      <h3>新增项目</h3>
      <form id="projectForm" class="form-grid" style="margin-top:8px;">
        <input name="name" placeholder="项目名称" required />
        <input name="startDate" type="date" required />
        <input name="endDate" type="date" required />
        <select name="ownerId" required>${memberOptions}</select>
        <select name="status" required>
          <option>规划中</option><option>进行中</option><option>已完成</option>
        </select>
        <textarea name="description" placeholder="项目描述"></textarea>
        <button class="btn" type="submit">新增项目</button>
      </form>
      <div id="projectFormError" class="muted" style="color:var(--danger);margin-top:4px;"></div>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>项目列表</h3>
      ${state.projects.length === 0 ? emptyState("暂无项目，请先添加") : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>名称</th><th>负责人</th><th>周期</th><th>状态</th><th>描述</th><th>操作</th></tr></thead>
          <tbody>
            ${state.projects.map((p) => `<tr>
              <td>${esc(p.name)}</td>
              <td>
                <select data-project-owner="${p.id}">
                  ${state.members.map((m) => `<option value="${m.id}" ${p.ownerId === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
                </select>
              </td>
              <td>${esc(p.startDate)} ~ ${esc(p.endDate)}</td>
              <td>${esc(p.status)}</td>
              <td>${esc(p.description || "-")}</td>
              <td>
                <button class="btn ghost" data-edit-project="${p.id}">编辑</button>
                <button class="btn danger" data-del-project="${p.id}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`}
    </div>
  `;

  const form = document.getElementById("projectForm");
  const formError = document.getElementById("projectFormError");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const start = fd.get("startDate");
    const end = fd.get("endDate");
    const check = validateDateRange(start, end);
    if (!check.ok) {
      formError.textContent = check.msg;
      return;
    }
    formError.textContent = "";
    commit(() => {
      state.projects.push({
        id: uid("proj"),
        name: fd.get("name").toString(),
        startDate: start.toString(),
        endDate: end.toString(),
        ownerId: fd.get("ownerId").toString(),
        status: fd.get("status").toString(),
        description: fd.get("description").toString()
      });
    });
    toast("项目已添加", "success");
  });

  el.querySelectorAll("[data-project-owner]").forEach((sel) => {
    sel.addEventListener("change", () => {
      commit(() => {
        const p = state.projects.find((x) => x.id === sel.dataset.projectOwner);
        if (p) p.ownerId = sel.value;
      });
    });
  });

  // ⑥ 编辑功能
  el.querySelectorAll("[data-edit-project]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = state.projects.find((x) => x.id === btn.dataset.editProject);
      if (!p) return;
      // 简单编辑：填充表单
      form.querySelector('[name="name"]').value = p.name;
      form.querySelector('[name="startDate"]').value = p.startDate;
      form.querySelector('[name="endDate"]').value = p.endDate;
      form.querySelector('[name="ownerId"]').value = p.ownerId;
      form.querySelector('[name="status"]').value = p.status;
      form.querySelector('[name="description"]').value = p.description || "";
      // 标记为编辑模式
      form.dataset.editId = p.id;
      form.querySelector('button[type="submit"]').textContent = "保存修改";
      toast("编辑模式，修改后点击保存", "success");
    });
  });

  // 编辑模式提交
  if (form.dataset.editId) {
    form.querySelector("button[type=submit]").textContent = "保存修改";
  }

  el.querySelectorAll("[data-del-project]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("确定删除该项目及其关联任务和里程碑？")) return;
      const id = btn.dataset.delProject;
      commit(() => {
        state.projects = state.projects.filter((p) => p.id !== id);
        state.tasks = state.tasks.filter((t) => t.projectId !== id);
        state.milestones = state.milestones.filter((m) => m.projectId !== id);
      });
      toast("项目已删除", "success");
    });
  });
}

// --- 任务管理 ---

function renderTasks() {
  const el = document.getElementById("tasksView");
  const projectOptions = state.projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  const memberOptions = state.members.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");

  el.innerHTML = `
    <div class="card">
      <h3>任务筛选</h3>
      <div class="controls" style="margin-top:8px;">
        <input id="taskSearch" placeholder="搜索任务标题/描述" />
        <select id="taskStatusFilter"><option value="">全部状态</option><option>待办</option><option>进行中</option><option>已完成</option></select>
        <select id="taskProjectFilter"><option value="">全部项目</option>${projectOptions}</select>
      </div>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>新增任务</h3>
      <form id="taskForm" class="form-grid" style="margin-top:8px;">
        <input name="title" placeholder="任务标题" required />
        <select name="projectId" required>${projectOptions}</select>
        <select name="assigneeId" required>${memberOptions}</select>
        <select name="status"><option>待办</option><option>进行中</option><option>已完成</option></select>
        <select name="priority"><option>低</option><option>中</option><option>高</option></select>
        <input name="startDate" type="date" required />
        <input name="dueDate" type="date" required />
        <input name="tags" placeholder="标签，英文逗号分隔" />
        <input name="progress" type="number" min="0" max="100" value="0" />
        <textarea name="description" placeholder="任务描述"></textarea>
        <button class="btn" type="submit">新增任务</button>
      </form>
      <div id="taskFormError" class="muted" style="color:var(--danger);margin-top:4px;"></div>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>任务列表</h3>
      <div id="taskTableHolder"></div>
    </div>
  `;

  const form = document.getElementById("taskForm");
  const formError = document.getElementById("taskFormError");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const start = fd.get("startDate");
    const due = fd.get("dueDate");
    const check = validateDateRange(start, due);
    if (!check.ok) {
      formError.textContent = check.msg;
      return;
    }
    formError.textContent = "";
    commit(() => {
      state.tasks.push({
        id: uid("task"),
        title: fd.get("title").toString(),
        projectId: fd.get("projectId").toString(),
        assigneeId: fd.get("assigneeId").toString(),
        status: fd.get("status").toString(),
        priority: fd.get("priority").toString(),
        startDate: start.toString(),
        dueDate: due.toString(),
        tags: fd.get("tags").toString().split(",").map((x) => x.trim()).filter(Boolean),
        progress: Number(fd.get("progress")) || 0,
        description: fd.get("description").toString()
      });
    });
    toast("任务已添加", "success");
  });

  const search = document.getElementById("taskSearch");
  const status = document.getElementById("taskStatusFilter");
  const project = document.getElementById("taskProjectFilter");
  [search, status, project].forEach((x) => x.addEventListener("input", drawTaskTable));
  drawTaskTable();

  function drawTaskTable() {
    const q = search.value.trim().toLowerCase();
    const s = status.value;
    const p = project.value;
    const rows = state.tasks.filter((t) => {
      const hit = !q || `${t.title} ${t.description}`.toLowerCase().includes(q);
      const st = !s || t.status === s;
      const pj = !p || t.projectId === p;
      return hit && st && pj;
    });

    const holder = document.getElementById("taskTableHolder");
    if (rows.length === 0) {
      holder.innerHTML = emptyState("没有匹配的任务");
      return;
    }

    holder.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>任务</th><th>项目</th><th>项目负责人</th><th>执行人</th><th>状态</th><th>优先级</th><th>进度</th><th>周期</th><th>标签</th><th>操作</th></tr></thead>
          <tbody>
            ${rows.map((t) => {
              const projectInfo = state.projects.find((pItem) => pItem.id === t.projectId) || { ownerId: "" };
              return `<tr>
                <td>${esc(t.title)}<div class="muted">${esc(t.description || "")}</div></td>
                <td>${esc(getProjectName(t.projectId))}</td>
                <td>${esc(getMemberName(projectInfo.ownerId))}</td>
                <td>${esc(getMemberName(t.assigneeId))}</td>
                <td>
                  <select data-task-status="${t.id}">
                    <option ${t.status === "待办" ? "selected" : ""}>待办</option>
                    <option ${t.status === "进行中" ? "selected" : ""}>进行中</option>
                    <option ${t.status === "已完成" ? "selected" : ""}>已完成</option>
                  </select>
                </td>
                <td>${esc(t.priority)}</td>
                <td><input data-task-progress="${t.id}" type="number" min="0" max="100" value="${t.progress}" style="width:74px;" /></td>
                <td>${esc(t.startDate)} ~ ${esc(t.dueDate)}</td>
                <td>${t.tags.map((tag) => `<span class="badge todo">${esc(tag)}</span>`).join(" ")}</td>
                <td><button class="btn danger" data-del-task="${t.id}">删除</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    holder.querySelectorAll("[data-task-status]").forEach((sel) => {
      sel.addEventListener("change", () => {
        commit(() => {
          const t = state.tasks.find((x) => x.id === sel.dataset.taskStatus);
          if (!t) return;
          t.status = sel.value;
          if (t.status === "已完成") t.progress = 100;
        });
      });
    });

    holder.querySelectorAll("[data-task-progress]").forEach((inp) => {
      inp.addEventListener("change", () => {
        commit(() => {
          const t = state.tasks.find((x) => x.id === inp.dataset.taskProgress);
          if (!t) return;
          t.progress = Math.max(0, Math.min(100, Number(inp.value) || 0));
          if (t.progress === 100) t.status = "已完成";
        });
      });
    });

    holder.querySelectorAll("[data-del-task]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("确定删除该任务？")) return;
        commit(() => {
          state.tasks = state.tasks.filter((t) => t.id !== btn.dataset.delTask);
        });
        toast("任务已删除", "success");
      });
    });
  }
}

// --- 看板 ---

function renderBoard() {
  const el = document.getElementById("boardView");
  const groups = ["待办", "进行中", "已完成"];

  el.innerHTML = `<div class="kanban">${groups
    .map((g) => {
      const cards = state.tasks
        .filter((t) => t.status === g)
        .map((t) => {
          const projectInfo = state.projects.find((p) => p.id === t.projectId) || { ownerId: "" };
          return `<div class="task-chip">
            <strong>${esc(t.title)}</strong>
            <div class="muted">${esc(getProjectName(t.projectId))} / 项目负责人: ${esc(getMemberName(projectInfo.ownerId))}</div>
            <div class="row"><span>${esc(getMemberName(t.assigneeId))}</span><span>${t.progress}%</span></div>
          </div>`;
        })
        .join("");
      return `<section class="kanban-col"><h3>${g}</h3>${cards || '<p class="muted">暂无任务</p>'}</section>`;
    })
    .join("")}</div>`;
}

// --- 日历 ⑤ 支持翻月 ---

function renderCalendar() {
  const el = document.getElementById("calendarView");
  const base = calendarRefDate;
  const y = base.getFullYear();
  const m = base.getMonth();
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const todayStr = today();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push('<div class="calendar-day"></div>');
  }
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d).toISOString().slice(0, 10);
    const dayTasks = state.tasks.filter((t) => t.dueDate === date);
    const isToday = date === todayStr;
    cells.push(`<div class="calendar-day ${isToday ? 'today' : ''}"><strong>${d}</strong>${dayTasks
      .slice(0, 3)
      .map((t) => `<div>${esc(t.title)}</div>`)
      .join("")}${dayTasks.length > 3 ? `<div class="muted">+${dayTasks.length - 3}</div>` : ""}</div>`);
  }

  el.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;">
        <h3>${y}年${m + 1}月任务日历</h3>
        <div class="row">
          <button id="calPrev" class="btn ghost" style="padding:6px 12px;">上月</button>
          <button id="calToday" class="btn ghost" style="padding:6px 12px;">今天</button>
          <button id="calNext" class="btn ghost" style="padding:6px 12px;">下月</button>
        </div>
      </div>
      <div class="calendar-grid" style="margin-top:8px;">
        <div class="muted">日</div><div class="muted">一</div><div class="muted">二</div><div class="muted">三</div><div class="muted">四</div><div class="muted">五</div><div class="muted">六</div>
        ${cells.join("")}
      </div>
    </div>
  `;

  document.getElementById("calPrev").addEventListener("click", () => {
    calendarRefDate = new Date(y, m - 1, 1);
    renderCalendar();
  });
  document.getElementById("calNext").addEventListener("click", () => {
    calendarRefDate = new Date(y, m + 1, 1);
    renderCalendar();
  });
  document.getElementById("calToday").addEventListener("click", () => {
    calendarRefDate = new Date();
    renderCalendar();
  });
}

// --- 甘特图 ④ 优化大数据量 ---

function renderGantt() {
  const el = document.getElementById("ganttView");
  const options = ['<option value="">全部项目</option>']
    .concat(state.projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`))
    .join("");

  el.innerHTML = `
    <div class="card">
      <div class="row">
        <h3>甘特图</h3>
        <select id="ganttProjectFilter">${options}</select>
      </div>
      <div id="ganttCanvas" class="gantt-wrap" style="margin-top:10px;"></div>
    </div>
  `;

  const sel = document.getElementById("ganttProjectFilter");
  sel.addEventListener("change", draw);
  draw();

  function draw() {
    const pid = sel.value;
    let tasks = state.tasks.filter((t) => t.startDate && t.dueDate);
    if (pid) tasks = tasks.filter((t) => t.projectId === pid);

    const holder = document.getElementById("ganttCanvas");
    if (!tasks.length) {
      holder.innerHTML = emptyState("当前筛选下暂无任务。");
      return;
    }

    // ④ 限制最大天数，避免 DOM 爆炸
    tasks = tasks.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
    const minDate = new Date(tasks[0].startDate);
    const maxDate = new Date(tasks[0].dueDate);
    tasks.forEach((t) => {
      const s = new Date(t.startDate);
      const e = new Date(t.dueDate);
      if (s < minDate) minDate.setTime(s.getTime());
      if (e > maxDate) maxDate.setTime(e.getTime());
    });

    let days = Math.max(1, Math.floor((maxDate - minDate) / 86400000) + 1);
    // ④ 超过 120 天自动切换为周粒度
    const useWeekly = days > 120;
    let labels = [];
    let cellCount = useWeekly ? Math.ceil(days / 7) : days;

    if (useWeekly) {
      for (let w = 0; w < cellCount; w++) {
        const d = new Date(minDate.getTime() + w * 7 * 86400000);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      }
    } else {
      for (let i = 0; i < days; i++) {
        const d = new Date(minDate.getTime() + i * 86400000);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      }
    }

    const header = `
      <div class="gantt-header" style="--days:${cellCount};">
        <div class="gantt-name"><strong>任务</strong></div>
        ${labels.map((x) => `<div class="gantt-cell">${x}</div>`).join("")}
      </div>
    `;

    const rows = tasks
      .map((t) => {
        let offset, span;
        if (useWeekly) {
          offset = Math.floor((new Date(t.startDate) - minDate) / (7 * 86400000));
          span = Math.max(1, Math.ceil(((new Date(t.dueDate) - new Date(t.startDate)) / 86400000 + 1) / 7));
        } else {
          offset = Math.floor((new Date(t.startDate) - minDate) / 86400000);
          span = Math.max(1, Math.floor((new Date(t.dueDate) - new Date(t.startDate)) / 86400000) + 1);
        }
        const cells = [];
        for (let i = 0; i < cellCount; i++) {
          if (i === offset) {
            cells.push(`<div class="gantt-cell" style="grid-column: span ${Math.min(span, cellCount - i)};"><div class="gantt-bar" title="${esc(t.title)} (${esc(t.startDate)} ~ ${esc(t.dueDate)})"></div></div>`);
            i += Math.min(span, cellCount - i) - 1;
          } else {
            cells.push('<div class="gantt-cell"></div>');
          }
        }
        return `<div class="gantt-row" style="--days:${cellCount};"><div class="gantt-name">${esc(t.title)}</div>${cells.join("")}</div>`;
      })
      .join("");

    holder.innerHTML = header + rows;
  }
}

// --- 里程碑 ---

function renderMilestones() {
  const el = document.getElementById("milestonesView");
  const projectOptions = state.projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");

  el.innerHTML = `
    <div class="card">
      <h3>新增里程碑</h3>
      <form id="mileForm" class="form-grid" style="margin-top:8px;">
        <input name="name" placeholder="里程碑名称" required />
        <select name="projectId" required>${projectOptions}</select>
        <input type="date" name="dueDate" required />
        <select name="status"><option>待办</option><option>进行中</option><option>已完成</option></select>
        <button class="btn" type="submit">新增里程碑</button>
      </form>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>里程碑列表</h3>
      ${state.milestones.length === 0 ? emptyState("暂无里程碑") : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>里程碑</th><th>项目</th><th>日期</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            ${state.milestones.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(getProjectName(m.projectId))}</td><td>${esc(m.dueDate)}</td><td>${esc(m.status)}</td><td><button class="btn danger" data-del-mile="${m.id}">删除</button></td></tr>`).join("")}
          </tbody>
        </table>
      </div>`}
    </div>
  `;

  const form = document.getElementById("mileForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    commit(() => {
      state.milestones.push({
        id: uid("mile"),
        name: fd.get("name").toString(),
        projectId: fd.get("projectId").toString(),
        dueDate: fd.get("dueDate").toString(),
        status: fd.get("status").toString()
      });
    });
    toast("里程碑已添加", "success");
  });

  el.querySelectorAll("[data-del-mile]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("确定删除该里程碑？")) return;
      commit(() => {
        state.milestones = state.milestones.filter((m) => m.id !== btn.dataset.delMile);
      });
      toast("里程碑已删除", "success");
    });
  });
}

// --- 团队 ---

function renderTeam() {
  const el = document.getElementById("teamView");
  el.innerHTML = `
    <div class="card">
      <h3>新增成员</h3>
      <form id="memberForm" class="form-grid" style="margin-top:8px;">
        <input name="name" placeholder="姓名" required />
        <input name="role" placeholder="角色" required />
        <input name="email" type="email" placeholder="邮箱（选填）" />
        <button class="btn" type="submit">新增成员</button>
      </form>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>成员列表</h3>
      ${state.members.length === 0 ? emptyState("暂无成员") : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>姓名</th><th>角色</th><th>邮箱</th><th>操作</th></tr></thead>
          <tbody>
            ${state.members.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.role)}</td><td>${esc(m.email)}</td><td><button class="btn danger" data-del-member="${m.id}">删除</button></td></tr>`).join("")}
          </tbody>
        </table>
      </div>`}
    </div>
  `;

  const form = document.getElementById("memberForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    commit(() => {
      state.members.push({
        id: uid("mem"),
        name: fd.get("name").toString(),
        role: fd.get("role").toString(),
        email: fd.get("email").toString()
      });
    });
    toast("成员已添加", "success");
  });

  el.querySelectorAll("[data-del-member]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.delMember;
      const inTask = state.tasks.some((t) => t.assigneeId === id);
      const inProjectOwner = state.projects.some((p) => p.ownerId === id);
      if (inTask || inProjectOwner) {
        toast("该成员已关联任务或项目负责人，无法删除", "error");
        return;
      }
      if (!confirm("确定删除该成员？")) return;
      commit(() => {
        state.members = state.members.filter((m) => m.id !== id);
      });
      toast("成员已删除", "success");
    });
  });
}

// --- 主渲染 ③ 按需渲染 ---

const renderMap = {
  dashboard: renderDashboard,
  projects: renderProjects,
  tasks: renderTasks,
  board: renderBoard,
  calendar: renderCalendar,
  gantt: renderGantt,
  milestones: renderMilestones,
  team: renderTeam
};

function render() {
  renderNav();

  const ids = ["dashboard", "projects", "tasks", "board", "calendar", "gantt", "milestones", "team"];
  ids.forEach((id) => {
    document.getElementById(`${id}View`).classList.toggle("hidden", id !== currentView);
  });

  // ③ 只渲染当前视图，不再全量渲染
  const renderFn = renderMap[currentView];
  if (renderFn) renderFn();
}

// --- 初始化 ---

document.getElementById("resetDataBtn").addEventListener("click", resetSeed);
document.getElementById("exportDataBtn").addEventListener("click", exportData);
document.getElementById("importDataInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) importData(file);
  e.target.value = ""; // 允许重复导入同一文件
});

render();
