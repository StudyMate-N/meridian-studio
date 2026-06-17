-- 032_repair_blob_titles.sql — some orders have the ENTIRE brief (title +
-- requirements + flattened rubric) stuffed into `orders.title`, which makes the
-- expert/My-Work cards render a wall of text and balloon. Repair the data:
-- move the full blob into `notes` (only if notes is empty, so nothing is lost),
-- and replace `title` with a short, clean lead. Only touches blob-pattern titles
-- (>120 chars OR containing a "Requirements:"/"Rubric:" marker); clean titles
-- are left exactly as-is.
update public.orders
set
  notes = case when coalesce(btrim(notes), '') = '' then title else notes end,
  title = btrim(regexp_replace(
            left(
              btrim(regexp_replace(
                regexp_replace(title, '^\s*Title:\s*', '', 'i'),     -- drop a leading "Title:"
                '(Requirements?\s*:|Rubric\s*:).*$', '', 'i'         -- cut at the first brief marker
              )),
              90                                                      -- cap length
            ),
            '\s+\S*$', ''                                            -- trim a trailing partial word
          ))
where title is not null
  and (char_length(title) > 120 or title ~* '(Requirements?\s*:|Rubric\s*:)');
