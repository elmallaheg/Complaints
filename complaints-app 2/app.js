/* ================= الثوابت ================= */
const FIELDS = ["reportNo","orderNo","customer","phone","payMethod","amount","status","source","nextReplyDate","reportDate","note","customerStance","arrivalDate"];
const HEADERS = {reportNo:"رقم البلاغ",orderNo:"رقم الطلب",customer:"اسم العميل",phone:"رقم الجوال",payMethod:"وسيلة الدفع",amount:"مبلغ الدفع",status:"حالة البلاغ",source:"المصدر",nextReplyDate:"تاريخ الرد القادم",reportDate:"تاريخ البلاغ",note:"ملاحظة",customerStance:"موقف العميل",arrivalDate:"تاريخ وصول الطلب او التحويل"};
const HEADER_ORDER = FIELDS.slice();
const HEADER_MAP = {}; FIELDS.forEach(f=>HEADER_MAP[HEADERS[f]]=f);
Object.assign(HEADER_MAP,{"الحالة":"status","الاسم":"customer","العميل":"customer","الجوال":"phone","رقم الهاتف":"phone","المبلغ":"amount","الملاحظة":"note","تاريخ وصول الطلب":"arrivalDate","تاريخ التحويل":"arrivalDate","تاريخ الوصول":"arrivalDate"});

const STATUS_META = {
  "تم معالجته":{cls:"b-resolved",done:true},
  "تم الرد":{cls:"b-replied"},
  "لم يتم الرد":{cls:"b-noreply"},
  "تم تأجيله":{cls:"b-post"},
  "مخالفة":{cls:"b-viol"},
  "قضية":{cls:"b-case"}
};
const STATUS_COLORS = {"تم معالجته":"#15803d","تم الرد":"#1d4ed8","لم يتم الرد":"#dc2626","تم تأجيله":"#b45309","مخالفة":"#be123c","قضية":"#6d28d9"};

/* ================= الحالة ================= */
const state = { data:[], search:"", fStatus:"", fPay:"", fSource:"", sort:"due_asc", view:"all", editingId:null, slaDays:3 };

// استنتاج المصدر تلقائيًا من رقم البلاغ إن لم يُحدَّد (اختياري)
function inferSource(c){
  if(c.source) return c.source;
  const r=(c.reportNo||"").replace(/\D/g,"");
  if(r.length>=9) return "وزارة التجارة";
  if(r.length>=6 && r.length<=8) return "سلة";
  return "";
}

/* ================= أدوات ================= */
const $ = s => document.querySelector(s);
/* ===== الاتصال المباشر بـ Supabase من المتصفح ===== */
const TABLE = "complaints";
const COL = {reportNo:"report_no",orderNo:"order_no",customer:"customer",phone:"phone",payMethod:"pay_method",amount:"amount",status:"status",source:"source",nextReplyDate:"next_reply_date",reportDate:"report_date",note:"note",customerStance:"customer_stance",arrivalDate:"arrival_date"};
const DATEF = new Set(["nextReplyDate","reportDate","arrivalDate"]);
function toRow(o){const r={};for(const f in COL){let v=o[f];if(f==="amount")r[COL[f]]=(v===""||v==null||isNaN(parseFloat(v)))?null:parseFloat(v);else if(DATEF.has(f))r[COL[f]]=(v===""||v==null)?null:String(v);else r[COL[f]]=v==null?"":String(v).trim();}return r;}
function fromRow(r){const o={id:r.id};for(const f in COL){const v=r[COL[f]];o[f]=(v==null)?"":String(v);}o.createdAt=r.created_at||null;return o;}

let db=null;
function initDB(){
  if(typeof CONFIG==="undefined"||!CONFIG.SUPABASE_URL||!CONFIG.SUPABASE_ANON_KEY||CONFIG.SUPABASE_ANON_KEY.indexOf("ضع_هنا")===0){
    return false;
  }
  db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return true;
}

const api = {
  async list(){ const {data,error}=await db.from(TABLE).select("*").order("created_at",{ascending:false}); if(error)throw error; return (data||[]).map(fromRow); },
  async create(b){ const {data,error}=await db.from(TABLE).insert(toRow(b)).select().single(); if(error)throw error; return fromRow(data); },
  async update(id,b){ const {data,error}=await db.from(TABLE).update({...toRow(b),updated_at:new Date().toISOString()}).eq("id",id).select().single(); if(error)throw error; return fromRow(data); },
  async remove(id){ const {error}=await db.from(TABLE).delete().eq("id",id); if(error)throw error; return {ok:true}; },
  async import(records){
    const rows=records.map(toRow).filter(r=>r.report_no||r.customer);
    if(!rows.length) return {added:0,updated:0};
    const {data:ex,error:e1}=await db.from(TABLE).select("id,report_no"); if(e1)throw e1;
    const map=new Map(); (ex||[]).forEach(r=>{if(r.report_no)map.set(r.report_no,r.id);});
    const ins=[],upd=[];
    for(const row of rows){ const id=row.report_no?map.get(row.report_no):null; if(id)upd.push({id,row}); else ins.push(row); }
    if(ins.length){ const {error}=await db.from(TABLE).insert(ins); if(error)throw error; }
    for(const u of upd){ const {error}=await db.from(TABLE).update({...u.row,updated_at:new Date().toISOString()}).eq("id",u.id); if(error)throw error; }
    return {added:ins.length,updated:upd.length};
  }
};
const esc = s => (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const todayStr = () => new Date().toISOString().slice(0,10);
function addDays(dateStr,n){ const d=new Date(dateStr); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function fmtAmount(v){ if(v===""||v==null||isNaN(parseFloat(v))) return "—"; return parseFloat(v).toLocaleString("ar-EG",{maximumFractionDigits:2})+" ر.س"; }
function toast(msg,type){ const t=$("#toast"); t.textContent=msg; t.className="toast show "+(type||""); clearTimeout(t._t); t._t=setTimeout(()=>t.className="toast",2800); }

/* ================= منطق العدّاد SLA ================= */
// يحسب الأيام المتبقية حتى تاريخ الرد القادم
function daysLeft(c){
  if(!c.nextReplyDate) return null;
  const today = new Date(todayStr()+"T00:00:00");
  const due = new Date(c.nextReplyDate+"T00:00:00");
  return Math.round((due - today)/86400000);
}
// يصنّف الإلحاح ويعيد نص + كلاس
function slaInfo(c){
  const meta = STATUS_META[c.status] || {};
  if(meta.done) return {cls:"done",row:"",text:"✓ مكتمل",level:99};
  const d = daysLeft(c);
  if(d===null) return {cls:"none",row:"",text:"بدون موعد",level:98};
  if(d < 0)  return {cls:"over",  row:"row-over",  text:`⚠ متأخر ${Math.abs(d)} يوم`,level:0};
  if(d === 0)return {cls:"today", row:"row-today", text:"⏰ اليوم",level:1};
  if(d === 1)return {cls:"urgent",row:"row-urgent",text:"باقٍ يوم واحد",level:2};
  if(d === 2)return {cls:"urgent",row:"row-urgent",text:"باقٍ يومان",level:2};
  if(d <= 5) return {cls:"soon",  row:"",           text:`باقٍ ${d} أيام`,level:3};
  return {cls:"ok",row:"",text:`باقٍ ${d} يوم`,level:4};
}
// البلاغات التي تحتاج تنبيهًا (خلال يومين أو أقل، وغير مكتملة)
function isDueSoon(c){ const i=slaInfo(c); return i.level>=1 && i.level<=2; }
function isOverdue(c){ return slaInfo(c).level===0; }

/* ================= جلب وحفظ ================= */
async function refresh(){ state.data = await api.list(); render(); }

/* ================= الفلترة ================= */
function getFiltered(){
  let rows = state.data.slice();
  if(state.view==="due") rows = rows.filter(isDueSoon);
  else if(state.view==="overdue") rows = rows.filter(isOverdue);
  else if(state.view==="resolved") rows = rows.filter(c=>c.status==="تم معالجته");

  const q = state.search.trim().toLowerCase();
  if(q) rows = rows.filter(c=>[c.reportNo,c.orderNo,c.customer,c.phone].some(v=>(v||"").toLowerCase().includes(q)));
  if(state.fStatus) rows = rows.filter(c=>c.status===state.fStatus);
  if(state.fPay) rows = rows.filter(c=>c.payMethod===state.fPay);
  if(state.fSource) rows = rows.filter(c=>inferSource(c)===state.fSource);

  const s = state.sort;
  rows.sort((a,b)=>{
    if(s==="amount_desc") return (parseFloat(b.amount)||0)-(parseFloat(a.amount)||0);
    if(s==="amount_asc")  return (parseFloat(a.amount)||0)-(parseFloat(b.amount)||0);
    if(s==="date_asc")    return (a.reportDate||"").localeCompare(b.reportDate||"");
    if(s==="date_desc")   return (b.reportDate||"").localeCompare(a.reportDate||"");
    // due_asc: الأقرب موعدًا أولًا (المتأخر ثم اليوم ثم الأقرب)، والمكتمل/بلا موعد في الآخر
    const la=slaInfo(a), lb=slaInfo(b);
    const va = la.level<=4 ? (daysLeft(a)??9998) : 9999;
    const vb = lb.level<=4 ? (daysLeft(b)??9998) : 9999;
    return va-vb;
  });
  return rows;
}

/* ================= الرسم ================= */
function render(){
  const rows = getFiltered();
  const tb = $("#tbody"); tb.innerHTML="";
  $("#emptyState").style.display = rows.length===0 ? "block":"none";
  $("#countTag").textContent = `عرض ${rows.length} من ${state.data.length} بلاغ`;

  for(const c of rows){
    const meta = STATUS_META[c.status] || {cls:"b-replied"};
    const sla = slaInfo(c);
    const tr = document.createElement("tr");
    tr.className = (meta.done?"resolved ":"") + sla.row;
    tr.innerHTML = `
      <td><span class="sla-pill ${sla.cls}">${sla.text}</span></td>
      <td>${esc(c.reportNo)||"—"}</td>
      <td>${esc(c.orderNo)||"—"}</td>
      <td class="cust">${esc(c.customer)||"—"}</td>
      <td>${esc(c.phone)||"—"}</td>
      <td>${esc(c.payMethod)||"—"}</td>
      <td class="amt">${fmtAmount(c.amount)}</td>
      <td><span class="badge ${meta.cls}">${esc(c.status)||"—"}</span></td>
      <td>${esc(inferSource(c))||"—"}</td>
      <td>${esc(c.reportDate)||"—"}</td>
      <td>${esc(c.nextReplyDate)||"—"}</td>
      <td>${esc(c.arrivalDate)||"—"}</td>
      <td>${esc(c.customerStance)||"—"}</td>
      <td class="note">${esc(c.note)||"—"}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-act="edit" data-id="${c.id}" title="تعديل">✏️</button>
        <button class="icon-btn del" data-act="del" data-id="${c.id}" title="حذف">🗑️</button>
      </div></td>`;
    tb.appendChild(tr);
  }
  renderKPIs(); renderNav(); renderAlerts(); renderPayFilter(); renderCharts();
}

function renderKPIs(){
  const all = state.data;
  const cnt = st => all.filter(c=>c.status===st).length;
  const due = all.filter(isDueSoon).length;
  const cases = all.filter(c=>c.status==="قضية"||c.status==="مخالفة").length;
  const cards=[
    {cls:"k-total",lbl:"إجمالي البلاغات",val:all.length},
    {cls:"k-res",lbl:"تم معالجته",val:cnt("تم معالجته"),f:"تم معالجته"},
    {cls:"k-nore",lbl:"لم يتم الرد",val:cnt("لم يتم الرد"),f:"لم يتم الرد"},
    {cls:"k-post",lbl:"تم تأجيله",val:cnt("تم تأجيله"),f:"تم تأجيله"},
    {cls:"k-due",lbl:"ردود مستحقة قريبًا",val:due},
    {cls:"k-case",lbl:"قضايا / مخالفات",val:cases}
  ];
  $("#kpis").innerHTML = cards.map(d=>`<div class="kpi ${d.cls} ${d.f?"clk":""}" ${d.f?`data-kf="${d.f}"`:""}>
    <span class="bar"></span><div class="lbl">${d.lbl}</div><div class="val">${d.val}</div></div>`).join("");
}

function renderNav(){
  const all=state.data;
  $("#navCountAll").textContent = all.length;
  const due = all.filter(isDueSoon).length;
  const over = all.filter(isOverdue).length;
  $("#navCountDue").textContent = due;
  $("#navCountOver").textContent = over;
  $("#navCountRes").textContent = all.filter(c=>c.status==="تم معالجته").length;
  document.querySelector('.nav-item.alert').classList.toggle('has',due>0);
  document.querySelector('.nav-item.danger').classList.toggle('has',over>0);
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===state.view));
  const titles={all:["لوحة المتابعة","نظرة عامة على كل البلاغات ومواعيد الرد"],due:["يحتاج ردًا قريبًا","بلاغات باقٍ على موعد ردها يوم أو يومان"],overdue:["بلاغات متأخرة","تجاوزت موعد الرد المحدد — تحتاج إجراءً فوريًا"],resolved:["تم معالجتها","البلاغات المكتملة والمغلقة"]};
  $("#pageTitle").textContent=titles[state.view][0]; $("#pageSub").textContent=titles[state.view][1];
}

function renderAlerts(){
  const over = state.data.filter(isOverdue);
  const soon = state.data.filter(isDueSoon);
  const strip = $("#alertStrip");
  if(over.length===0 && soon.length===0){ strip.style.display="none"; return; }
  strip.style.display="flex";
  let txt = "";
  if(over.length) txt += `لديك <b>${over.length}</b> بلاغ متأخر`;
  if(over.length && soon.length) txt += " و ";
  if(soon.length) txt += `<b>${soon.length}</b> بلاغ يحتاج ردًا خلال يومين`;
  const chips = [...over.slice(0,4).map(c=>`<span class="as-chip" data-goto="${c.id}">⚠ ${esc(c.reportNo||c.customer)}</span>`),
                 ...soon.slice(0,4).map(c=>`<span class="as-chip soon" data-goto="${c.id}">⏰ ${esc(c.reportNo||c.customer)}</span>`)].join("");
  strip.innerHTML = `<span class="as-ic">🔔</span><span class="as-txt">${txt}</span><div class="as-list">${chips}</div>`;
}

function renderPayFilter(){
  const sel=$("#fPay"), cur=state.fPay;
  const methods=[...new Set(state.data.map(c=>c.payMethod).filter(Boolean))];
  sel.innerHTML='<option value="">كل وسائل الدفع</option>'+methods.map(m=>`<option ${m===cur?"selected":""}>${esc(m)}</option>`).join("");
}

/* ================= الشارتات ================= */
let charts={};
function renderCharts(){
  Object.values(charts).forEach(c=>c&&c.destroy()); charts={};
  const all=state.data;
  Chart.defaults.font.family="Tajawal, sans-serif"; Chart.defaults.font.size=12;

  const sList=Object.keys(STATUS_META);
  charts.status=new Chart($("#statusChart"),{type:"doughnut",
    data:{labels:sList,datasets:[{data:sList.map(s=>all.filter(c=>c.status===s).length),backgroundColor:sList.map(s=>STATUS_COLORS[s]),borderWidth:2,borderColor:"#fff"}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"58%",plugins:{legend:{position:"right",rtl:true,labels:{boxWidth:10,boxHeight:10,padding:8,font:{size:11}}}}}});

  const pays=[...new Set(all.map(c=>c.payMethod).filter(Boolean))];
  charts.pay=new Chart($("#payChart"),{type:"bar",
    data:{labels:pays.length?pays:["—"],datasets:[{data:pays.length?pays.map(p=>all.filter(c=>c.payMethod===p).length):[0],backgroundColor:"#0e5c57",borderRadius:6,maxBarThickness:34}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0},grid:{color:"#eef1f5"}},x:{grid:{display:false}}}}});

  const byDate={}; all.forEach(c=>{if(c.reportDate)byDate[c.reportDate]=(byDate[c.reportDate]||0)+1;});
  const dates=Object.keys(byDate).sort();
  charts.trend=new Chart($("#trendChart"),{type:"line",
    data:{labels:dates.length?dates:["—"],datasets:[{data:dates.length?dates.map(d=>byDate[d]):[0],borderColor:"#0e5c57",backgroundColor:"rgba(14,92,87,.12)",fill:true,tension:.35,pointRadius:3,pointBackgroundColor:"#0e5c57"}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0},grid:{color:"#eef1f5"}},x:{grid:{display:false}}}}});
}

/* ================= النموذج ================= */
function openForm(id){
  state.editingId=id||null;
  const c=id?state.data.find(x=>x.id===id):null;
  $("#formTitle").textContent=id?"تعديل البلاغ":"بلاغ جديد";
  FIELDS.forEach(f=>{const el=$("#f_"+f); if(el) el.value=c?(c[f]||""):"";});
  if(!c){
    $("#f_status").value="لم يتم الرد";
    $("#f_reportDate").value=todayStr();
    // احسب موعد الرد تلقائيًا حسب مهلة الـ SLA
    $("#f_nextReplyDate").value=addDays(todayStr(),state.slaDays);
  }
  $("#formOverlay").classList.add("open");
}
async function saveForm(){
  const get=f=>$("#f_"+f)?$("#f_"+f).value.trim():"";
  if(!get("reportNo")||!get("customer")){ toast("رقم البلاغ واسم العميل مطلوبان","err"); return; }
  const obj={}; FIELDS.forEach(f=>obj[f]=get(f));
  if(state.editingId) await api.update(state.editingId,obj); else await api.create(obj);
  $("#formOverlay").classList.remove("open");
  toast(state.editingId?"تم تحديث البلاغ":"تمت إضافة البلاغ","ok");
  await refresh();
}
async function delComplaint(id){
  const c=state.data.find(x=>x.id===id);
  if(!confirm(`حذف بلاغ رقم "${c?c.reportNo:""}"؟`)) return;
  await api.remove(id); await refresh(); toast("تم حذف البلاغ");
}

/* ================= الاستيراد / التصدير ================= */
async function importText(text){
  const res=Papa.parse(text.trim(),{header:true,skipEmptyLines:true});
  const records=res.data.map(row=>{const o={};for(const k in row){const f=HEADER_MAP[(k||"").trim()];if(f)o[f]=String(row[k]??"").trim();}return o;}).filter(o=>o.reportNo||o.customer);
  if(!records.length){ toast("لم يتم العثور على بيانات صالحة. تأكد من أسماء الأعمدة.","err"); return; }
  const r=await api.import(records); await refresh();
  toast(`تم الاستيراد: ${r.added} جديد، ${r.updated} محدّث`,"ok");
}
function importFile(file){ Papa.parse(file,{header:true,skipEmptyLines:true,complete:r=>{
  const records=r.data.map(row=>{const o={};for(const k in row){const f=HEADER_MAP[(k||"").trim()];if(f)o[f]=String(row[k]??"").trim();}return o;}).filter(o=>o.reportNo||o.customer);
  if(!records.length){toast("لم يتم العثور على بيانات صالحة","err");return;}
  api.import(records).then(async res=>{await refresh();toast(`تم الاستيراد: ${res.added} جديد، ${res.updated} محدّث`,"ok");});
},error:()=>toast("تعذّر قراءة الملف","err")}); }

function downloadTemplate(){
  const ex={"رقم البلاغ":"BLG-1001","رقم الطلب":"ORD-55231","اسم العميل":"محمد أحمد","رقم الجوال":"0555000111","وسيلة الدفع":"تابي","مبلغ الدفع":"450","حالة البلاغ":"لم يتم الرد","المصدر":"وزارة التجارة","تاريخ الرد القادم":addDays(todayStr(),3),"تاريخ البلاغ":todayStr(),"ملاحظة":"العميل يطالب باسترداد المبلغ","موقف العميل":"غير راضٍ","تاريخ وصول الطلب او التحويل":addDays(todayStr(),-4)};
  const headers=HEADER_ORDER.map(f=>HEADERS[f]);
  download("\uFEFF"+Papa.unparse({fields:headers,data:[headers.map(h=>ex[h]||"")]}),"قالب_البلاغات.csv");
}
function exportCSV(){
  if(!state.data.length){toast("لا توجد بيانات للتصدير","err");return;}
  const headers=HEADER_ORDER.map(f=>HEADERS[f]);
  const data=getFiltered().map(c=>HEADER_ORDER.map(f=>c[f]||""));
  download("\uFEFF"+Papa.unparse({fields:headers,data}),"البلاغات_"+todayStr()+".csv");
  toast("تم تصدير الملف","ok");
}
function download(content,name){
  const b=new Blob([content],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

/* ================= بيانات تجريبية ================= */
async function loadSample(){
  const T=todayStr();
  const s=[
    {reportNo:"BLG-1001",orderNo:"ORD-55231",customer:"محمد أحمد الغامدي",phone:"0555000111",payMethod:"تابي",amount:"450",status:"لم يتم الرد",nextReplyDate:addDays(T,-2),reportDate:addDays(T,-5),note:"العميل يطالب باسترداد المبلغ بالكامل",customerStance:"غير راضٍ",arrivalDate:addDays(T,-8)},
    {reportNo:"BLG-1002",orderNo:"ORD-55198",customer:"سارة عبدالله",phone:"0533221100",payMethod:"مدى",amount:"1250",status:"تم معالجته",nextReplyDate:"",reportDate:addDays(T,-9),note:"تم استرداد المبلغ وإغلاق البلاغ",customerStance:"راضٍ",arrivalDate:addDays(T,-14)},
    {reportNo:"BLG-1003",orderNo:"ORD-55402",customer:"خالد المطيري",phone:"0501234567",payMethod:"تمارا",amount:"799",status:"لم يتم الرد",nextReplyDate:addDays(T,1),reportDate:addDays(T,-2),note:"بانتظار مستندات من التاجر",customerStance:"ينتظر ردًا",arrivalDate:addDays(T,-4)},
    {reportNo:"BLG-1004",orderNo:"ORD-55510",customer:"نورة السالم",phone:"0544778899",payMethod:"فيزا",amount:"2100",status:"قضية",nextReplyDate:addDays(T,2),reportDate:addDays(T,-3),note:"تم رفع الأمر كقضية لدى الجهات المختصة",customerStance:"متابع قانونيًا",arrivalDate:addDays(T,-13)},
    {reportNo:"BLG-1005",orderNo:"ORD-55631",customer:"عبدالرحمن الدوسري",phone:"0567891234",payMethod:"تحويل بنكي",amount:"340",status:"تم الرد",nextReplyDate:addDays(T,4),reportDate:addDays(T,-1),note:"تم الرد على العميل بالحل المقترح",customerStance:"يدرس العرض",arrivalDate:addDays(T,-6)},
    {reportNo:"BLG-1006",orderNo:"ORD-55700",customer:"لمياء القحطاني",phone:"0512345678",payMethod:"تابي",amount:"980",status:"تم تأجيله",nextReplyDate:addDays(T,0),reportDate:addDays(T,-2),note:"رُصدت مخالفة على التاجر",customerStance:"غير راضٍ",arrivalDate:addDays(T,-5)}
  ];
  const r=await api.import(s); await refresh();
  toast(`تم تحميل ${r.added} بلاغ تجريبي`,"ok");
}

/* ================= تنبيهات المتصفح ================= */
function notifyDue(){
  if(!("Notification" in window)) return;
  const over=state.data.filter(isOverdue).length;
  const soon=state.data.filter(isDueSoon).length;
  if(over===0 && soon===0) return;
  const body = (over?`${over} بلاغ متأخر`:"") + (over&&soon?" و ":"") + (soon?`${soon} بلاغ يحتاج ردًا خلال يومين`:"");
  if(Notification.permission==="granted"){
    new Notification("🔔 تذكير بمواعيد الرد", {body, dir:"rtl"});
  }
}
$("#btnNotify").onclick=()=>{
  if(!("Notification" in window)){ toast("المتصفح لا يدعم التنبيهات","err"); return; }
  Notification.requestPermission().then(p=>{
    if(p==="granted"){ toast("تم تفعيل التنبيهات","ok"); notifyDue(); }
    else toast("لم يتم منح إذن التنبيهات","err");
  });
};

/* ================= ربط الأحداث ================= */
$("#btnAdd").onclick=()=>openForm();
$("#btnSave").onclick=saveForm;
$("#btnSample").onclick=loadSample;
$("#btnExport").onclick=exportCSV;
$("#btnImport").onclick=()=>$("#importOverlay").classList.add("open");
$("#btnTemplate").onclick=downloadTemplate;
$("#btnDoPaste").onclick=()=>{const t=$("#pasteArea").value; if(!t.trim()){toast("الصق البيانات أولًا","err");return;} importText(t); $("#pasteArea").value=""; $("#importOverlay").classList.remove("open");};
$("#dropZone").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=e=>{if(e.target.files[0]){importFile(e.target.files[0]);$("#importOverlay").classList.remove("open");e.target.value="";}};

document.querySelectorAll("[data-close]").forEach(b=>b.onclick=e=>e.target.closest(".overlay").classList.remove("open"));
document.querySelectorAll(".overlay").forEach(o=>o.onclick=e=>{if(e.target===o)o.classList.remove("open");});

$("#search").oninput=e=>{state.search=e.target.value;render();};
$("#fStatus").onchange=e=>{state.fStatus=e.target.value;render();};
$("#fPay").onchange=e=>{state.fPay=e.target.value;render();};
$("#fSource").onchange=e=>{state.fSource=e.target.value;render();};
$("#fSort").onchange=e=>{state.sort=e.target.value;render();};
$("#btnClear").onclick=()=>{state.search="";state.fStatus="";state.fPay="";state.fSource="";state.sort="due_asc";$("#search").value="";$("#fStatus").value="";$("#fPay").value="";$("#fSource").value="";$("#fSort").value="due_asc";render();};

$("#slaDays").onchange=e=>{state.slaDays=Math.max(1,parseInt(e.target.value)||3);};

$("#tbody").onclick=e=>{const b=e.target.closest("[data-act]");if(!b)return;
  if(b.dataset.act==="edit")openForm(b.dataset.id);
  if(b.dataset.act==="del")delComplaint(b.dataset.id);};

document.querySelectorAll("th.sortable").forEach(th=>th.onclick=()=>{
  const k=th.dataset.sort;
  if(k==="amount")state.sort=state.sort==="amount_desc"?"amount_asc":"amount_desc";
  if(k==="date")state.sort=state.sort==="date_desc"?"date_asc":"date_desc";
  if(k==="due")state.sort="due_asc";
  $("#fSort").value=state.sort;render();});

$("#kpis").onclick=e=>{const k=e.target.closest("[data-kf]");if(!k)return;state.view="all";state.fStatus=k.dataset.kf;$("#fStatus").value=state.fStatus;render();};

document.querySelectorAll(".nav-item").forEach(n=>n.onclick=()=>{state.view=n.dataset.view;state.fStatus="";$("#fStatus").value="";render();});

$("#alertStrip").onclick=e=>{const chip=e.target.closest("[data-goto]");if(!chip)return;
  const c=state.data.find(x=>x.id===chip.dataset.goto); if(c)openForm(c.id);};

/* ================= الإقلاع ================= */
(async function init(){
  if(!initDB()){
    document.querySelector(".main").innerHTML =
      '<div style="max-width:640px;margin:60px auto;background:#fff;border:1px solid #e6eaf0;border-radius:16px;padding:28px 30px;box-shadow:0 8px 24px rgba(0,0,0,.06)">'+
      '<h2 style="font-family:Cairo;font-size:20px;margin-bottom:12px">⚙️ خطوة أخيرة: أضِف مفتاح Supabase</h2>'+
      '<p style="color:#4a5568;line-height:1.9">افتح ملف <b>config.js</b> وضع فيه مفتاح <b>anon</b> العام من مشروعك على Supabase '+
      '(من <b>Settings → API</b>)، ثم احفظ وأعد فتح الصفحة.</p>'+
      '<p style="color:#75839a;font-size:13px;margin-top:14px">الرابط مضبوط بالفعل. تحتاج فقط لصق مفتاح anon مكان النص التوضيحي.</p>'+
      '</div>';
    return;
  }
  try{
    await refresh();
    setTimeout(notifyDue,1200);
    setInterval(()=>{ refresh().then(()=>notifyDue()); }, 30*60*1000);
  }catch(e){
    toast("تعذّر الاتصال بقاعدة البيانات — تأكد من المفتاح وسياسات الجدول","err");
    console.error(e);
  }
})();
