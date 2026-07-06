-- ═══════════════════════════════════════════════════════════════
--  كود Supabase لنسخة الاتصال المباشر من المتصفح (نظام داخلي)
--  الصقه في: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.complaints (
  id              uuid primary key default gen_random_uuid(),
  report_no       text default '',
  order_no        text default '',
  customer        text default '',
  phone           text default '',
  pay_method      text default '',
  amount          numeric,
  status          text default 'لم يتم الرد',
  source          text default '',
  next_reply_date date,
  report_date     date,
  note            text default '',
  customer_stance text default '',
  arrival_date    date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists complaints_report_no_idx  on public.complaints (report_no);
create index if not exists complaints_status_idx     on public.complaints (status);
create index if not exists complaints_next_reply_idx on public.complaints (next_reply_date);

-- ── سياسات الوصول ──
-- بما أن المتصفح يتصل بمفتاح anon العام، فعّلنا RLS وأضفنا سياسة تسمح بالقراءة والكتابة.
-- هذا مناسب لنظام داخلي بلا بيانات سرية. لتقييد الوصول لاحقًا، استبدلها بسياسة تعتمد على تسجيل الدخول.
alter table public.complaints enable row level security;

drop policy if exists "internal_full_access" on public.complaints;
create policy "internal_full_access" on public.complaints
  for all
  to anon, authenticated
  using (true)
  with check (true);
