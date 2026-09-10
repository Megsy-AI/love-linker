CREATE TABLE IF NOT EXISTS public.video_quota_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_quota_usage TO authenticated;
GRANT ALL ON public.video_quota_usage TO service_role;

ALTER TABLE public.video_quota_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own video usage" ON public.video_quota_usage;
CREATE POLICY "Users read their own video usage"
  ON public.video_quota_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS video_quota_usage_user_period_idx
  ON public.video_quota_usage (user_id, period);

CREATE OR REPLACE FUNCTION public.video_quota_tier(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN 'free'
    WHEN public.has_elite_plan(_user_id) THEN 'elite'
    WHEN public.has_paid_plan(_user_id) THEN 'pro'
    ELSE 'free'
  END
$$;

REVOKE EXECUTE ON FUNCTION public.video_quota_tier(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_video_quota(
  _model text DEFAULT NULL,
  _unlimited boolean DEFAULT false,
  _user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := coalesce(auth.uid(), _user_id);
  v_tier text;
  v_limit int;
  v_used int;
  v_period text := to_char(now(), 'YYYY-MM');
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'sign in required', 'message', 'sign in required');
  END IF;

  IF _unlimited THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'message', '');
  END IF;

  v_tier := public.video_quota_tier(v_uid);
  v_limit := CASE v_tier WHEN 'elite' THEN 120 WHEN 'pro' THEN 40 ELSE 3 END;

  SELECT count(*) INTO v_used FROM public.video_quota_usage
   WHERE user_id = v_uid AND period = v_period;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'video_quota_exceeded',
      'message', 'monthly video limit reached', 'tier', v_tier, 'limit', v_limit,
      'used', v_used, 'remaining', 0);
  END IF;

  INSERT INTO public.video_quota_usage (user_id, period, model)
  VALUES (v_uid, v_period, _model);

  RETURN jsonb_build_object('allowed', true, 'message', '', 'tier', v_tier,
    'limit', v_limit, 'used', v_used + 1, 'remaining', greatest(v_limit - v_used - 1, 0));
END
$$;

REVOKE EXECUTE ON FUNCTION public.consume_video_quota(text, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_video_quota(text, boolean, uuid) TO authenticated, service_role;