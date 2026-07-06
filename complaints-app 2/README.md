# لوحة إدارة البلاغات — نسخة الاتصال المباشر بـ Supabase

نظام إدارة بلاغات (وزارة التجارة / سلة / تمارا / تابي) بواجهة ثابتة تتصل **مباشرة بـ Supabase** من المتصفح — بدون خادم. تربطه بـ GitHub وينشر على Vercel مباشرة.

## المميزات
مؤشر مهلة الرد (SLA) لكل بلاغ، تنبيهات للبلاغات القريبة والمتأخرة، بحث وفلترة (الحالة/وسيلة الدفع/المصدر)، شارتات، تلوين البلاغ المُعالَج بالأخضر، واستيراد/تصدير CSV.

## الإعداد (خطوات مرتبة)

### 1) جهّز قاعدة البيانات
في Supabase: **SQL Editor → New query** → الصق محتوى `supabase/schema.sql` كاملاً → **Run**.
(ينشئ الجدول ويضيف سياسة وصول مناسبة لنظام داخلي.)

### 2) ضع مفتاح anon في config.js
افتح ملف `config.js` وضع فيه:
- `SUPABASE_URL`: رابط مشروعك (مضبوط مسبقًا).
- `SUPABASE_ANON_KEY`: مفتاح **anon** العام من **Settings → API → Project API keys → anon public**.

> استخدم مفتاح **anon** العام فقط — وليس `service_role`. المفتاح العام آمن للوضع في كود واجهة عامة.

### 3) شغّله محليًا (اختياري للتجربة)
افتح `index.html` مباشرة في المتصفح، أو شغّل خادمًا ثابتًا بسيطًا.

## الرفع على GitHub
```bash
git init
git add .
git commit -m "لوحة البلاغات - اتصال مباشر بـ Supabase"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## النشر على Vercel (مباشر)
1. في Vercel: **Add New → Project** → استورد المستودع من GitHub.
2. الإطار (Framework Preset): **Other** — لا حاجة لأي Build Command (موقع ثابت).
3. اضغط **Deploy**. لا حاجة لأي متغيّرات بيئة — الإعدادات في `config.js`.

## البيانات الأولية
من التطبيق: **استيراد → ارفع `seed/بلاغات_البذرة.csv`** (25 بلاغًا).

## الملفات
```
├── index.html      الواجهة
├── styles.css      التصميم
├── app.js          المنطق + الاتصال بـ Supabase
├── config.js       رابط ومفتاح Supabase (anon العام)
├── supabase/schema.sql   كود إنشاء الجدول والسياسات
└── seed/           بيانات بداية جاهزة للاستيراد
```
