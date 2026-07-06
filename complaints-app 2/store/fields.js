// store/fields.js — تعريف الحقول والتحويل بين صيغة الواجهة وأعمدة قاعدة البيانات
const FIELDS = [
  "reportNo", "orderNo", "customer", "phone", "payMethod", "amount",
  "status", "source", "nextReplyDate", "reportDate", "note", "customerStance", "arrivalDate"
];

// خريطة: مفتاح الواجهة (camelCase) -> اسم العمود في Postgres (snake_case)
const COL = {
  reportNo: "report_no", orderNo: "order_no", customer: "customer", phone: "phone",
  payMethod: "pay_method", amount: "amount", status: "status", source: "source",
  nextReplyDate: "next_reply_date", reportDate: "report_date", note: "note",
  customerStance: "customer_stance", arrivalDate: "arrival_date"
};

const DATE_FIELDS = new Set(["nextReplyDate", "reportDate", "arrivalDate"]);

// كائن الواجهة -> صف قاعدة بيانات
function toRow(o) {
  const row = {};
  for (const f of FIELDS) {
    const col = COL[f];
    let v = o[f];
    if (f === "amount") {
      row[col] = (v === "" || v == null || isNaN(parseFloat(v))) ? null : parseFloat(v);
    } else if (DATE_FIELDS.has(f)) {
      row[col] = (v === "" || v == null) ? null : String(v);
    } else {
      row[col] = v == null ? "" : String(v).trim();
    }
  }
  return row;
}

// صف قاعدة بيانات -> كائن الواجهة
function fromRow(r) {
  const o = { id: r.id };
  for (const f of FIELDS) {
    const v = r[COL[f]];
    if (f === "amount") o[f] = (v == null) ? "" : String(v);
    else o[f] = (v == null) ? "" : String(v);
  }
  o.createdAt = r.created_at || null;
  return o;
}

module.exports = { FIELDS, COL, toRow, fromRow };
