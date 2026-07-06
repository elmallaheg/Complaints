# لوحة إدارة ومتابعة البلاغات (Node.js + Supabase)

نظام متكامل لإدارة بلاغات **وزارة التجارة / تابي / تمارا / سلة**، مع **نظام تنبيهات ومهلة رد (SLA)** يذكّرك قبل تأخّر الرد، وقاعدة بيانات سحابية على **Supabase**.

## المميزات
- كل الحقول: رقم البلاغ، رقم الطلب، اسم العميل، الجوال، وسيلة الدفع، المبلغ، الحالة، **المصدر**، تاريخ الرد القادم، تاريخ البلاغ، الملاحظة، موقف العميل، تاريخ الوصول/التحويل.
- **مؤشر رد لكل بلاغ** بعدد الأيام المتبقية، يتحوّل للبرتقالي عند بقاء يوم/يومين وللأحمر عند التأخّر.
- شريط تنبيهات + عدّادات جانبية + **تنبيهات المتصفح**، ومهلة رد افتراضية قابلة للتعديل.
- بحث وفلترة (بالحالة/وسيلة الدفع/**المصدر**) وترتيب، و3 شارتات، والبلاغ المُعالَج يتلوّن أخضر.
- استيراد/تصدير CSV + قالب جاهز، مع تحديث تلقائي للمكرر بنفس رقم البلاغ.
- **قاعدة بيانات Supabase** (Postgres سحابي)، مع رجوع تلقائي لتخزين محلي (JSON) إن لم تُضبط الإعدادات.

## 1) التشغيل السريع (بدون إعداد)
المتطلب: **Node.js 18+**.
```bash
npm install
npm start
```
افتح: **http://localhost:3000** — سيعمل بالتخزين المحلي (`data/complaints.json`) مباشرة.

## 2) الربط بقاعدة بيانات Supabase
1. أنشئ مشروعًا مجانيًا على [supabase.com](https://supabase.com).
2. من لوحة تحكم Supabase افتح **SQL Editor → New query**، والصق محتوى الملف `supabase/schema.sql` كاملاً ثم اضغط **Run**. هذا ينشئ جدول `complaints`.
3. من **Project Settings**: انسخ **Project URL** ومفتاح **service_role** (تبويب API Keys).
4. جهّز ملف البيئة:
   ```bash
   cp .env.example .env
   ```
   ثم املأ:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOi...   (مفتاح service_role السري)
   ```
5. شغّل: `npm start` — سترى في الطرفية `نوع التخزين: SUPABASE`.

> ⚠️ مفتاح `service_role` سري ويتجاوز صلاحيات الجدول؛ لا ترفع ملف `.env` على GitHub (مستبعَد تلقائيًا في `.gitignore`).

## 3) تعبئة بيانات البداية (اختياري)
داخل مجلد `seed/` ملف `بلاغات_البذرة.csv` (25 بلاغًا مستخرجة). من التطبيق: **استيراد → ارفع الملف**.

## الرفع على GitHub
```bash
git init
git add .
git commit -m "لوحة إدارة البلاغات - نسخة Supabase"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## النشر أونلاين (اختياري)
انشره على [Render](https://render.com) أو [Railway](https://railway.app): اربط المستودع، واضبط متغيّرات البيئة `SUPABASE_URL` و`SUPABASE_SERVICE_KEY`، وأمر التشغيل `npm start`.

## البنية
```
complaints-app/
├── server.js              سيرفر Express + واجهة API
├── store/
│   ├── index.js           اختيار التخزين (Supabase أو JSON)
│   ├── supabaseStore.js   طبقة Supabase
│   ├── jsonStore.js       طبقة JSON المحلية
│   └── fields.js          الحقول والتحويل بين الواجهة وقاعدة البيانات
├── supabase/schema.sql    كود إنشاء الجدول على Supabase
├── seed/                  بيانات بداية جاهزة للاستيراد
├── public/                الواجهة (index.html, styles.css, app.js)
├── .env.example
└── package.json
```
