# حساب الاختبار (QA)

> للاستخدام الداخلي في اختبار الخدمات فقط. غيّر كلمة المرور أو احذف الحساب قبل الإطلاق العام.

| البيان | القيمة |
| --- | --- |
| البريد | `megsy.qa.tester2026@gmail.com` |
| كلمة المرور | `MegsyQA!2026#test` |
| معرّف المستخدم | `9def8071-262b-495e-a854-32ef7f59c014` |
| الخطة | Pro (نشطة سنة) |

## ما تم اختباره بهذا الحساب

| الخدمة | الحالة |
| --- | --- |
| الدردشة (تدفّق) | ✅ يعمل |
| توليد الصور (DeAPI عبر `anything-api`) | ✅ رابط صورة حقيقي |
| توليد الفيديو (DeAPI عبر `media-video` + `media-video-poll`) | ✅ فيديو mp4 مكتمل |
| الديب ريسرش (`deep-research`) | ✅ تدفّق نصي |
| السلايدس (`chat-slides-stream` / `background_jobs`) | ✅ مهمة مكتملة 100% |
| وكيل الكمبيوتر (Browser Use) | ✅ مهمة قيد التشغيل مع سلّم موديلات بديلة |
| وكيل البرمجة (`kimi-coder`) | ✅ تدفّق SSE |
| استيراد المهارات (`import-skill`) | ✅ استوردت مهارة تجريبية |
| الدفع كاشير (عرب) | ✅ رابط دفع حقيقي |
| الدفع دودو (عالمي) | ✅ روابط شهري/سنوي + ويبهوك موقّع |
| التكاملات (Pipedream) | ✅ Connect token |
| الإحالة (tiers + reward tasks) | ✅ مزروعة وتُقرأ في الواجهة |
| البحث على الويب | ⚠️ يحتاج مفتاح `BRAVE_API_KEY` أو `TAVILY_API_KEY` أو `SERPER_API_KEY` |

## Agent deployment (Freestyle)
- `build_and_deploy_app` verified end to end: https://bean-bar-jo9e4.style.dev (HTTP 200)
- Sites are served from a Freestyle Ubuntu VM on port 3000 behind a free `*.style.dev` HTTPS domain.
