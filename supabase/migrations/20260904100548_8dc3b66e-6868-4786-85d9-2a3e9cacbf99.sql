-- Telegram storage media: missing columns + auto timestamp
ALTER TABLE public.telegram_media
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer,
  ADD COLUMN IF NOT EXISTS duration integer,
  ADD COLUMN IF NOT EXISTS thumbnail_file_id text,
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'telegram';

CREATE INDEX IF NOT EXISTS telegram_media_user_kind_idx ON public.telegram_media (user_id, kind);
CREATE INDEX IF NOT EXISTS telegram_media_file_unique_idx ON public.telegram_media (file_unique_id);

CREATE OR REPLACE FUNCTION public.update_telegram_media_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

DROP TRIGGER IF EXISTS trg_telegram_media_updated_at ON public.telegram_media;
CREATE TRIGGER trg_telegram_media_updated_at BEFORE UPDATE ON public.telegram_media
FOR EACH ROW EXECUTE FUNCTION public.update_telegram_media_updated_at();