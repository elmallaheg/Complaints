-- ═══════════════════════════════════════════════════════════════
--  كود إنشاء قاعدة بيانات البلاغات على Supabase
--  انسخ هذا الملف كاملاً والصقه في:  Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

-- إضافة دعم توليد المعرّفات الفريدة (UUID)
create extension if not exists "pgcrypto";

-- جدول البلاغات
create table if not exists public.complaints (
  id                uuid primary key default gen_random_uuid(),
  report_no         text default '',          -- رقم البلاغ
  order_no          text default '',          -- رقم الطلب
  customer          text default '',          -- اسم العميل
  phone             text default '',          -- رقم الجوال
  pay_method        text default '',          -- وسيلة الدفع
  amount            numeric,                  -- مبلغ الدفع
  status            text default 'لم يتم الرد', -- حالة البلاغ
  source            text default '',          -- المصدر (وزارة التجارة / سلة / تمارا / تابي)
  next_reply_date   date,                     -- تاريخ الرد القادم (موعد الاستحقاق)
  report_date       date,                     -- تاريخ البلاغ
  note              text default '',          -- ملاحظة
  customer_stance   text default '',          -- موقف العميل
  arrival_date      date,                     -- تاريخ وصول الطلب / التحويل
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- فهارس لتسريع البحث والفلترة
create index if not exists complaints_report_no_idx  on public.complaints (report_no);
create index if not exists complaints_status_idx     on public.complaints (status);
create index if not exists complaints_next_reply_idx on public.complaints (next_reply_date);
create index if not exists complaints_created_idx    on public.complaints (created_at desc);

-- تفعيل حماية الصفوف (RLS).
-- الخادم يتصل بمفتاح service_role الذي يتجاوز RLS، لذا لا حاجة لسياسات إضافية
-- طالما أن الوصول يتم عبر الخادم فقط. هذا يمنع القراءة العامة بمفتاح anon.
alter table public.complaints enable row level security;

-- (اختياري) لو أردت لاحقًا الوصول المباشر من المتصفح بمفتاح anon، أضِف سياسة مناسبة:
-- create policy "allow read" on public.complaints for select using (true);
