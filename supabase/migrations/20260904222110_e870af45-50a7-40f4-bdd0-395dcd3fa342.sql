CREATE OR REPLACE FUNCTION private.activate_paid_kashier_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    UPDATE public.profiles
       SET credits = COALESCE(credits, 0) + COALESCE(NEW.credits, 0),
           plan = COALESCE(NEW.plan, plan),
           updated_at = now()
     WHERE id = NEW.user_id
     RETURNING credits INTO v_new_balance;

    IF v_new_balance IS NULL THEN
      RAISE EXCEPTION 'User profile not found: %', NEW.user_id;
    END IF;

    IF COALESCE(NEW.credits, 0) > 0 THEN
      INSERT INTO public.credit_transactions (user_id, amount, action_type, description)
      VALUES (
        NEW.user_id,
        NEW.credits,
        'subscription_purchase',
        'Kashier purchase: ' || COALESCE(NEW.plan, 'credits') || ' (order ' || NEW.order_id || ')'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.activate_paid_kashier_order() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.activate_paid_kashier_order() TO service_role;

DROP TRIGGER IF EXISTS activate_paid_kashier_order ON public.kashier_orders;
CREATE TRIGGER activate_paid_kashier_order
AFTER UPDATE OF status ON public.kashier_orders
FOR EACH ROW
EXECUTE FUNCTION private.activate_paid_kashier_order();