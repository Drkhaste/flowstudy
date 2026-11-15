# StudyFlow · Personal Notebook 0.2.0

نسخه‌ی دوم StudyFlow یک فضای نوشتن واکنش‌گرا و قابل نصب (PWA) است. این نسخه با هدف تست S Pen روی Galaxy Tab S6 Lite ساخته شده و اکنون ساختار انتشار آن به **Cloudflare Workers + Static Assets** منتقل شده است.

## ویژگی‌ها

- تشخیص نوع ورودی با Pointer Events (قلم، لمس و ماوس)
- استفاده از `getCoalescedEvents()` برای دریافت نمونه‌های دقیق‌تر حرکت قلم
- دریافت فشار قلم و کنترل ضخامت خط بر اساس فشار
- بی‌اثر کردن ورودی لمسی به‌صورت پیش‌فرض برای کاهش لمس ناخواسته کف دست
- قلم، هایلایتر و پاک‌کن؛ انتخاب رنگ و ضخامت
- واگرد و ازنو، پاک‌کردن صفحه و میان‌برهای صفحه‌کلید
- کاغذ شطرنجی، خط‌دار، نقطه‌ای و سفید
- ذخیره‌ی خودکار محلی در IndexedDB با fallback به localStorage
- خروجی PNG از صفحه
- PWA با cache پایه برای استفاده پس از اولین بازدید
- رابط فارسی بازطراحی‌شده، واکنش‌گرا برای تبلت و موبایل
- Worker endpoint در `/api/health` برای بررسی وضعیت انتشار

> فایل‌ها و یادداشت‌ها در این نسخه همچنان فقط روی همان دستگاه ذخیره می‌شوند. همگام‌سازی ابری و PDF Reader در فازهای بعدی اضافه می‌شوند.

## تکنولوژی

- React 19 + TypeScript
- Vite 8
- Canvas 2D + Pointer Events
- IndexedDB
- Cloudflare Workers Static Assets
- Wrangler 4

## Build و Deploy

نیازمند Node.js نسخه‌ی 22.12 یا جدیدتر است.

```bash
npm install
npm run build
```

خروجی فرانت‌اند در `dist/` تولید می‌شود. تنظیمات Worker در فایل `wrangler.jsonc` قرار دارد:

- Worker name: `studyflow-pen-lab`
- Assets directory: `./dist`
- SPA fallback: فعال
- `ASSETS` binding: فعال
- اجرای کد Worker برای مسیرهای `/api/*`

برای انتشار مستقیم از محیط دارای Node.js و دسترسی Cloudflare:

```bash
npx wrangler deploy
```

## اتصال GitHub به Cloudflare Workers

1. در Cloudflare وارد **Workers & Pages** شو.
2. گزینه‌ی **Create application** و سپس **Workers** را انتخاب کن.
3. گزینه‌ی اتصال به GitHub را بزن و مخزن `Drkhaste/flowstudy` را انتخاب کن.
4. شاخه‌ی انتشار را `main` قرار بده.
5. نام Worker باید دقیقاً `studyflow-pen-lab` باشد؛ این نام با `name` در `wrangler.jsonc` یکی است.
6. Build command را `npm run build` قرار بده.
7. Deploy command را `npx wrangler deploy` قرار بده.
8. Root directory را ریشه‌ی مخزن (پیش‌فرض `/`) بگذار و Save and Deploy را اجرا کن.

پس از اتصال، هر push به شاخه‌ی `main` می‌تواند Build و Deploy خودکار را اجرا کند. آدرس انتشار از نوع `https://studyflow-pen-lab.<account-subdomain>.workers.dev` خواهد بود؛ زیر‌دامنه‌ی دقیق را Cloudflare تعیین می‌کند.

مستندات رسمی:

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Workers Builds / Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

## آزمایش روی Galaxy Tab S6 Lite

1. آدرس `workers.dev` را در Chrome تبلت باز کن.
2. از منوی مرورگر، **Add to Home screen / Install app** را انتخاب کن.
3. مطمئن شو «حساسیت فشار» روشن و «نوشتن با لمس» خاموش است.
4. یک خط از فشار کم به زیاد بکش و تغییر عدد فشار و ضخامت را بررسی کن.
5. با S Pen بنویس و هم‌زمان کف دست را روی صفحه قرار بده.
6. صفحه را ببند و دوباره باز کن؛ نوشته‌ها باید از IndexedDB بازیابی شوند.
7. برای تست Worker، آدرس `/api/health` را باز کن؛ پاسخ باید JSON با `status: "ok"` باشد.

## ساختار پروژه

```text
studyflow/
├── .github/workflows/verify.yml
├── public/
│   ├── icons/
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── _headers
├── src/
│   ├── components/
│   ├── lib/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── worker.ts
├── index.html
├── package.json
├── vite.config.ts
└── wrangler.jsonc
```

## حریم خصوصی و محدودیت‌ها

- هیچ فایل یا یادداشتی در این نسخه به سرور ارسال نمی‌شود.
- داده‌ها داخل مرورگر و همان دستگاه ذخیره می‌شوند؛ پاک‌کردن داده‌های سایت ممکن است آن‌ها را حذف کند.
- نصب PWA به‌معنی همگام‌سازی بین دستگاه‌ها نیست.
- دریافت فشار S Pen و میزان Palm Rejection به مرورگر و سیستم‌عامل وابسته است. وب‌اپ ورودی `touch` را نادیده می‌گیرد، اما نمی‌تواند جایگزین رد لمس سخت‌افزاری سیستم‌عامل شود.
