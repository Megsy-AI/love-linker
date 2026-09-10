CREATE POLICY "Users read their own skill files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'skills' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload their own skill files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'skills' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update their own skill files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'skills' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete their own skill files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'skills' AND (storage.foldername(name))[1] = auth.uid()::text);