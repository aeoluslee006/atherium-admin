-- Split pharma-data-sync cron to stay within Alpha Vantage free-tier limits.
-- cron 1 (06:00 UTC, weekdays): earnings calendar + actual EPS
-- cron 2 (07:00 UTC, weekdays): company overview + live quotes

SELECT cron.unschedule('pharma-data-sync-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pharma-data-sync-daily');

SELECT cron.schedule(
  'pharma-sync-earnings',
  '0 6 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://hgsuzanclpnzlskttkok.supabase.co/functions/v1/pharma-data-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"phase":"calendar"}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'pharma-sync-overview',
  '0 7 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://hgsuzanclpnzlskttkok.supabase.co/functions/v1/pharma-data-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"phase":"overview"}'::jsonb
  ) AS request_id;
  $$
);
