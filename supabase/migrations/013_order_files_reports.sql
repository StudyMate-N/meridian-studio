-- 013_order_files_reports.sql
-- Adds optional metadata to order_files so the client workspace can render
-- versioned "submission packages" with AI-detection / originality scores.
--
-- The client portal reads these via select('*') and degrades gracefully when
-- they are null, so applying this migration is safe and backward-compatible.
--
--   version : groups a completed-work file with its AI/plagiarism reports
--             (e.g. 'v1', 'v2', 'Final'). Files sharing a version render as
--             one submission package.
--   score   : integer percentage shown as a badge on ai_report / plag_report
--             rows (e.g. 2 = "2% AI", 4 = "4% match").
--
-- The expert/admin upload flow can set kind = 'ai_report' | 'plag_report'
-- alongside the existing draft/final/revision/rubric/brief/other kinds.

-- New file kinds for the verification documents shown in a submission package.
-- (ALTER TYPE ... ADD VALUE must run outside a transaction; run these first.)
alter type file_kind add value if not exists 'ai_report';
alter type file_kind add value if not exists 'plag_report';

alter table public.order_files
  add column if not exists version text,
  add column if not exists score   integer;

comment on column public.order_files.version is
  'Submission group label (v1, v2, Final). Files sharing a version render as one package in the client workspace.';
comment on column public.order_files.score is
  'Integer percentage for ai_report / plag_report files (AI % or similarity %). Null for non-report files.';
