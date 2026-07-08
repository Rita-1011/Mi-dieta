/*
# Add plan_documents table and plan-documents Storage bucket

## Purpose
Every active nutrition plan now has exactly one associated metadata record in
plan_documents (one row per user, enforced by primary key on user_id).
Tracks how the plan was imported (pdf, image, or text).
For PDF and image imports the original file is stored in the plan-documents
Storage bucket; text imports leave storage_path NULL.

## New tables
1. plan_documents
   - user_id      uuid PRIMARY KEY – FK to auth.users, enforces one record per user
   - file_name    text nullable – original filename; NULL for text imports
   - mime_type    text nullable – MIME type of the uploaded file; NULL for text imports
   - storage_path text nullable – Storage object path; NULL for text imports
   - import_source text NOT NULL CHECK (pdf | image | text) – how the plan was imported
   - created_at   timestamptz – row creation timestamp

## Storage
- Bucket: plan-documents (private)
- RLS on storage.objects: authenticated users may only access objects whose
  first path segment matches their own auth.uid()

## Security
- RLS enabled on plan_documents
- Four separate policies (SELECT / INSERT / UPDATE / DELETE) scoped to
  authenticated with auth.uid() = user_id ownership check

## Notes
1. user_id is the PRIMARY KEY – the table physically holds at most one row per user,
   which mirrors the application constraint of one active plan per user.
2. ON DELETE CASCADE on user_id means the record is automatically removed when the
   Supabase auth user is deleted.
3. Storage policies use (storage.foldername(name))[1] to check the first path segment,
   which the application sets to the user's UUID.
*/

-- ─── Storage bucket ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('plan-documents', 'plan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ─── Storage RLS policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "plan_docs_storage_select" ON storage.objects;
CREATE POLICY "plan_docs_storage_select" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'plan-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "plan_docs_storage_insert" ON storage.objects;
CREATE POLICY "plan_docs_storage_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'plan-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "plan_docs_storage_update" ON storage.objects;
CREATE POLICY "plan_docs_storage_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'plan-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "plan_docs_storage_delete" ON storage.objects;
CREATE POLICY "plan_docs_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'plan-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── plan_documents table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_documents (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     text,
  mime_type     text,
  storage_path  text,
  import_source text NOT NULL CHECK (import_source IN ('pdf', 'image', 'text')),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE plan_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_documents_select" ON plan_documents;
CREATE POLICY "plan_documents_select" ON plan_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "plan_documents_insert" ON plan_documents;
CREATE POLICY "plan_documents_insert" ON plan_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plan_documents_update" ON plan_documents;
CREATE POLICY "plan_documents_update" ON plan_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plan_documents_delete" ON plan_documents;
CREATE POLICY "plan_documents_delete" ON plan_documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
