import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { instructor_id, pin_last4, action } = req.body || {};
  if (!instructor_id || !pin_last4 || !["in", "out"].includes(action)) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: instructor, error: instErr } = await supabase
    .from("instructors")
    .select("id, name, pin_last4, active")
    .eq("id", instructor_id)
    .single();

  if (instErr || !instructor) return res.status(400).json({ error: "Instructor not found" });
  if (!instructor.active) return res.status(403).json({ error: "Instructor inactive" });

  if (String(instructor.pin_last4 || "") !== String(pin_last4 || "")) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  if (action === "in") {
    const { data: open } = await supabase
      .from("staff_time_entries")
      .select("id")
      .eq("instructor_id", instructor.id)
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1);

    if (open && open.length > 0) {
      return res.status(200).json({ message: `✅ ${instructor.name} is already clocked in.` });
    }

    const { error } = await supabase.from("staff_time_entries").insert({
      instructor_id: instructor.id,
      clock_in_at: new Date().toISOString(),
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: `✅ ${instructor.name} clocked IN.` });
  }

  const { data: open, error: openErr } = await supabase
    .from("staff_time_entries")
    .select("id")
    .eq("instructor_id", instructor.id)
    .is("clock_out_at", null)
    .order("clock_in_at", { ascending: false })
    .limit(1);

  if (openErr) return res.status(500).json({ error: openErr.message });
  if (!open || open.length === 0) {
    return res.status(200).json({ message: `⚠️ ${instructor.name} has no active clock-in.` });
  }

  const { error: updErr } = await supabase
    .from("staff_time_entries")
    .update({ clock_out_at: new Date().toISOString() })
    .eq("id", open[0].id);

  if (updErr) return res.status(500).json({ error: updErr.message });
  return res.status(200).json({ message: `✅ ${instructor.name} clocked OUT.` });
}
