CREATE OR REPLACE FUNCTION public.fulfill_kashier_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_id uuid;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    IF NEW.credits > 0 THEN
      PERFORM public.add_credits(
        NEW.user_id,
        NEW.credits,
        'kashier:payment:' || NEW.order_id
      );
    END IF;

    IF NEW.plan IS NOT NULL AND btrim(NEW.plan) <> '' THEN
      UPDATE public.profiles
      SET plan = NEW.plan, updated_at = now()
      WHERE id = NEW.user_id;

      SELECT id INTO subscription_id
      FROM public.subscriptions
      WHERE user_id = NEW.user_id
      ORDER BY updated_at DESC
      LIMIT 1;

      IF subscription_id IS NULL THEN
        INSERT INTO public.subscriptions (
          user_id,
          plan,
          status,
          currency,
          amount_cents,
          current_period_end,
          updated_at
        ) VALUES (
          NEW.user_id,
          NEW.plan,
          'active',
          NEW.currency,
          round(NEW.amount * 100)::integer,
          now() + interval '30 days',
          now()
        );
      ELSE
        UPDATE public.subscriptions
        SET plan = NEW.plan,
            status = 'active',
            currency = NEW.currency,
            amount_cents = round(NEW.amount * 100)::integer,
            current_period_end = now() + interval '30 days',
            updated_at = now()
        WHERE id = subscription_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fulfill_kashier_order_on_paid ON public.kashier_orders;
CREATE TRIGGER fulfill_kashier_order_on_paid
AFTER UPDATE OF status ON public.kashier_orders
FOR EACH ROW
WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
EXECUTE FUNCTION public.fulfill_kashier_order();