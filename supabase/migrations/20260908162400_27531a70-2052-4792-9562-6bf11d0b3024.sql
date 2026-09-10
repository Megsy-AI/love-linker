-- Reports are upserted per (user, session); without this unique index the
-- upsert fails and finished reports are never saved.
DELETE FROM public.research_reports r
USING public.research_reports keep
WHERE r.user_id = keep.user_id
  AND r.session_key = keep.session_key
  AND r.created_at < keep.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS research_reports_user_session_key
  ON public.research_reports (user_id, session_key);