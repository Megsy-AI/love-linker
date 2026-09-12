# Roadmap

## Done
- [x] Import full project from GitHub repo (love-linker-7159ea4f) and run it on the same template.

## In progress — MASTER QA AUDIT (read-only, real browser, test account support@megsyai.com)
- [ ] Chat (10 tests: easy → expert, multilingual AR/EN/FR/ES/DE/PT/ZH/JA, JSON, long context, multi-constraint)
- [ ] Coder / Website (10 tests incl. preview, routes, export)
- [ ] Images (10 tests)
- [ ] Slides (10 tests)
- [x] Deep Research (10 tests)
- [ ] Docs (10 tests)
- [ ] Learning (10 tests)
- [ ] Operator (10 safe tests)
- [ ] Computer: Web Search / MCP / Files (10 each)
- [ ] Long-running tasks (persistence, refresh, recovery)
- [ ] Execution UX audit (understanding message, Megsy Star, real tool activity, progress reports, no fake progress, no CoT leakage)
- [ ] Mobile + desktop (1366/1440/1920) + Dark/Light + RTL
- [ ] Error handling & recovery, cross-service flows, security/data isolation
- [ ] Final QA report with scores + severities

## Fix round (in progress)
- [x] Images: auto-pick a free model, never lose the user's text
- [x] Slides: respect the requested slide count
- [x] Documents: real Word / Excel / PDF downloads
- [x] Plan & credits shown correctly on the usage page
- [x] Published site links (/s/:slug) now open the real site instead of redirecting to chat
- [x] Website builder works without a cloud build machine (publishes a live link)
- [x] Link labels keep their path so site/doc links are distinguishable
- [x] Deep Research: speed + sources
- [ ] Long-running tasks recovery pass
- [x] Preserve long user messages behind an expandable “show more” control
- [x] Stop new messages from cancelling the current cloud-agent task
- [x] Reuse the same Browser Use session for follow-ups in one conversation
- [x] Keep Browser Use sessions alive and resume paused tasks correctly
- [x] Remove the legacy agent wait from normal chat and cap silent waiting

## One agent (Browser Use Cloud) — in progress
- [x] Route main agent / docs / deep research / coding to the single cloud agent
- [ ] Live thinking bar from the agent itself: every step (page opened, click, typed, extracted)
- [ ] Trace never disappears; after finish it collapses into a "Thinking" button with the full history
- [x] Files produced by the agent are stored on our side, so chips keep opening later
- [x] Coding results get a "run preview" that renders the produced page inside the app
- [x] Result surface: text + file chips (html/docx/xlsx/pdf) + openable links, like the reference screens
- [ ] Task survives closing the site: reopen shows it still running, or the finished result

## After audit
- [ ] Giant fix round based on findings (only after full audit approval)

- بوت الإدارة: كلمة سر الدخول 00 (سر ADMIN_BOT_PASSWORD) تفتح اللوحة لأي حد يكتبها

## تم (خزنة المفاتيح + البوت)
- [x] جدول مفاتيح مشفّر AES-GCM + تدوير + حظر تلقائي بعد ٣ أخطاء
- [x] بوت تليجرام للإدارة بكلمة سر (أزرار: إضافة مفتاح/الحالة/فك الحظر/المستخدمون/الزوار/الصفحات)
- [x] تتبّع الزيارات الذاتي (page_views) بدون أدوات خارجية
- [x] Cerebras فقط للنصوص + DeAPI/Renderful للوسائط + Browser Use للوكيل
- [ ] ينتظر: إضافة مفاتيح بها رصيد من خلال البوت لاختبار الشات بأقصى سرعة
- [x] البرمجة: لا يظهر أي كود في الواجهة (شرح + بطاقات فقط)
- [x] نسخة سرية لملفات كل مشروع على GitHub خاص (توكن يُضاف من البوت باسم GitHub)

## طلبات جديدة (11 سبتمبر)
- [ ] تجربة مجانية 7 أيام لكل مستخدم جديد
- [ ] تحديث بيانات الباقات (إزالة الفيديو + المزايا الجديدة)
- [x] زر الإرسال لا يتوقف أبدًا + بدء مهام في أي وقت
- [x] إصلاح التحميل العالق والشاشة البيضاء والتنقل بين كل الصفحات

## 2026-09-11 — Trial + premium images
- [x] Fourth welcome slide: new Korean editorial artwork + $1 / 3-day CTA
- [x] Dodo: 3-day card-linked trial before the $7 monthly plan
- [x] Kashier: trial SKU maps to the EGP intro price (no native trial support)
- [x] 3 premium images/day free, unlimited for subscribers (enforced in Postgres)
- [x] DeAPI gpt-image-2 / nano-banana-2 wired + cross-provider rescue chain
- [ ] Dodo dashboard: create the $1 / 3-day trial product, then add it to dodo_products with interval `monthly_trial`
- [x] Trial = $1 for 3 days (49 EGP via Kashier); 3 premium images/day during the trial, unlimited after
- [x] Pricing: make the $1 / 3-day offer the default, prominent choice on mobile and desktop
- [x] Computer Agent: read Browser Use keys from the encrypted Telegram-managed vault
