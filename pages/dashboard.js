import { useEffect, useMemo, useState } from "react";

export default function Dashboard() {
  const [tab, setTab] = useState("today"); // today | students
  const [sessions, setSessions] = useState([]);
  const [q, setQ] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/today").then(r => r.json()).then(j => setSessions(j.sessions || []));
  }, []);

  useEffect(() => {
    fetch(`/api/dashboard/students?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(j => setStudents(j.students || []));
  }, [q]);

  async function selectStudent(s) {
    setSelectedStudent(s);
    setStatus("");
    const r = await fetch(`/api/dashboard/notes?student_id=${s.id}`);
    const j = await r.json();
    setNotes(j.notes || []);
  }

  async function addNote() {
    if (!selectedStudent) return;
    setStatus("");
    const r = await fetch("/api/dashboard/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: selectedStudent.id, title, note }),
    });
    const j = await r.json();
    if (!r.ok) return setStatus(`❌ ${j.error || "Error"}`);
    setTitle("");
    setNote("");
    setStatus("✅ Saved");
    await selectStudent(selectedStudent);
  }

  const left = useMemo(() => {
    if (tab === "today") return (
      <div>
        {sessions.map(sess => (
          <div key={sess.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>
              {sess.start_time} · {sess.duration_minutes} min · {sess.lesson_type} · Instructor: {sess.instructor_name}
            </div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Parent: <b>{sess.parent_name}</b>
            </div>
            <div style={{ marginTop: 8 }}>
              {sess.students.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectStudent({ id: s.id, name: s.name, parent_name: sess.parent_name })}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: 10, marginTop: 6, borderRadius: 8 }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

    return (
      <div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search students…"
          style={{ width: "100%", padding: 10, marginBottom: 12 }}
        />
        {students.map(s => (
          <button
            key={s.id}
            onClick={() => selectStudent(s)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: 10, marginBottom: 6, borderRadius: 8 }}
          >
            {s.name}{s.parent_name ? ` — (${s.parent_name})` : ""}
          </button>
        ))}
      </div>
    );
  }, [tab, sessions, students, q]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, maxWidth: 1100, margin: "20px auto", fontFamily: "system-ui" }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setTab("today")} style={{ flex: 1, padding: 10, borderRadius: 10, fontWeight: tab==="today" ? 700 : 400 }}>
            Today
          </button>
          <button onClick={() => setTab("students")} style={{ flex: 1, padding: 10, borderRadius: 10, fontWeight: tab==="students" ? 700 : 400 }}>
            Students
          </button>
        </div>
        {left}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        {!selectedStudent ? (
          <div style={{ opacity: 0.7 }}>Select a student from the left to view/add progress notes.</div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{selectedStudent.name}</div>
            <div style={{ marginTop: 4, opacity: 0.8 }}>Parent: <b>{selectedStudent.parent_name || "—"}</b></div>

            <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Add Progress Note</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional) — e.g., Back Float"
                style={{ width: "100%", padding: 10, marginBottom: 10 }}
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What went well / what to improve…"
                style={{ width: "100%", padding: 10, minHeight: 120 }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button onClick={addNote} disabled={!note.trim()} style={{ padding: 12, borderRadius: 10 }}>
                  Save Note
                </button>
                {status && <div style={{ alignSelf: "center" }}>{status}</div>}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>History</div>
              {notes.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No notes yet.</div>
              ) : (
                notes.map(n => (
                  <div key={n.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>
                      {n.title || "Progress Note"} <span style={{ fontWeight: 400, opacity: 0.7 }}>· {new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{n.note}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
