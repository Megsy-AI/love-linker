CREATE TABLE IF NOT EXISTS public.dodo_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  credits integer NOT NULL DEFAULT 0,
  plan text,
  status text NOT NULL DEFAULT 'pending',
  dodo_payment_id text,
  dodo_subscription_id text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dodo_orders TO authenticated;
GRANT ALL ON public.dodo_orders TO service_role;

ALTER TABLE public.dodo_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dodo orders"
ON public.dodo_orders FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS dodo_orders_user_idx ON public.dodo_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dodo_orders_payment_idx ON public.dodo_orders(dodo_payment_id);

CREATE OR REPLACE FUNCTION public.update_dodo_orders_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_dodo_orders_updated_at ON public.dodo_orders;
CREATE TRIGGER trg_dodo_orders_updated_at BEFORE UPDATE ON public.dodo_orders
FOR EACH ROW EXECUTE FUNCTION public.update_dodo_orders_updated_at();