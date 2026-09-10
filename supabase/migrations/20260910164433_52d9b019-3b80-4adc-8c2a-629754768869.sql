REVOKE ALL ON FUNCTION public.take_service_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_service_key(text) TO service_role;