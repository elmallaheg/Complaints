// store/jsonStore.js — تخزين محلي في ملف JSON (يُستخدم تلقائيًا إن لم تُضبط Supabase)
const fs = require("fs");
const path = require("path");
const { FIELDS } = require("./fields");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "complaints.json");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf8");
}
function readAll() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")) || []; } catch { return []; }
}
function writeAll(list) { ensure(); fs.writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8"); return list; }
function uid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function clean(input) { const o = {}; for (const f of FIELDS) o[f] = input[f] != null ? String(input[f]).trim() : ""; return o; }

module.exports = {
  async getAll() { return readAll(); },
  async create(input) {
    const list = readAll();
    const rec = { id: uid(), createdAt: new Date().toISOString(), ...clean(input) };
    list.unshift(rec); writeAll(list); return rec;
  },
  async update(id, input) {
    const list = readAll();
    const i = list.findIndex((r) => r.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...clean(input), id, updatedAt: new Date().toISOString() };
    writeAll(list); return list[i];
  },
  async remove(id) {
    const list = readAll();
    const next = list.filter((r) => r.id !== id);
    writeAll(next); return list.length !== next.length;
  },
  async bulkImport(records) {
    const list = readAll();
    let added = 0, updated = 0;
    for (const raw of records) {
      const rec = clean(raw);
      if (!rec.reportNo && !rec.customer) continue;
      const existing = rec.reportNo ? list.find((r) => r.reportNo && r.reportNo === rec.reportNo) : null;
      if (existing) { Object.assign(existing, rec, { updatedAt: new Date().toISOString() }); updated++; }
      else { list.unshift({ id: uid(), createdAt: new Date().toISOString(), ...rec }); added++; }
    }
    writeAll(list); return { added, updated };
  }
};
