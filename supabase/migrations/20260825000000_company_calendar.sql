-- Company / office calendar (Outlook-style internal events)
CREATE TABLE IF NOT EXISTS company_calendar_events (
  id           SERIAL PRIMARY KEY,
  title        TEXT        NOT NULL,
  description  TEXT,
  event_date   DATE        NOT NULL,
  start_time   TIME,
  end_time     TIME,
  all_day      BOOLEAN     NOT NULL DEFAULT false,
  location     TEXT,
  attendees    TEXT,
  category     TEXT        NOT NULL DEFAULT 'MEETING'
    CHECK (category IN ('MEETING','DEADLINE','REMINDER','OUT_OF_OFFICE','OTHER')),
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_company_calendar_updated_at ON company_calendar_events;
CREATE TRIGGER trg_company_calendar_updated_at
  BEFORE UPDATE ON company_calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE company_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all" ON company_calendar_events;
CREATE POLICY "super_admin_all" ON company_calendar_events
  FOR ALL USING (is_super_admin());

CREATE INDEX IF NOT EXISTS idx_company_calendar_date ON company_calendar_events(event_date);
