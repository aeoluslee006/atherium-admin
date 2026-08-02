-- Clean up the example placeholder rows if you ran the sample INSERT.
-- Supabase Dashboard → SQL Editor → Run:

delete from public.local_news
where url = 'https://기사URL'
   or (source = '출처명' and title ~ '^제목\s*\d+$');
