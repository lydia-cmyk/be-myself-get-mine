// src/App.jsx
import { usePersistentState } from "./utils/persist";

export default function App() {
  // 기존: const [tasks, setTasks] = useState([]);
  const [tasks, setTasks] = usePersistentState("planner:tasks:v1", []);

  // 기존: const [note, setNote] = useState("");
  const [note, setNote] = usePersistentState("planner:note:v1", "");

  function addTask(txt) {
    if (!txt?.trim()) return;
    setTasks(prev => [...prev, { id: crypto.randomUUID(), txt, done: false }]);
  }

  function toggle(id) {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Be myself, Get mine</h1>

      {/* 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addTask(fd.get("task"));
          e.currentTarget.reset();
        }}
        className="flex gap-2"
      >
        <input name="task" placeholder="할 일" className="border px-3 py-2 rounded w-full" />
        <button className="border px-4 py-2 rounded">추가</button>
      </form>

      {/* 리스트 */}
      <ul className="space-y-2">
        {tasks.map(t => (
          <li key={t.id} className="flex items-center gap-2">
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            <span className={t.done ? "line-through opacity-60" : ""}>{t.txt}</span>
            <button onClick={() => remove(t.id)} className="ml-auto text-sm opacity-70 hover:opacity-100">삭제</button>
          </li>
        ))}
      </ul>

      {/* 메모 */}
      <textarea
        className="border w-full h-32 p-3 rounded"
        placeholder="메모"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {/* 백업/복원(선택) */}
      <div className="flex gap-2">
        <ExportButton data={{ tasks, note }} />
        <ImportButton onLoad={(json) => {
          setTasks(Array.isArray(json.tasks) ? json.tasks : []);
          setNote(typeof json.note === "string" ? json.note : "");
        }} />
      </div>
    </div>
  );
}

// 아래 두 버튼은 같은 파일에 둬도 되고, 따로 컴포넌트로 빼도 됨.
function ExportButton({ data, filename = "planner-backup.json" }) {
  return (
    <button
      className="border px-3 py-1 rounded"
      onClick={() => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }}
    >
      내보내기
    </button>
  );
}

function ImportButton({ onLoad }) {
  return (
    <label className="border px-3 py-1 rounded cursor-pointer">
      가져오기
      <input
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          onLoad(JSON.parse(text));
        }}
      />
    </label>
  );
}
