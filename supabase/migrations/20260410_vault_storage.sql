-- Document Vault: Supabase Storage bucket + RLS policies
-- Run this in the Supabase SQL editor.

-- 1. Create the storage bucket (private — no public access)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB per file
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- 2. RLS policies on storage.objects
--    File paths are: {user_id}/{category}/{filename}
--    We scope each policy to paths that start with the authenticated user's ID.

-- SELECT (download / list)
create policy "users can view own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- INSERT (upload)
create policy "users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- DELETE (remove)
create policy "users can delete own documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );
