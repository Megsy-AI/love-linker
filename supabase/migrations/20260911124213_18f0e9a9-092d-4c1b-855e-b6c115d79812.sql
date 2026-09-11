ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

CREATE OR REPLACE FUNCTION public.consume_premium_image(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := 3;
  v_used int := 0;
  v_paid boolean := false;
  v_trial boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'unlimited', false, 'used', 0, 'limit', v_limit, 'reason', 'anonymous');
  END IF;

  SELECT public.has_paid_plan(p_user_id) INTO v_paid;
  SELECT (trial_ends_at IS NOT NULL AND trial_ends_at > now())
    INTO v_trial FROM public.profiles WHERE id = p_user_id;
  v_trial := COALESCE(v_trial, false);

  -- Full subscribers (past the trial window) are unlimited.
  IF v_paid AND NOT v_trial THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'used', 0, 'limit', v_limit);
  END IF;

  -- No plan and no trial: premium models require the $1 trial or a subscription.
  IF NOT v_trial THEN
    RETURN jsonb_build_object('allowed', false, 'unlimited', false, 'used', 0, 'limit', v_limit, 'reason', 'no_plan');
  END IF;

  INSERT INTO public.premium_image_usage (user_id, day, used)
  VALUES (p_user_id, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE
    SET used = public.premium_image_usage.used + 1, updated_at = now()
  RETURNING used INTO v_used;

  IF v_used > v_limit THEN
    UPDATE public.premium_image_usage
       SET used = v_limit, updated_at = now()
     WHERE user_id = p_user_id AND day = (now() AT TIME ZONE 'utc')::date;
    RETURN jsonb_build_object('allowed', false, 'unlimited', false, 'used', v_limit, 'limit', v_limit, 'reason', 'daily_limit');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'unlimited', false, 'used', v_used, 'limit', v_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.premium_image_quota()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_limit int := 3;
  v_used int := 0;
  v_paid boolean := false;
  v_trial boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'unlimited', false, 'used', 0, 'limit', v_limit, 'trial', false);
  END IF;
  SELECT public.has_paid_plan(v_uid) INTO v_paid;
  SELECT (trial_ends_at IS NOT NULL AND trial_ends_at > now())
    INTO v_trial FROM public.profiles WHERE id = v_uid;
  v_trial := COALESCE(v_trial, false);
  SELECT COALESCE(used, 0) INTO v_used
    FROM public.premium_image_usage
   WHERE user_id = v_uid AND day = (now() AT TIME ZONE 'utc')::date;
  v_used := COALESCE(v_used, 0);

  RETURN jsonb_build_object(
    'allowed', CASE WHEN v_paid AND NOT v_trial THEN true WHEN v_trial THEN v_used < v_limit ELSE false END,
    'unlimited', (v_paid AND NOT v_trial),
    'used', v_used,
    'limit', v_limit,
    'trial', v_trial
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_premium_image(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_premium_image(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.premium_image_quota() TO authenticated;