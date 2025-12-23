import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(200).json({ parents: [], students: [] });

  const { data: parents, error: pErr } = await supabase
    .from("parents")
    .select("id, name")
    .ilike("name", `%${q}%`)
    .order("name", { ascending: true })
    .limit(15);

  if (pErr) return res.status(500).json({ error: pErr.message });

  const { data: studentsRaw, error: sErr } = await supabase
    .from("students")
    .select("id, name, parent_id, parents(name)")
    .eq("active", true)
    .ilike("name", `%${q}%`)
    .order("name", { ascending: true })
    .limit(25);

  if (sErr) return res.status(500).json({ error: sErr.message });

  const students = (studentsRaw || []).map(r => ({
    id: r.id,
    name: r.name,
    parent_id: r.parent_id,
    parent_name: r.parents?.name || "",
  }));

  return res.status(200).json({ parents: parents || [], students });
}
