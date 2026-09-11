CREATE TABLE IF NOT EXISTS public.premium_image_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

GRANT SELECT ON public.premium_image_usage TO authenticated;
GRANT ALL ON public.premium_image_usage TO service_role;

ALTER TABLE public.premium_image_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own premium image usage" ON public.premium_image_usage;
CREATE POLICY "Users read own premium image usage"
ON public.premium_image_usage FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_premium_image(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid boolean := false;
  v_limit integer := 3;
  v_used integer := 0;
  v_today date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'unlimited', false, 'used', 0, 'limit', v_limit);
  END IF;

  BEGIN
    SELECT public.has_paid_plan(p_user_id) INTO v_paid;
  EXCEPTION WHEN others THEN
    v_paid := false;
  END;

  IF v_paid THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'used', 0, 'limit', -1);
  END IF;

  INSERT INTO public.premium_image_usage (user_id, day, used)
  VALUES (p_user_id, v_today, 0)
  ON CONFLICT (user_id, day) DO NOTHING;

  SELECT used INTO v_used FROM public.premium_image_usage
  WHERE user_id = p_user_id AND day = v_today FOR UPDATE;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'unlimited', false, 'used', v_used, 'limit', v_limit);
  END IF;

  UPDATE public.premium_image_usage
  SET used = used + 1, updated_at = now()
  WHERE user_id = p_user_id AND day = v_today
  RETURNING used INTO v_used;

  RETURN jsonb_build_object('allowed', true, 'unlimited', false, 'used', v_used, 'limit', v_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.premium_image_quota(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid boolean := false;
  v_used integer := 0;
BEGIN
  BEGIN
    SELECT public.has_paid_plan(p_user_id) INTO v_paid;
  EXCEPTION WHEN others THEN
    v_paid := false;
  END;
  IF v_paid THEN
    RETURN jsonb_build_object('unlimited', true, 'used', 0, 'limit', -1);
  END IF;
  SELECT COALESCE(used, 0) INTO v_used FROM public.premium_image_usage
  WHERE user_id = p_user_id AND day = (now() AT TIME ZONE 'utc')::date;
  RETURN jsonb_build_object('unlimited', false, 'used', COALESCE(v_used, 0), 'limit', 3);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_premium_image(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_premium_image(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.premium_image_quota(uuid) TO authenticated, service_role;