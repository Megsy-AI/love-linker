REVOKE ALL ON FUNCTION public.fulfill_kashier_order() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_kashier_order() TO service_role;