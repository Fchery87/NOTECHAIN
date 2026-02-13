-- Storage Bucket Configuration for NoteChain
-- Run this SQL to set up storage buckets with RLS policies

-- Create bucket for encrypted PDF documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false);

-- Create bucket for encrypted attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false);

-- Create bucket for encrypted thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', false);

-- Enable RLS on storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Storage policies for PDFs bucket
CREATE POLICY "Users can upload own PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pdfs' AND
  auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view own PDFs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'pdfs' AND
  auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete own PDFs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'pdfs' AND
  auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
);

-- Storage policies for attachments bucket
CREATE POLICY "Users can upload own attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view own attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'attachments' AND
  auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'attachments' AND
  auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
);

-- Storage policies for thumbnails bucket
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view own thumbnails"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'thumbnails' AND
  auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
);
