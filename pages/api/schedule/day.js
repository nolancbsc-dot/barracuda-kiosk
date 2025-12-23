import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Missing date" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      duration_minutes,
      lesson_type,
      parent_id,
      parents (
        name,
        phone,
        emergency_contact_name,
        emergency_contact_phone
      ),
      class_students (
        id,
        student_id,
        instructor_id,
        students ( name ),
        instructors ( name )
      )
    `)
    .eq("session_date", date)
    .order("start_time", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const sessions = (data || []).map(s => ({
    id: s.id,
    date: s.session_date,
    start_time: s.start_time,
    duration_minutes: s.duration_minutes,
    lesson_type: s.lesson_type,
    parent_name: s.parents?.name || "",
    parent_phone: s.parents?.phone || "",
    emergency_contact_name: s.parents?.emergency_contact_name || "",
    emergency_contact_phone: s.parents?.emergency_contact_phone || "",
    students: (s.class_students || []).map(cs => ({
      name: cs.students?.name || "",
      instructor: cs.instructors?.name || ""
    }))
  }));

  return res.status(200).json({ sessions });
}
