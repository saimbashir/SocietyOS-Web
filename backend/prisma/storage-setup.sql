-- Run after Prisma migrations in Supabase SQL editor. Private bucket; API proxies downloads.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('societyos-private','societyos-private',false,5242880,ARRAY['application/pdf','image/png','image/jpeg']) ON CONFLICT(id) DO UPDATE SET public=false;
-- Do not add public storage policies. Only the backend service role accesses objects.
