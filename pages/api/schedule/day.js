import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const date = (req.query.date || "").toString(); // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: "date required (YYYY-MM-DD)" });

  const { data: sessions, error } = await supabase
    .from("class_sessions")
    .select("id, session_date, start_time, duration_minutes, lesson_type, parent_id, parents(name)")
    .eq("session_date", date)
    .order("start_time", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const out = [];
  for (const s of sessions || []) {
    const { data: links, error: lErr } = await supabase
      .from("class_students")
      .select("student_id, instructor_id, students(id, name), instructors(name)")
      .eq("class_session_id", s.id);

    if (lErr) return res.status(500).json({ error: lErr.message });

    out.push({
      id: s.id,
      start_time: s.start_time,
      duration_minutes: s.duration_minutes,
      lesson_type: s.lesson_type,
      parent_name: s.parents?.name || "",
      parent_id: s.parent_id,
      students: (links || []).map(l => ({
        id: l.students?.id,
        name: l.students?.name,
        instructor_id: l.instructor_id || null,
        instructor_name: l.instructors?.name || "",
      })).filter(x => x.id),
    });
  }

  return res.status(200).json({ sessions: out });
}
