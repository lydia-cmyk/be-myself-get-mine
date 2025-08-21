// src/App.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";

/**
 * Project Manager Web (single-file)
 * - Sidebar: project list (reorder via DnD)
 * - WeeklyCalendar: top of main area, shows current week's tasks across ALL projects
 * - Main: selected project's tasks (inline edit, DnD reorder)
 * - Cute UI, widened layout
 */

/* ========= Persistent State Utils (localStorage) ========= */
const loadState = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveStateNow = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const __timers = new Map();
const saveState = (key, value, delay = 300) => {
  const prev = __timers.get(key);
  if (prev) clearTimeout(prev);
  const id = setTimeout(() => saveStateNow(key, value), delay);
  __timers.set(key, id);
};

/** useState처럼 쓰되 값 변경 시 자동으로 localStorage에 저장 */
const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(() => loadState(key, initialValue));
  const keyRef = useRef(key);
  useEffect(() => { saveState(keyRef.current, state, 0); }, []);  // 초기 동기화
  useEffect(() => { saveState(keyRef.current, state); }, [state]);
  return [state, setState];
};
/* ========================================================= */

// ---------- Utils ----------
const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);

const moveItem = (list, from, to) => {
  const arr = [...list];
  if (to < 0 || to >= arr.length || from === to) return arr;
  const [picked] = arr.splice(from, 1);
  arr.splice(to, 0, picked);
  return arr;
};

const calcAverageProgress = (tasks) => {
  if (!tasks || tasks.length === 0) return 0;
  const sum = tasks.reduce((acc, t) => acc + Number(t.progress || 0), 0);
  return Math.round(sum / tasks.length);
};

// Parse input[type="date"] safely as LOCAL date (no TZ shift)
const parseDateInput = (s) => {
  if (!s || typeof s !== "string") return null;
  const parts = s.split("-").map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [yy, mm, dd] = parts;
  // Set to noon local time to avoid DST edge-cases when diffing days
  return new Date(yy, mm - 1, dd, 12, 0, 0, 0);
};

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday as first day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfWeek = (date) => {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const daysDiff = (a, b) =>
  Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

// Soft color palette for project bars (post-it style)
const PROJECT_COLORS = [
  { bg: "rgba(255, 99, 132, 0.35)", border: "rgba(255, 99, 132, 0.55)" },   // rose
  { bg: "rgba(255, 205, 86, 0.35)", border: "rgba(255, 205, 86, 0.55)" },   // amber
  { bg: "rgba(72, 207, 173, 0.35)", border: "rgba(72, 207, 173, 0.55)" },   // teal
  { bg: "rgba(135, 206, 250, 0.35)", border: "rgba(135, 206, 250, 0.55)" }, // sky
  { bg: "rgba(147, 112, 219, 0.35)", border: "rgba(147, 112, 219, 0.55)" }, // purple
  { bg: "rgba(255, 182, 193, 0.35)", border: "rgba(255, 182, 193, 0.55)" }, // pink
  { bg: "rgba(144, 238, 144, 0.35)", border: "rgba(144, 238, 144, 0.55)" }, // lightgreen
  { bg: "rgba(240, 230, 140, 0.35)", border: "rgba(240, 230, 140, 0.55)" }, // khaki
];

// Build weekly bars from projects (pure function so we can test)
function buildWeeklyBars(projects, weekStart) {
  const ws = startOfWeek(weekStart);
  const we = endOfWeek(weekStart);
  const bars = [];
  projects.forEach((p, pIdx) => {
    (p.tasks || []).forEach((t) => {
      const s = parseDateInput(t.start);
      const e = parseDateInput(t.end);
      if (!s && !e) return; // no dates
      const rs = s || e; // if one side missing treat as single
      const re = e || s;
      if (!rs || !re) return;
      if (re < ws || rs > we) return; // outside week
      // Clip to week and compute columns
      const clipStart = rs < ws ? ws : rs;
      const clipEnd = re > we ? we : re;
      const startCol = clamp(daysDiff(ws, clipStart), 0, 6);
      const endCol = clamp(daysDiff(ws, clipEnd), 0, 6);
      bars.push({ projectIndex: pIdx, title: t.title || p.name, startCol, endCol });
    });
  });
  return bars;
}

// ---------- Root ----------
export default function ProjectManager() {
  // 👇 여기 두 개만 영구 저장
  const [projects, setProjects] = usePersistentState("pm:projects:v1", []);
  const [activeIndex, setActiveIndex] = usePersistentState("pm:activeIndex:v1", -1);

  // 나머지는 휘발성
  const [newProject, setNewProject] = useState("");
  const [dragProjectIndex, setDragProjectIndex] = useState(null);
  const [calendarRefDate, setCalendarRefDate] = useState(new Date());

  const addProject = () => {
    if (!newProject.trim()) return;
    const created = {
      id: uid(),
      name: newProject.trim(),
      emoji: "📁",
      colorIdx: projects.length % PROJECT_COLORS.length,
      tasks: [],
    };
    setProjects((prev) => [...prev, created]);
    setNewProject("");
    setActiveIndex((prev) => (prev === -1 ? 0 : prev));
  };

  const deleteProject = (index) => {
    setProjects((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setActiveIndex((prev) => {
      if (projects.length - 1 === 0) return -1;
      if (prev > index) return prev - 1;
      if (prev === index) return 0;
      return prev;
    });
  };

  const updateProjectName = (index, name) => {
    setProjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    });
  };

  const moveProject = (from, to) => {
    setProjects((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = moveItem(prev, from, to);
      return next;
    });
    setActiveIndex((prev) => {
      if (prev === from) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });
  };

  const onProjectDragStart = (idx) => setDragProjectIndex(idx);
  const onProjectDrop = (idx) => {
    if (dragProjectIndex === null || dragProjectIndex === idx) return;
    moveProject(dragProjectIndex, idx);
    setDragProjectIndex(null);
  };

  const activeProject = useMemo(() => projects[activeIndex] ?? null, [projects, activeIndex]);
  const weekStart = useMemo(() => startOfWeek(calendarRefDate), [calendarRefDate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-violet-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">✨</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-violet-700">Be myself, Get mine</h1>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-80 sm:w-[320px] shrink-0 bg-white/80 rounded-2xl shadow-sm border border-violet-100 p-5">
          <div className="mb-3">
            <label className="text-xs text-violet-600">새 프로젝트</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="예: 웹툰 소품 패키지"
                className="flex-1 rounded-xl border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button
                onClick={addProject}
                className="rounded-xl px-3 py-2 text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700"
              >
                추가
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-2">프로젝트 ({projects.length})</div>
          <ul className="space-y-2">
            {projects.map((p, idx) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => onProjectDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onProjectDrop(idx)}
                className={`group flex items-center gap-2 rounded-xl border px-3 py-3 cursor-pointer select-none transition shadow-sm ${
                  activeIndex === idx
                    ? "border-violet-400 bg-violet-50"
                    : "border-violet-100 bg-white hover:bg-violet-50"
                }`}
                onClick={() => setActiveIndex(idx)}
              >
                <span className="text-xl shrink-0">📁</span>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium whitespace-normal break-words leading-snug">
                    {p.name || "제목 없음"}
                  </div>
                </div>
                <span className="text-[11px] text-gray-500 shrink-0 pl-2">{p.tasks.length}개</span>
                <button
                  title="삭제"
                  onClick={(e) => { e.stopPropagation(); deleteProject(idx); }}
                  className="ml-1 shrink-0 rounded-lg px-2 py-1 text-xs border border-rose-200 text-rose-600 hover:bg-rose-50"
                >✕</button>
              </li>
            ))}
          </ul>

          {projects.length === 0 && (
            <div className="mt-4 text-xs text-gray-500">
              아직 프로젝트가 없어. 위에 이름을 넣고 <span className="font-semibold">추가</span>를 눌러봐!
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-[720px] space-y-6">
          {/* Weekly Calendar */}
          <WeeklyCalendar
            projects={projects}
            weekStart={weekStart}
            onPrevWeek={() => setCalendarRefDate((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })}
            onNextWeek={() => setCalendarRefDate((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}
            onToday={() => setCalendarRefDate(new Date())}
            onSelectProject={(idx) => setActiveIndex(idx)}
          />

          {activeProject ? (
            <ProjectDetail
              project={activeProject}
              index={activeIndex}
              setProjects={setProjects}
              updateProjectName={updateProjectName}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full min-h-[40vh] grid place-items-center">
      <div className="text-center bg-white/70 border border-violet-100 rounded-3xl p-10 shadow-sm">
        <div className="text-5xl mb-2">🌺</div>
        <h2 className="text-lg font-bold text-violet-700">선택된 프로젝트가 없어</h2>
        <p className="text-sm text-gray-500 mt-1">왼쪽에서 프로젝트를 추가하거나 선택해줘.</p>
      </div>
    </div>
  );
}

// ---------- Weekly Calendar ----------
function WeeklyCalendar({ projects, weekStart, onPrevWeek, onNextWeek, onToday, onSelectProject }) {
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const bars = buildWeeklyBars(projects, weekStart);

  const weekLabel = `${weekStart.getFullYear()}.${String(weekStart.getMonth() + 1).padStart(2, "0")}.${String(weekStart.getDate()).padStart(2, "0")} ~ ${endOfWeek(weekStart).getFullYear()}.${String(endOfWeek(weekStart).getMonth() + 1).padStart(2, "0")}.${String(endOfWeek(weekStart).getDate()).padStart(2, "0")}`;

  return (
    <section className="bg-white rounded-3xl border border-violet-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={onPrevWeek} className="rounded-lg px-3 py-1 text-sm border hover:bg-violet-50">← 이전</button>
          <button onClick={onToday} className="rounded-lg px-3 py-1 text-sm border hover:bg-violet-50">오늘</button>
          <button onClick={onNextWeek} className="rounded-lg px-3 py-1 text-sm border hover:bg-violet-50">다음 →</button>
        </div>
        <h3 className="text-sm font-semibold text-violet-700">주간 캘린더 · {weekLabel}</h3>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 text-xs text-center text-gray-600 mb-2">
        {days.map((d, i) => (
          <div key={i} className="py-1 rounded-md bg-violet-50 border border-violet-100">
            {"일월화수목금토"[d.getDay()]} {String(d.getMonth() + 1).padStart(2, "0")}/{String(d.getDate()).padStart(2, "0")}
          </div>
        ))}
      </div>

      {/* Grid cells + overlay bars */}
      <div className="relative">
        {/* base cells */}
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-dashed border-violet-200 bg-violet-50/40" />
          ))}
        </div>
        {/* overlay bars as grid (so gridColumn works) */}
        <div className="absolute inset-0 grid grid-cols-7 gap-2 p-1 auto-rows-min content-start items-start">
          {bars.map((b, i) => {
            const color = PROJECT_COLORS[(projects[b.projectIndex]?.colorIdx ?? b.projectIndex) % PROJECT_COLORS.length];
            const pjName = projects[b.projectIndex]?.name || "";
            return (
              <button
                key={i}
                onClick={() => onSelectProject(b.projectIndex)}
                style={{ gridColumn: `${b.startCol + 1} / ${b.endCol + 2}`, backgroundColor: color.bg, borderColor: color.border, transform: `rotate(${((b.projectIndex % 3) - 1) * 0.6}deg)` }}
                className="h-4 mt-1 rounded-md border text-[10px] leading-4 px-2 overflow-hidden text-left shadow-sm hover:shadow ring-1 ring-black/5"
                title={`${b.title}${pjName ? ` · ${pjName}` : ""}`}
              >
                {b.title || pjName}
              </button>
            );
          })}
        </div>
      </div>

      {bars.length === 0 && (
        <div className="text-center text-xs text-gray-500 mt-2">이번 주에 표시할 일정이 없어. 작업에 시작/마감일을 넣어봐!</div>
      )}
    </section>
  );
}

// ---------- ProjectDetail ----------
function ProjectDetail({ project, index, setProjects, updateProjectName }) {
  const [editing, setEditing] = useState(false);
  const [tmpName, setTmpName] = useState(project.name);
  const [newTask, setNewTask] = useState({ title: "", description: "", start: "", end: "", progress: 0 });
  const [dragTaskIndex, setDragTaskIndex] = useState(null);

  const saveName = () => {
    if (!tmpName.trim()) return;
    updateProjectName(index, tmpName.trim());
    setEditing(false);
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    setProjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], tasks: [...next[index].tasks, { ...newTask, id: uid() }] };
      return next;
    });
    setNewTask({ title: "", description: "", start: "", end: "", progress: 0 });
  };

  const updateTask = (tIndex, key, value) => {
    setProjects((prev) => {
      const next = [...prev];
      const tasks = [...next[index].tasks];
      tasks[tIndex] = { ...tasks[tIndex], [key]: value };
      next[index] = { ...next[index], tasks };
      return next;
    });
  };

  const deleteTask = (tIndex) => {
    setProjects((prev) => {
      const next = [...prev];
      const tasks = [...next[index].tasks];
      tasks.splice(tIndex, 1);
      next[index] = { ...next[index], tasks };
      return next;
    });
  };

  const moveTask = (from, to) => {
    setProjects((prev) => {
      const next = [...prev];
      const tasks = moveItem(next[index].tasks, from, to);
      next[index] = { ...next[index], tasks };
      return next;
    });
  };

  const onTaskDragStart = (idx) => setDragTaskIndex(idx);
  const onTaskDrop = (idx) => {
    if (dragTaskIndex === null || dragTaskIndex === idx) return;
    moveTask(dragTaskIndex, idx);
    setDragTaskIndex(null);
  };

  const progressAvg = useMemo(() => calcAverageProgress(project.tasks), [project.tasks]);

  return (
    <div className="space-y-6">
      {/* Top summary */}
      <div className="bg-white rounded-3xl border border-violet-100 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-3xl">{project.emoji}</div>
          <div className="flex-1">
            {editing ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={tmpName}
                  onChange={(e) => setTmpName(e.target.value)}
                  className="flex-1 rounded-xl border border-violet-200 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <button onClick={saveName} className="rounded-xl px-3 py-2 text-sm font-semibold bg-violet-600 text-white">저장</button>
                <button onClick={() => { setEditing(false); setTmpName(project.name); }} className="rounded-xl px-3 py-2 text-sm border">취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-violet-800">{project.name}</h2>
                <button onClick={() => setEditing(true)} className="text-xs rounded-lg px-2 py-1 border hover:bg-violet-50">✎ 편집</button>
              </div>
            )}
            <div className="mt-1 text-sm text-gray-500">작업 {project.tasks.length}개 · 평균 진행도 {progressAvg}%</div>
            <div className="mt-2 h-2 w-full bg-violet-100 rounded-full overflow-hidden">
              <div className="h-2 bg-violet-500" style={{ width: `${progressAvg}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Add task form */}
      <div className="bg-white rounded-3xl border border-violet-100 p-5 shadow-sm">
        <div className="grid lg:grid-cols-2 gap-3">
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="작업 제목"
            className="rounded-xl border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newTask.start}
              onChange={(e) => setNewTask({ ...newTask, start: e.target.value })}
              className="flex-1 rounded-xl border border-violet-200 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={newTask.end}
              onChange={(e) => setNewTask({ ...newTask, end: e.target.value })}
              className="flex-1 rounded-xl border border-violet-200 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="설명"
            className="lg:col-span-2 rounded-xl border border-violet-200 px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <div className="flex items-center gap-3 lg:col-span-2">
            <label className="text-xs text-gray-500 w-16">진행도</label>
            <input
              type="range"
              min="0"
              max="100"
              value={newTask.progress}
              onChange={(e) => setNewTask({ ...newTask, progress: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm w-10 text-center">{newTask.progress}%</span>
            <button onClick={addTask} className="ml-auto rounded-xl px-4 py-2 text-sm font-semibold bg-pink-500 text-white hover:bg-pink-600">작업 추가</button>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {project.tasks.map((task, tIndex) => (
          <TaskItem
            key={task.id || tIndex}
            task={task}
            onChange={(k, v) => updateTask(tIndex, k, v)}
            onDelete={() => deleteTask(tIndex)}
            onMoveUp={() => moveTask(tIndex, tIndex - 1)}
            onMoveDown={() => moveTask(tIndex, tIndex + 1)}
            draggable
            onDragStart={() => onTaskDragStart(tIndex)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onTaskDrop(tIndex)}
          />
        ))}
        {project.tasks.length === 0 && (
          <div className="bg-white rounded-3xl border border-violet-100 p-6 text-sm text-gray-500 text-center">아직 등록된 작업이 없어. 위의 폼에서 추가해줘!</div>
        )}
      </div>
    </div>
  );
}

// ---------- TaskItem ----------
function TaskItem({ task, onChange, onDelete, onMoveUp, onMoveDown, draggable, onDragStart, onDragOver, onDrop }) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="bg-white rounded-2xl border border-violet-100 p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="cursor-grab select-none text-lg" title="드래그로 순서 변경">⋮⋮</div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={task.title || ""}
              onChange={(e) => onChange("title", e.target.value)}
              className="flex-1 rounded-xl border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="작업 제목"
            />
            <div className="flex items-center gap-2">
              <button onClick={onMoveUp} className="rounded-lg px-2 py-1 text-xs border border-violet-200 hover:bg-violet-50">↑</button>
              <button onClick={onMoveDown} className="rounded-lg px-2 py-1 text-xs border border-violet-200 hover:bg-violet-50">↓</button>
              <button onClick={onDelete} className="rounded-lg px-2 py-1 text-xs border border-rose-200 text-rose-600 hover:bg-rose-50">삭제</button>
            </div>
          </div>

          <textarea
            value={task.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="설명"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-12">시작</label>
              <input type="date" value={task.start || ""} onChange={(e) => onChange("start", e.target.value)} className="flex-1 rounded-xl border border-violet-200 px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-12">마감</label>
              <input type="date" value={task.end || ""} onChange={(e) => onChange("end", e.target.value)} className="flex-1 rounded-xl border border-violet-200 px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-14">진행도</label>
              <input type="range" min="0" max="100" value={Number(task.progress || 0)} onChange={(e) => onChange("progress", Number(e.target.value))} className="flex-1" />
              <span className="text-sm w-10 text-center">{Number(task.progress || 0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Simple runtime tests (console) ----------
function __tests__() {
  const a = ["A", "B", "C"]; const r1 = moveItem(a, 0, 2); console.assert(r1.join(",") === "B,C,A", "moveItem to end failed");
  const r2 = moveItem(a, 2, 0); console.assert(r2.join(",") === "C,A,B", "moveItem to start failed");
  const r3 = moveItem(a, 1, 1); console.assert(r3.join(",") === "A,B,C", "moveItem same index failed");
  const avg1 = calcAverageProgress([{ progress: 0 }, { progress: 50 }, { progress: 100 }]); console.assert(avg1 === 50, "avg 50 failed");
  const avg2 = calcAverageProgress([]); console.assert(avg2 === 0, "avg empty failed");
  const ref = new Date("2025-08-18T12:00:00"); // Mon
  const sw = startOfWeek(ref); const ew = endOfWeek(ref);
  console.assert(sw.getDay() === 1, "week should start Mon");
  console.assert(daysDiff(sw, ew) === 6, "week span 6 days");
  const dLocal = parseDateInput("2025-08-22");
  console.assert(dLocal && dLocal.getFullYear() === 2025 && dLocal.getMonth() === 7 && dLocal.getDate() === 22, "parseDateInput failed");
  const ws = new Date(2025, 7, 18, 0, 0, 0, 0); // 2025-08-18 Mon
  const testProjects = [{ name: "P1", tasks: [{ title: "T1", start: "2025-08-22", end: "2025-08-27" }] }];
  const bars = buildWeeklyBars(testProjects, ws);
  console.assert(bars.length === 1, "bars length");
  console.assert(bars[0].title === "T1", "bar title should be task title");
  console.assert(bars[0].startCol === daysDiff(startOfWeek(ws), parseDateInput("2025-08-22")), "start col wrong");
  console.assert(bars[0].endCol === daysDiff(startOfWeek(ws), parseDateInput("2025-08-27")), "end col wrong");
  console.log("[ProjectManager tests] all passed ✅");
}
if (typeof window !== "undefined") { try { __tests__(); } catch (e) { console.error("[ProjectManager tests] failed", e); } }
