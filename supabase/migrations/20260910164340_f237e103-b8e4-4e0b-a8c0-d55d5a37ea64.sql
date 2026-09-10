CREATE TABLE public.service_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  key_cipher text NOT NULL,
  key_iv text NOT NULL,
  key_hint text,
  label text,
  status text NOT NULL DEFAULT 'active',
  fail_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  last_error text,
  last_used_at timestamptz,
  banned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_keys_provider_status ON public.service_keys (provider, status, last_used_at NULLS FIRST);
GRANT ALL ON public.service_keys TO service_role;
ALTER TABLE public.service_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_keys admin read" ON public.service_keys FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.admin_bot_state (
  chat_id text PRIMARY KEY,
  awaiting_provider text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_bot_state TO service_role;
ALTER TABLE public.admin_bot_state ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  path text NOT NULL,
  referrer text,
  country text,
  user_agent text,
  user_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_ms integer
);
CREATE INDEX idx_page_views_started_at ON public.page_views (started_at DESC);
CREATE INDEX idx_page_views_session ON public.page_views (session_id);
GRANT INSERT, UPDATE ON public.page_views TO anon, authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_views insert any" ON public.page_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "page_views close own row" ON public.page_views FOR UPDATE TO anon, authenticated USING (started_at > now() - interval '1 day') WITH CHECK (true);
CREATE POLICY "page_views admin read" ON public.page_views FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_service_keys_updated_at BEFORE UPDATE ON public.service_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.take_service_key(p_provider text)
RETURNS TABLE(o_id uuid, o_cipher text, o_iv text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  SELECT id, key_cipher, key_iv INTO r
  FROM public.service_keys
  WHERE provider = p_provider AND status = 'active'
  ORDER BY last_used_at ASC NULLS FIRST, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  IF r.id IS NULL THEN RETURN; END IF;
  UPDATE public.service_keys SET last_used_at = now() WHERE id = r.id;
  o_id := r.id; o_cipher := r.key_cipher; o_iv := r.key_iv;
  RETURN NEXT;
END;
$$;