-- ============================================================
-- PHARMA TRACKER MIGRATION
-- Atherium Holdings / atherium.cosmonova.io
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. pharma_events
--    FDA PDUFA 날짜, 임상 데이터 발표, IR 행사 등
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharma_events (
  id              SERIAL PRIMARY KEY,
  ticker          TEXT        NOT NULL,                -- e.g. 'VRTX'
  company_name    TEXT        NOT NULL,                -- e.g. 'Vertex Pharmaceuticals'
  event_date      DATE        NOT NULL,
  event_type      TEXT        NOT NULL
    CHECK (event_type IN ('FDA','TRIAL','IR','OTHER')),
  label           TEXT        NOT NULL,                -- 캘린더 표시 제목
  drug_name       TEXT,                               -- e.g. 'Povetacicept'
  indication      TEXT,                               -- 적응증
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('approved','pending','trial','event','upcoming','failed')),
  source_url      TEXT,                               -- 데이터 출처 URL
  notes           TEXT,                               -- 내부 메모
  is_manual       BOOLEAN     NOT NULL DEFAULT false, -- 수동 입력 여부
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. pharma_earnings
--    어닝콜 일정 + EPS 예상/실제/beat여부
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharma_earnings (
  id              SERIAL PRIMARY KEY,
  ticker          TEXT        NOT NULL,
  company_name    TEXT        NOT NULL,
  report_date     DATE        NOT NULL,
  fiscal_quarter  TEXT        NOT NULL,               -- e.g. 'Q3 2026'
  report_time     TEXT
    CHECK (report_time IN ('pre-market','after-close','tbd')),

  -- 예상치 (애널리스트 컨센서스)
  eps_estimate    NUMERIC(10,4),
  rev_estimate    NUMERIC(20,2),                      -- 단위: USD

  -- 실제 결과 (발표 후 업데이트)
  eps_actual      NUMERIC(10,4),
  rev_actual      NUMERIC(20,2),

  -- Beat/Miss
  eps_beat        BOOLEAN,                            -- true=beat, false=miss, null=미발표
  rev_beat        BOOLEAN,
  eps_surprise_pct NUMERIC(6,2),                     -- (actual-estimate)/estimate*100

  -- 전년 동기 비교
  eps_yoy_pct     NUMERIC(6,2),                      -- YoY EPS 변화율 %

  -- 상태
  status          TEXT        NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','reported')),

  source_url      TEXT,
  is_manual       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (ticker, fiscal_quarter)
);

-- ────────────────────────────────────────────────────────────
-- 3. pharma_notes
--    슬라이드 패널 Sticky Notes 영구 저장
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharma_notes (
  id              SERIAL PRIMARY KEY,
  content         TEXT        NOT NULL,
  color           TEXT        NOT NULL DEFAULT '#fef9c3',
  pos_x           INTEGER     NOT NULL DEFAULT 20,    -- 드래그 위치 X
  pos_y           INTEGER     NOT NULL DEFAULT 20,    -- 드래그 위치 Y
  ticker_tag      TEXT,                               -- 연관 종목 태그 (optional)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 4. pharma_sync_log
--    Edge Function 실행 이력
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharma_sync_log (
  id              SERIAL PRIMARY KEY,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          TEXT        NOT NULL,               -- 'yahoo','clinicaltrials','edgar','manual'
  records_upserted INTEGER    NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok','error','partial')),
  error_msg       TEXT
);

-- ────────────────────────────────────────────────────────────
-- 5. updated_at 자동 갱신 트리거
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pharma_events_updated_at
  BEFORE UPDATE ON pharma_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pharma_earnings_updated_at
  BEFORE UPDATE ON pharma_earnings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pharma_notes_updated_at
  BEFORE UPDATE ON pharma_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 6. RLS 정책
--    super_admin(JUN LI)만 접근 — Atherium 전용 테이블
-- ────────────────────────────────────────────────────────────
ALTER TABLE pharma_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharma_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharma_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharma_sync_log ENABLE ROW LEVEL SECURITY;

-- super_admin 헬퍼 (기존 패턴 재사용)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_id = auth.uid()
    AND role = 'super_admin'
  );
$$;

-- pharma_events: super_admin 전체 허용
CREATE POLICY "super_admin_all" ON pharma_events
  FOR ALL USING (is_super_admin());

-- pharma_earnings: super_admin 전체 허용
CREATE POLICY "super_admin_all" ON pharma_earnings
  FOR ALL USING (is_super_admin());

-- pharma_notes: super_admin 전체 허용
CREATE POLICY "super_admin_all" ON pharma_notes
  FOR ALL USING (is_super_admin());

-- pharma_sync_log: super_admin 읽기 + Edge Function service_role 쓰기
CREATE POLICY "super_admin_read" ON pharma_sync_log
  FOR SELECT USING (is_super_admin());

-- ────────────────────────────────────────────────────────────
-- 7. 인덱스
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_pharma_events_date   ON pharma_events(event_date);
CREATE INDEX idx_pharma_events_ticker ON pharma_events(ticker);
CREATE INDEX idx_pharma_earnings_date ON pharma_earnings(report_date);
CREATE INDEX idx_pharma_earnings_ticker ON pharma_earnings(ticker);
CREATE INDEX idx_pharma_notes_ticker  ON pharma_notes(ticker_tag);

-- ────────────────────────────────────────────────────────────
-- 8. 초기 데이터 시드
--    현재까지 수집된 실제 데이터
-- ────────────────────────────────────────────────────────────

-- pharma_events 시드
INSERT INTO pharma_events
  (ticker, company_name, event_date, event_type, label, drug_name, indication, status, source_url, is_manual)
VALUES
  -- ✅ 승인 완료
  ('AXSM','Axsome Therapeutics','2026-04-30','FDA','AUVELITY FDA 승인','AXS-05 (dextromethorphan+bupropion)','알츠하이머 초조 증상','approved','https://www.fda.gov',true),
  ('MRNA','Moderna','2026-08-05','FDA','mFLUSIVA (mRNA-1010) FDA 승인','mRNA-1010','독감 백신 성인 50세+','approved','https://www.fda.gov',true),

  -- ⏳ PDUFA 대기
  ('GILD','Gilead Sciences','2026-08-27','FDA','BIC/LEN HIV 단일정 PDUFA','Bictegravir+Lenacapavir','HIV 성인 (바이러스 억제)','pending','https://www.fda.gov',true),
  ('REGN','Regeneron','2026-08-31','FDA','Garetosmab PDUFA','Garetosmab','진행성 골화성 섬유이형성증 (FOP)','pending','https://investor.regeneron.com',true),
  ('REGN','Regeneron','2026-11-01','FDA','Cemdisiran PDUFA (Priority Review)','Cemdisiran (siRNA)','전신성 중증 근무력증 (gMG)','pending','https://investor.regeneron.com',true),
  ('IONS','Ionis Pharmaceuticals','2026-09-22','FDA','Zilganersen PDUFA ⚡Priority','Zilganersen','알렉산더병 (희귀 신경질환)','pending','https://www.ionis.com',true),
  ('SMMT','Summit Therapeutics','2026-11-14','FDA','Ivonescimab BLA PDUFA','Ivonescimab+Chemo','EGFR변이 NSCLC (TKI 치료 후)','pending','https://www.smmttx.com',true),
  ('VRTX','Vertex Pharmaceuticals','2026-11-30','FDA','Povetacicept BLA PDUFA','Povetacicept','IgA 신증 (IgAN)','pending','https://investors.vrtx.com',true),
  ('EXEL','Exelixis','2026-12-03','FDA','Zanzalintinib NDA PDUFA','Zanzalintinib+Atezolizumab','전이성 대장암 (2차 이상)','pending','https://ir.exelixis.com',true),

  -- 🧪 임상 데이터
  ('SMMT','Summit Therapeutics','2026-10-31','TRIAL','HARMONi-3 PFS 중간 데이터','Ivonescimab+Chemo vs Keytruda+Chemo','1차 전이성 NSCLC','trial',NULL,true),
  ('AMGN','Amgen','2026-09-30','TRIAL','Dazodalibep Phase3 결과 (H2 2026)','Dazodalibep','쇼그렌 증후군','trial',NULL,true),
  ('VRTX','Vertex Pharmaceuticals','2026-12-31','TRIAL','Suzetrigine DPN Phase3 등록 완료','Suzetrigine (VX-548)','당뇨병성 말초신경병증','trial',NULL,true),
  ('AXSM','Axsome Therapeutics','2026-09-30','FDA','AXS-12 NDA 제출','AXS-12 (reboxetine)','기면증 카탈렙시','upcoming',NULL,true),

  -- 📢 IR 행사
  ('MRNA','Moderna','2026-11-12','IR','Moderna Analyst Day','전체 파이프라인','2027 로드맵','event',NULL,true),
  ('LLY','Eli Lilly','2026-12-07','IR','일라이 릴리 투자자의 날','Retatrutide 외','비만 중장기 전략','event',NULL,true);

-- pharma_earnings 시드 (Q2 실제 결과 + Q3 예상)
INSERT INTO pharma_earnings
  (ticker, company_name, report_date, fiscal_quarter, report_time,
   eps_estimate, eps_actual, eps_beat, eps_surprise_pct, eps_yoy_pct,
   rev_estimate, rev_actual, rev_beat, status, is_manual)
VALUES
  -- ✅ Q2 2026 실제 결과
  ('AMGN','Amgen',            '2026-07-30','Q2 2026','after-close',  5.98,  6.33, true,  5.9,   6.0,  8200,  8505, true,  'reported', true),
  ('GILD','Gilead Sciences',  '2026-07-24','Q2 2026','after-close',  1.72,  1.96, true,  14.0,  12.0, 6900,  7180, true,  'reported', true),
  ('REGN','Regeneron',        '2026-07-30','Q2 2026','after-close',  10.34, 14.29,true,  38.2,  10.9, 3900,  4300, true,  'reported', true),
  ('VRTX','Vertex Pharma',    '2026-08-03','Q2 2026','after-close',  4.63,  4.73, true,  2.2,   4.7,  3100,  3190, true,  'reported', true),
  ('MRNA','Moderna',          '2026-07-31','Q2 2026','after-close', -2.07, -1.97, true,  4.8,   7.3,  1400,  1380, false, 'reported', true),
  ('LLY', 'Eli Lilly',        '2026-04-30','Q1 2026','pre-market',   3.46,  3.34, false, -3.5,  45.0, 12700, 12730,true,  'reported', true),
  ('PFE', 'Pfizer',           '2026-08-04','Q2 2026','pre-market',   0.68,  0.77, true,  13.2,  -1.3, 13500, 13800,true,  'reported', true),

  -- 📅 Q3 2026 예상 (미발표)
  ('GILD','Gilead Sciences',  '2026-10-22','Q3 2026','after-close',  2.11,  NULL, NULL,  NULL,  NULL, 7100,  NULL, NULL,  'upcoming', true),
  ('REGN','Regeneron',        '2026-10-27','Q3 2026','after-close',  15.41, NULL, NULL,  NULL,  NULL, 4200,  NULL, NULL,  'upcoming', true),
  ('AMGN','Amgen',            '2026-10-30','Q3 2026','after-close',  6.10,  NULL, NULL,  NULL,  NULL, 8400,  NULL, NULL,  'upcoming', true),
  ('LLY', 'Eli Lilly',        '2026-10-30','Q3 2026','pre-market',   5.20,  NULL, NULL,  NULL,  NULL, 16000, NULL, NULL,  'upcoming', true),
  ('VRTX','Vertex Pharma',    '2026-11-02','Q3 2026','after-close',  4.80,  NULL, NULL,  NULL,  NULL, 3200,  NULL, NULL,  'upcoming', true),
  ('PFE', 'Pfizer',           '2026-11-03','Q3 2026','pre-market',   0.85,  NULL, NULL,  NULL,  NULL, 13600, NULL, NULL,  'upcoming', true),
  ('MRNA','Moderna',          '2026-11-05','Q3 2026','after-close',  -1.36, NULL, NULL,  NULL,  NULL, 2100,  NULL, NULL,  'upcoming', true);

-- pharma_notes 시드 (기본 메모 3개)
INSERT INTO pharma_notes (content, color, pos_x, pos_y, ticker_tag)
VALUES
  ('SMMT 11/14 PDUFA — OS 통계적 유의성 필요! 바이너리 이벤트', '#fef9c3', 20, 20, 'SMMT'),
  ('VRTX Povetacicept 11/30 — 신장병 첫 상업제품, BLA 6/1 수리', '#dcfce7', 230, 20, 'VRTX'),
  ('GILD BIC/LEN 8/27 — HIV 최소 단일정, BofA Buy $162 목표가', '#dbeafe', 20, 140, 'GILD');

-- ────────────────────────────────────────────────────────────
-- 확인 쿼리
-- ────────────────────────────────────────────────────────────
SELECT 'pharma_events'   AS table_name, COUNT(*) FROM pharma_events
UNION ALL
SELECT 'pharma_earnings',               COUNT(*) FROM pharma_earnings
UNION ALL
SELECT 'pharma_notes',                  COUNT(*) FROM pharma_notes;
