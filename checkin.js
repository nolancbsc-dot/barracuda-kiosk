import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function CheckIn() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadStudents() {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, parent_phone_last4")
        .eq("active", true)
        .order("name");

      if (error) {
        setMessage("Error loading students");
      } else {
        setStudents(data || []);
      }
    }
    loadStudents();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return students;
    return students.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, students]);

  async function handleCheckIn() {
    setMessage("");

    if (!selected) {
      setMessage("Please select a student.");
      return;
    }

    if (pin.length !== 4) {
      setMessage("Enter last 4 digits of parent phone.");
      return;
    }

    if (pin !== selected.parent_phone_last4) {
      setMessage("PIN does not match.");
      return;
    }

    const { error } = await supabase.from("student_visits").insert({
      student_id: selected.id,
    });

    if (error) {
      setMessage("Check-in failed.");
    } else {
      setMessage(`✅ ${selected.name} checked in!`);
      setSelected(null);
      setSearch("");
      setPin("");
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Student Check-In</h1>

      <input
        placeholder="Search student name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 12, marginBottom: 12 }}
      />

      <div style={{ border: "1px solid #ccc" }}>
        {filtered.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelected(s)}
            style={{
              padding: 10,
              cursor: "pointer",
              background:
                selected?.id === s.id ? "#eee" : "white",
            }}
          >
            {s.name}
          </div>
        ))}
      </div>

      <input
        placeholder="Parent PIN (last 4 digits)"
        value={pin}
        onChange={(e) =>
          setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
        style={{ width: "100%", padding: 12, marginTop: 12 }}
      />

      <button
        onClick={handleCheckIn}
        style={{ width: "100%", padding: 14, marginTop: 12 }}
      >
        Check In
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
