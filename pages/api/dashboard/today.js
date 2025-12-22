import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const { data: sessions, error } = await supabase
    .from("class_sessions")
    .select("id, session_date, start_time, duration_minutes, lesson_type, instructor_name, parents(name)")
    .eq("session_date", dateStr)
    .order("start_time", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const out = [];
  for (const s of sessions || []) {
    const { data: links, error: linkErr } = await supabase
      .from("class_students")
      .select("students(id, name)")
      .eq("class_session_id", s.id);

    if (linkErr) return res.status(500).json({ error: linkErr.message });

    out.push({
      id: s.id,
      start_time: s.start_time,
      duration_minutes: s.duration_minutes,
      lesson_type: s.lesson_type,
      instructor_name: s.instructor_name,
      parent_name: s.parents?.name || "",
      students: (links || []).map(l => l.students).filter(Boolean),
    });
  }

  return res.status(200).json({ sessions: out });
}
