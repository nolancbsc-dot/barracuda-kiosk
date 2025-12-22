import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const q = (req.query.q || "").toString().trim();

  let query = supabase
    .from("students")
    .select("id, name, parents(name)")
    .eq("active", true)
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const students = (data || []).map(r => ({
    id: r.id,
    name: r.name,
    parent_name: r.parents?.name || "",
  }));

  return res.status(200).json({ students });
}
