import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { date, start_time, duration_minutes, lesson_type, parent_id, students } = req.body || {};
  if (!date || !start_time || !duration_minutes || !lesson_type || !parent_id || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "Missing fields. Need date, start_time, duration_minutes, lesson_type, parent_id, students[]" });
  }

  // Create session (allow duplicates times — by design)
  const { data: session, error: sErr } = await supabase
    .from("class_sessions")
    .insert({
      session_date: date,
      start_time,
      duration_minutes,
      lesson_type,
      instructor_name: "Pool", // placeholder; we assign per student
      parent_id
    })
    .select("id")
    .single();

  if (sErr) return res.status(500).json({ error: sErr.message });

  // Link students
  const rows = students.map(st => ({
    class_session_id: session.id,
    student_id: st.student_id,
    instructor_id: st.instructor_id || null,
  }));

  const { error: cErr } = await supabase.from("class_students").insert(rows);
  if (cErr) return res.status(500).json({ error: cErr.message });

  return res.status(200).json({ ok: true, session_id: session.id });
}
