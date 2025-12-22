import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === "GET") {
    const student_id = (req.query.student_id || "").toString();
    if (!student_id) return res.status(400).json({ error: "student_id required" });

    const { data, error } = await supabase
      .from("student_notes")
      .select("id, title, note, created_at")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ notes: data || [] });
  }

  if (req.method === "POST") {
    const { student_id, title, note } = req.body || {};
    if (!student_id || !note) return res.status(400).json({ error: "student_id and note required" });

    const { error } = await supabase.from("student_notes").insert({
      student_id,
      title: title || null,
      note,
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
