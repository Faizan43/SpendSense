-- Private storage for receipt images.
--
-- Objects are keyed `{user_id}/{receipt_id}/{filename}`, and the policies below
-- gate on that first path segment, so one user can never read another's
-- receipt even with a guessed object name. The app hands out short-lived signed
-- URLs; nothing here is ever public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists receipts_read_own on storage.objects;
drop policy if exists receipts_insert_own on storage.objects;
drop policy if exists receipts_update_own on storage.objects;
drop policy if exists receipts_delete_own on storage.objects;

create policy receipts_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy receipts_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy receipts_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy receipts_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
