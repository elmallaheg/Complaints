// store/supabaseStore.js — التخزين في قاعدة بيانات Supabase (Postgres)
const { createClient } = require("@supabase/supabase-js");
const { toRow, fromRow } = require("./fields");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});
const TABLE = "complaints";

module.exports = {
  async getAll() {
    const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromRow);
  },
  async create(input) {
    const { data, error } = await supabase.from(TABLE).insert(toRow(input)).select().single();
    if (error) throw error;
    return fromRow(data);
  },
  async update(id, input) {
    const { data, error } = await supabase.from(TABLE)
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) { if (error.code === "PGRST116") return null; throw error; }
    return data ? fromRow(data) : null;
  },
  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    return true;
  },
  async bulkImport(records) {
    const rows = records.map(toRow).filter((r) => r.report_no || r.customer);
    if (!rows.length) return { added: 0, updated: 0 };

    // اجلب أرقام البلاغات الموجودة لتحديد الجديد من المُحدَّث
    const { data: existing, error: exErr } = await supabase.from(TABLE).select("id, report_no");
    if (exErr) throw exErr;
    const map = new Map();
    (existing || []).forEach((r) => { if (r.report_no) map.set(r.report_no, r.id); });

    const toInsert = [], toUpdate = [];
    for (const row of rows) {
      const id = row.report_no ? map.get(row.report_no) : null;
      if (id) toUpdate.push({ id, row }); else toInsert.push(row);
    }

    if (toInsert.length) {
      const { error } = await supabase.from(TABLE).insert(toInsert);
      if (error) throw error;
    }
    for (const u of toUpdate) {
      const { error } = await supabase.from(TABLE)
        .update({ ...u.row, updated_at: new Date().toISOString() }).eq("id", u.id);
      if (error) throw error;
    }
    return { added: toInsert.length, updated: toUpdate.length };
  }
};
