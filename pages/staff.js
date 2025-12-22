import { useEffect, useMemo, useState } from "react";

export default function StaffKiosk() {
  const [now, setNow] = useState(new Date());
  const [instructors, setInstructors] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/staff/instructors");
      const json = await res.json();
      setInstructors(json.instructors || []);
    }
    load();
  }, []);

  const selectedName = useMemo(() => {
    const found = instructors.find((i) => i.id === selectedId);
    return found?.name || "";
  }, [selectedId, instructors]);

  async function submit(action) {
    setStatus("");
    setLoading(true);
    try {
      const res = await fetch("/api/staff/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructor_id: selectedId, pin_last4: pin, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setStatus(json.message || "Success");
      setPin("");
    } catch (e) {
      setStatus(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>Instructor Clock</h1>
        <div style={{ fontSize: 18 }}>{now.toLocaleTimeString()}</div>
      </div>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Select your name, enter your PIN (last 4), then Clock In or Clock Out.
      </p>

      <label style={{ display: "block", marginTop: 16, marginBottom: 6 }}>Instructor</label>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        style={{ width: "100%", padding: 12 }}
      >
        <option value="">Select name…</option>
        {instructors.map((i) => (
          <option key={i.id} value={i.id}>{i.name}</option>
        ))}
      </select>

      <label style={{ display: "block", marginTop: 16, marginBottom: 6 }}>PIN (last 4)</label>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\\D/g, "").slice(0, 4))}
        placeholder="0000"
        style={{ width: "100%", padding: 12, fontSize: 18, letterSpacing: 2 }}
        inputMode="numeric"
      />

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          onClick={() => submit("in")}
          disabled={loading || !selectedId || pin.length !== 4}
          style={{ flex: 1, padding: 14, fontSize: 16 }}
        >
          Clock In
        </button>
        <button
          onClick={() => submit("out")}
          disabled={loading || !selectedId || pin.length !== 4}
          style={{ flex: 1, padding: 14, fontSize: 16 }}
        >
          Clock Out
        </button>
      </div>

      {selectedName && (
        <div style={{ marginTop: 10, opacity: 0.7 }}>
          Selected: <b>{selectedName}</b>
        </div>
      )}

      {status && <div style={{ marginTop: 14, fontSize: 16 }}>{status}</div>}
    </div>
  );
}
