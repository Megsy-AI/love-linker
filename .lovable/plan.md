# خطة: وكيل حقيقي مستضاف بدون VPS — OpenManus على Novita + Browser Use Cloud

## لماذا غيّرنا الاتجاه
- **Kortix/Suna** مغلق حاليًا أمام حسابات جديدة. ([1](https://kortix.com/pricing))
- المستخدم لا يستطيع استئجار VPS.
- الحل الوحيد لـ "وكيل حقيقي" بدون VPS وبدون SaaS مغلق: تشغيل كود OpenManus الأصلي داخل **sandbox مستضاف**، مع التواصل مع التطبيق عبر API.

## الخيار الأساسي: Novita Agent Runtime / Novita Sandbox
**Novita** توفر بيئة sandbox مخصصة للوكلاء مع:
- $100 رصيد مجاني للمستخدمين الجدد بدون بطاقة ائتمان. ([2](https://novita.ai/docs/guides/sandbox-your-first-agent-sandbox))
- دعم long-running sessions (أكثر من ساعة). ([3](https://novita.ai/docs/guides/sandbox-long-running))
- Public URL لكل sandbox. ([4](https://novita.ai/docs/guides/sandbox-internet-access))
- تكامل مباشر مع browser-use. ([5](https://novita.ai/docs/guides/sandbox-integrations-browser-use))
- Agent Runtime يبسّط نشر الوكيل دون إدارة infrastructure. ([6](https://novita.ai/docs/guides/sandbox-agent-runtime-introduction))

**بديل احتياطي:** E2B Sandbox/Desktop (نفس المبدأ، $100 رصيد مجاني، مستخدمة من Manus). ([7](https://e2b.dev/pricing))

## ما سيتغير للمستخدم
- تبويب الوكيل يشغل مهام حقيقية: تخطيط، متصفح، تنفيذ كود، إنتاج ملفات، خطوات متتابعة.
- المهام تكمل حتى مع إغلاق التاب (الوكيل يعمل داخل sandbox على Novita).
- المتصفح يتعامل مع فورمات وتسجيل دخول ومواقع معقدة عبر browser-use أو Browser Use Cloud.
- التصميم الحالي كما هو؛ التغيير في المحرك والربط فقط.

## المتطلبات من المستخدم قبل البدء
1. **حساب Novita** على `https://novita.ai` وإكمال الاستبيان لتحصل على $100 رصيد. ([2](https://novita.ai/docs/guides/sandbox-your-first-agent-sandbox))
2. **API key** من لوحة Novita.
3. **مفتاح نموذج** (OpenAI/OpenRouter/أي مزود) يضعه الوكيل داخل Novita لطلبات LLM. OpenManus يدعم OpenAI API-compatible keys.
4. (اختياري) **Browser Use Cloud API key** يبدأ بـ `bu_` للمهام المعقدة التي تحتاج متصفحًا مستضافًا بشكل منفصل. ([8](https://docs.browser-use.com/cloud/llms.txt))

## المراحل

### 1) تجهيز الوكيل الأساسي (OpenManus على Novita)
- بناء حزمة Python خفيفة: OpenManus الأصلي + wrapper FastAPI يستقبل المهام ويبث الأحداث.
- الوكيل يعمل داخل sandbox طويل الأمد على Novita (long-running mode).
- يستخدم browser-use كأداة داخلية (مثبت مسبقًا في Novita أو عبر pip).
- نقاط النهاية: `POST /run`، `GET /stream/{run_id}`، `POST /stop/{run_id}`، `POST /answer/{run_id}`.
- النشر عبر Novita Agent Runtime أو `novita` CLI/Sandbox API.

### 2) أداة المتصفح المستضافة (Browser Use Cloud)
- إذا احتاج الوكيل مهام متصفح معقدة (تسجيل دخول، فورمات، captcha)، نضيف أداة `browser-use-cloud`:
  - Edge Function في تطبيقنا تستقبل هدفًا وصفحة، وتستدعي Browser Use Cloud Agent API.
  - تُرجع النص + لقطات/روابط.
- يمكن استدعاؤها من داخل OpenManus كـ tool إضافية، أو من التطبيق مباشرة عند الحاجة.
- Skyvern يُرجأ بسبب AGPL وحاجته لاستضافة منفصلة.

### 3) توحيد قاعدة البيانات في التطبيق
حذف/تجاهل الجداول المتفرقة الحالية (`long_runs`, `operator_runs`, `computer_tasks`, `dev_runs`) واستبدالها بأربعة جداول موحّدة:
- `agent_runs` — المستخدم، الحالة، المهمة، معرّف Novita، رابط الوكيل، التوقيتات.
- `agent_steps` — رقم الخطوة، النص/الملخص، الحالة.
- `agent_tool_calls` — اسم الأداة، المدخلات، النتيجة المختصرة.
- `agent_artifacts` — الملفات الناتجة + مسار Supabase Storage.

RLS: كل مستخدم يرى تشغيلاته فقط. GRANTs مطلوبة لـ `authenticated` و`service_role`.

### 4) بوابة Edge Functions
- `agent-gateway`: تتحقق من الهوية والحصص، تنشئ صفًا في `agent_runs`، تستدعي Novita sandbox agent API، وتخزّن معرّفات التشغيل.
- `agent-stream`: تمرير أحداث SSE من الوكيل Novita إلى الواجهة.
- `agent-stop` / `agent-answer`: إيقاف أو إجابة على أسئلة توضيحية.
- الأسرار: `NOVITA_API_KEY`، `AGENT_BASE_URL` (إن وجد)، `BROWSER_USE_API_KEY`.

### 5) تحويل الواجهة
- استبدال `useLongRun` وكل محركاته بـ `useAgentRun` واحد.
- `useAgentRun` يقرأ من الجداول الجديدة + SSE من `agent-stream`.
- ربط تبويب الوكيل والشات به، وعرض الأدوات والملفات الناتجة.

### 6) إزالة المحركات القديمة
تعطيل/حذف: `src/lib/manusLoop.ts`، `src/lib/agentkernel/*`، `supabase/functions/_shared/agentkernel/*`، `operator-orchestrator`، `long-run` edge function، `computer-agent` edge function، `agent-tick`.

### 7) اختبار حقيقي
- مهمة بحث + تقرير ملف.
- مهمة كود تُنفَّذ داخل sandbox Novita.
- مهمة متصفح تتطلب تسجيل دخول أو فورم.
- مهمة طويلة: إغلاق التاب والعودة، والتشغيل مستمر.

## من أين نبدأ الآن
نبدأ بـ **إنشاء حساب Novita والحصول على API key**. بعدها نبني wrapper OpenManus الصغير ونختبره من الكود المحلي قبل نشره. بعد التأكد من عمله، نبدأ المراحل 3 و4 و5 في التطبيق.

## ملاحظات واقعية
- هذا ليس SaaS جاهزًا مثل Kortix؛ يتطلب كتابة wrapper Python صغير حول OpenManus.
- الرصيد المجاني $100 من Novita يكفي للتجربة والاختبار، لكن التشغيل المستمر في الإنتاج يحتاج دفعًا حسب الاستخدام.
- إذا فشل Novita لأي سبب، ننتقل إلى E2B (نفس المبدأ، نفس الرصيد المجاني).
