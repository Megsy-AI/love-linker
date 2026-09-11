DROP FUNCTION IF EXISTS public.premium_image_quota(uuid);

CREATE OR REPLACE FUNCTION public.premium_image_quota()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_paid boolean := false;
  v_used integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('unlimited', false, 'used', 0, 'limit', 3);
  END IF;
  BEGIN
    SELECT public.has_paid_plan(v_uid) INTO v_paid;
  EXCEPTION WHEN others THEN
    v_paid := false;
  END;
  IF v_paid THEN
    RETURN jsonb_build_object('unlimited', true, 'used', 0, 'limit', -1);
  END IF;
  SELECT COALESCE(used, 0) INTO v_used FROM public.premium_image_usage
  WHERE user_id = v_uid AND day = (now() AT TIME ZONE 'utc')::date;
  RETURN jsonb_build_object('unlimited', false, 'used', COALESCE(v_used, 0), 'limit', 3);
END;
$$;

REVOKE ALL ON FUNCTION public.premium_image_quota() FROM anon;
GRANT EXECUTE ON FUNCTION public.premium_image_quota() TO authenticated, service_role;