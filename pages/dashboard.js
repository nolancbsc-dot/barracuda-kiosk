import { useEffect, useMemo, useState } from "react";

function fmtDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(() => fmtDate(new Date()));
  const [sessions, setSessions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [slotTime, setSlotTime] = useState("13:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [slotType, setSlotType] = useState("Private");
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState({ parents: [], students: [] });
  const [pickedParent, setPickedParent] = useState(null);
  const [pickedStudents, setPickedStudents] = useState([]); // [{student_id,name,instructor_id}]

  async function loadDay(date) {
    const r = await fetch(`/api/schedule/day?date=${encodeURIComponent(date)}`);
    const j = await r.json();
    setSessions(j.sessions || []);
  }

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    fetch("/api/instructors").then(r => r.json()).then(j => setInstructors(j.instructors || []));
  }, []);

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

  // search parents/students by last name
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!searchQ.trim()) { setSearchRes({ parents: [], students: [] }); return; }
      const r = await fetch(`/api/search?q=${encodeURIComponent(searchQ.trim())}`);
      const j = await r.json();
      if (alive) setSearchRes({ parents: j.parents || [], students: j.students || [] });
    }
    run();
    return () => { alive = false; };
  }, [searchQ]);

  function resetModal() {
    setSearchQ("");
    setSearchRes({ parents: [], students: [] });
    setPickedParent(null);
    setPickedStudents([]);
    setSlotTime("13:00");
    setSlotDuration(30);
    setSlotType("Private");
  }

  function pickParent(p) {
    setPickedParent(p);
    // if parent picked, keep students empty until selected from search results (fast + safe)
  }

  function addStudentFromSearch(s) {
    // if parent not selected yet, auto-set parent based on student’s parent_id (when available)
    if (!pickedParent && s.parent_id) {
      setPickedParent({ id: s.parent_id, name: s.parent_name || "Parent" });
    }
    // avoid duplicates
    setPickedStudents(prev => prev.some(x => x.student_id === s.id)
      ? prev
      : [...prev, { student_id: s.id, name: s.name, instructor_id: "" }]
    );
  }

  function removeStudent(student_id) {
    setPickedStudents(prev => prev.filter(x => x.student_id !== student_id));
  }

  async function saveSlot() {
    if (!pickedParent?.id) return alert("Pick a parent (search last name, click a parent result).");
    if (pickedStudents.length === 0) return alert("Add at least one student.");

    const payload = {
      date: selectedDate,
      start_time: slotTime,
      duration_minutes: Number(slotDuration),
      lesson_type: slotType,
      parent_id: pickedParent.id,
      students: pickedStudents.map(s => ({
        student_id: s.student_id,
        instructor_id: s.instructor_id || null,
      })),
    };

    const r = await fetch("/api/schedule/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error || "Failed to save slot");

    setShowModal(false);
    resetModal();
    loadDay(selectedDate);
  }

  const leftSchedule = useMemo(() => {
    return (
      <div>
        {sessions.map(sess => (
          <div key={sess.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>
              {sess.start_time} · {sess.duration_minutes} min · {sess.lesson_type}
            </div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              Parent: <b>{sess.parent_name || "—"}</b>
            </div>
            <div style={{ marginTop: 8 }}>
              {sess.students.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectStudent({ id: s.id, name: s.name, parent_name: sess.parent_name })}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: 10, marginTop: 6, borderRadius: 10 }}
                >
                  {s.name}{s.instructor_name ? ` — (${s.instructor_name})` : ""}
                </button>
              ))}
            </div>
          </div>
        ))}
        {sessions.length === 0 && <div style={{ opacity: 0.7 }}>No slots for this date yet.</div>}
      </div>
    );
  }, [sessions]);

  return (
    <div style={{ maxWidth: 1150, margin: "18px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Schedule + Notes</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontWeight: 700 }}>Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: 8 }} />
          <button onClick={() => { setShowModal(true); resetModal(); }} style={{ padding: "10px 12px", borderRadius: 10, fontWeight: 800 }}>
            + Add Time Slot
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          {leftSchedule}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          {!selectedStudent ? (
            <div style={{ opacity: 0.7 }}>Click a student from the schedule to add progress notes.</div>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{selectedStudent.name}</div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>Parent: <b>{selectedStudent.parent_name || "—"}</b></div>

              <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Add Progress Note</div>
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
                <div style={{ fontWeight: 800, marginBottom: 8 }}>History</div>
                {notes.length === 0 ? (
                  <div style={{ opacity: 0.7 }}>No notes yet.</div>
                ) : (
                  notes.map(n => (
                    <div key={n.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <div style={{ fontWeight: 800 }}>
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

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{ width: "min(900px, 100%)", background: "white", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Add Time Slot</div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => { setShowModal(false); }} style={{ padding: "8px 10px", borderRadius: 10 }}>
                  Close
                </button>
                <button onClick={saveSlot} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 900 }}>
                  Save Slot
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Time</div>
                <input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} style={{ width: "100%", padding: 10 }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Duration</div>
                <select value={slotDuration} onChange={(e) => setSlotDuration(e.target.value)} style={{ width: "100%", padding: 10 }}>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Lesson Type</div>
                <select value={slotType} onChange={(e) => setSlotType(e.target.value)} style={{ width: "100%", padding: 10 }}>
                  <option value="Private">Private</option>
                  <option value="Group">Group</option>
                  <option value="Mommy & Me">Mommy & Me</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Search last name (Parent OR Student)</div>
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Type last name…"
                style={{ width: "100%", padding: 10 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Parents</div>
                {(searchRes.parents || []).map(p => (
                  <button key={p.id} onClick={() => pickParent(p)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: 10, borderRadius: 10, marginBottom: 6 }}>
                    {p.name}
                  </button>
                ))}
                {(!searchRes.parents || searchRes.parents.length === 0) && <div style={{ opacity: 0.6 }}>No parent matches.</div>}
              </div>

              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Students</div>
                {(searchRes.students || []).map(s => (
                  <button key={s.id} onClick={() => addStudentFromSearch(s)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: 10, borderRadius: 10, marginBottom: 6 }}>
                    {s.name}{s.parent_name ? ` — (${s.parent_name})` : ""}
                  </button>
                ))}
                {(!searchRes.students || searchRes.students.length === 0) && <div style={{ opacity: 0.6 }}>No student matches.</div>}
              </div>
            </div>

            <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
              <div style={{ fontWeight: 900 }}>Selected</div>
              <div style={{ marginTop: 6 }}>Parent: <b>{pickedParent?.name || "— (pick a parent or select a student)"}</b></div>

              <div style={{ marginTop: 10 }}>
                {pickedStudents.length === 0 ? (
                  <div style={{ opacity: 0.7 }}>No students added yet. Click a student result to add.</div>
                ) : (
                  pickedStudents.map(s => (
                    <div key={s.student_id} style={{ display: "grid", gridTemplateColumns: "1fr 260px 90px", gap: 10, alignItems: "center", marginTop: 8 }}>
                      <div style={{ fontWeight: 800 }}>{s.name}</div>
                      <select
                        value={s.instructor_id}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPickedStudents(prev => prev.map(x => x.student_id === s.student_id ? { ...x, instructor_id: v } : x));
                        }}
                        style={{ width: "100%", padding: 10 }}
                      >
                        <option value="">Assign instructor (optional)</option>
                        {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <button onClick={() => removeStudent(s.student_id)} style={{ padding: 10, borderRadius: 10 }}>
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 12, opacity: 0.7 }}>
                ✅ Multiple time slots can share the same time (two groups at once is supported).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
