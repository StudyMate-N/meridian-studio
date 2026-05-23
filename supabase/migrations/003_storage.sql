-- Order files bucket (private — access via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-files',
  'order-files',
  false,
  52428800,  -- 50 MB limit
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'text/plain'
  ]
);

-- Storage RLS
create policy "order_files_client_upload" on storage.objects for insert
  with check (
    bucket_id = 'order-files'
    and auth.role() = 'authenticated'
  );

create policy "order_files_owner_read" on storage.objects for select
  using (
    bucket_id = 'order-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "order_files_admin_all" on storage.objects for all
  using (
    bucket_id = 'order-files'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
