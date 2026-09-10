CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.check_api_rate_limit_core(
  _user_id uuid,
  _endpoint text,
  _request_limit integer,
  _window_seconds integer
)
RETURNS TABLE(allowed boolean, retry_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  now_at timestamptz := clock_timestamp();
  current_window timestamptz;
  current_count integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF coalesce(length(trim(_endpoint)), 0) = 0 OR _request_limit < 1 OR _window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid rate limit arguments';
  END IF;

  INSERT INTO public.edge_rate_limits (identifier, endpoint, window_start, count, updated_at)
  VALUES (_user_id::text, left(_endpoint, 100), now_at, 1, now_at)
  ON CONFLICT (identifier, endpoint)
  DO UPDATE SET
    count = CASE WHEN public.edge_rate_limits.window_start + make_interval(secs => _window_seconds) <= now_at THEN 1 ELSE public.edge_rate_limits.count + 1 END,
    window_start = CASE WHEN public.edge_rate_limits.window_start + make_interval(secs => _window_seconds) <= now_at THEN now_at ELSE public.edge_rate_limits.window_start END,
    updated_at = now_at
  RETURNING edge_rate_limits.window_start, edge_rate_limits.count
  INTO current_window, current_count;

  allowed := current_count <= _request_limit;
  retry_after := CASE WHEN allowed THEN 0 ELSE greatest(1, ceil(extract(epoch FROM (current_window + make_interval(secs => _window_seconds) - now_at)))::integer) END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION private.check_api_rate_limit_core(uuid, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.check_api_rate_limit_core(uuid, text, integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  _endpoint text,
  _request_limit integer,
  _window_seconds integer
)
RETURNS TABLE(allowed boolean, retry_after integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT * FROM private.check_api_rate_limit_core(auth.uid(), _endpoint, _request_limit, _window_seconds)
$$;

REVOKE ALL ON FUNCTION public.check_api_rate_limit(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(text, integer, integer) TO authenticated, service_role;