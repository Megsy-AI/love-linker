-- Access rules for the two storage buckets
DROP POLICY IF EXISTS "Users read own files in public bucket" ON storage.objects;
CREATE POLICY "Users read own files in public bucket" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'public' AND (owner = auth.uid() OR (storage.foldername(name))[1] = auth.uid()::text));

DROP POLICY IF EXISTS "Users upload own files in public bucket" ON storage.objects;
CREATE POLICY "Users upload own files in public bucket" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own files in public bucket" ON storage.objects;
CREATE POLICY "Users update own files in public bucket" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'public' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own files in public bucket" ON storage.objects;
CREATE POLICY "Users delete own files in public bucket" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins manage email assets" ON storage.objects;
CREATE POLICY "Admins manage email assets" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'));