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
