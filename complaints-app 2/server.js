// server.js — سيرفر Express: يقدّم الواجهة ويوفّر واجهة API للبلاغات
require("dotenv").config();
const express = require("express");
const path = require("path");
const store = require("./store");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

// معلومات النظام (نوع التخزين المستخدم)
app.get("/api/info", (req, res) => res.json({ backend: store.backend }));

// جلب كل البلاغات
app.get("/api/complaints", async (req, res) => {
  try { res.json(await store.getAll()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// إضافة بلاغ
app.post("/api/complaints", async (req, res) => {
  if (!req.body || (!req.body.reportNo && !req.body.customer))
    return res.status(400).json({ error: "رقم البلاغ واسم العميل مطلوبان" });
  try { res.status(201).json(await store.create(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// تعديل بلاغ
app.put("/api/complaints/:id", async (req, res) => {
  try {
    const rec = await store.update(req.params.id, req.body || {});
    if (!rec) return res.status(404).json({ error: "البلاغ غير موجود" });
    res.json(rec);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// حذف بلاغ
app.delete("/api/complaints/:id", async (req, res) => {
  try {
    const ok = await store.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: "البلاغ غير موجود" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// استيراد جماعي
app.post("/api/import", async (req, res) => {
  const records = Array.isArray(req.body) ? req.body : (req.body && req.body.records) || [];
  if (!Array.isArray(records)) return res.status(400).json({ error: "صيغة غير صحيحة" });
  try { res.json(await store.bulkImport(records)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log("\n  ✅ لوحة إدارة البلاغات تعمل الآن");
  console.log("  💾 نوع التخزين: " + store.backend.toUpperCase());
  console.log("  🌐 افتح المتصفح على:  http://localhost:" + PORT + "\n");
});
