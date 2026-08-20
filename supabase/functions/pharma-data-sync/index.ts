// ============================================================
// Supabase Edge Function: pharma-data-sync
// Atherium Holdings — atherium.cosmonova.io
//
// 배포: Supabase Dashboard → Edge Functions → Deploy
// 스케줄: cron "0 6 * * 1-5" (평일 오전 6시 ET)
//
// 환경변수 (Supabase Dashboard → Edge Functions → Secrets):
//   SUPABASE_URL          ← 자동 주입
//   SUPABASE_SERVICE_KEY  ← 자동 주입 (service_role)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── 트래킹 종목 목록 ──────────────────────────────────────
const TICKERS = [
  "VRTX","GILD","AMGN","REGN","MRNA","BNTX",
  "EXEL","AXSM","IONS","MDGL","SMMT","LLY","PFE"
];

// ── Yahoo Finance: 어닝콜 날짜 + EPS 데이터 ──────────────
async function syncEarningsFromYahoo() {
  let upserted = 0;
  const errors: string[] = [];

  for (const ticker of TICKERS) {
    try {
      // Yahoo Finance v11 (비공식이지만 가장 안정적)
      const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${ticker}` +
        `?modules=calendarEvents,earningsTrend,defaultKeyStatistics`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AthedriumBot/1.0)",
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        errors.push(`${ticker}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const result = data?.quoteSummary?.result?.[0];
      if (!result) continue;

      // 다음 어닝콜 날짜
      const nextEarnings = result?.calendarEvents?.earnings?.earningsDate?.[0]?.raw;
      // EPS 예상치 (현재 분기)
      const epsTrend = result?.earningsTrend?.trend?.[0];
      const epsEstimate = epsTrend?.earningsEstimate?.avg?.raw ?? null;
      const revEstimate = epsTrend?.revenueEstimate?.avg?.raw ?? null;
      const period = epsTrend?.period ?? null; // e.g. "0q" = current quarter

      if (!nextEarnings) continue;

      const reportDate = new Date(nextEarnings * 1000).toISOString().split("T")[0];

      // 분기 라벨 계산
      const d = new Date(nextEarnings * 1000);
      const q = Math.ceil((d.getMonth() + 1) / 3);
      const fiscalQuarter = `Q${q} ${d.getFullYear()}`;

      const { error } = await supabase
        .from("pharma_earnings")
        .upsert({
          ticker,
          company_name: ticker, // 이름은 별도 매핑 테이블로 추후 개선
          report_date: reportDate,
          fiscal_quarter: fiscalQuarter,
          report_time: "tbd",
          eps_estimate: epsEstimate,
          rev_estimate: revEstimate ? revEstimate / 1e9 : null, // → 십억달러
          status: "upcoming",
          is_manual: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "ticker,fiscal_quarter",
          ignoreDuplicates: false, // 예상치 업데이트 허용
        });

      if (error) errors.push(`${ticker} upsert: ${error.message}`);
      else upserted++;

      // Rate limit 방지
      await new Promise(r => setTimeout(r, 300));

    } catch (e) {
      errors.push(`${ticker}: ${e.message}`);
    }
  }

  return { upserted, errors };
}

// ── Yahoo Finance: 실제 EPS 결과 업데이트 ────────────────
async function syncActualEarnings() {
  let updated = 0;
  const errors: string[] = [];

  for (const ticker of TICKERS) {
    try {
      const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${ticker}` +
        `?modules=earningsHistory`;

      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const history = data?.quoteSummary?.result?.[0]?.earningsHistory?.history ?? [];

      for (const h of history) {
        const epsActual   = h?.epsActual?.raw ?? null;
        const epsEstimate = h?.epsEstimate?.raw ?? null;
        const epsDiff     = h?.epsDifference?.raw ?? null;
        const surprisePct = h?.surprisePercent?.raw ?? null;
        const dateRaw     = h?.quarter?.raw ?? null;
        if (!dateRaw || epsActual === null) continue;

        const d = new Date(dateRaw * 1000);
        const q = Math.ceil((d.getMonth() + 1) / 3);
        const fiscalQuarter = `Q${q} ${d.getFullYear()}`;

        const { error } = await supabase
          .from("pharma_earnings")
          .update({
            eps_actual: epsActual,
            eps_estimate: epsEstimate,
            eps_beat: epsDiff !== null ? epsDiff >= 0 : null,
            eps_surprise_pct: surprisePct,
            status: "reported",
            updated_at: new Date().toISOString(),
          })
          .eq("ticker", ticker)
          .eq("fiscal_quarter", fiscalQuarter);

        if (!error) updated++;
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      errors.push(`${ticker} actual: ${e.message}`);
    }
  }

  return { updated, errors };
}

// ── ClinicalTrials.gov API: 임상 완료 예정일 ─────────────
async function syncClinicalTrials() {
  let upserted = 0;
  const errors: string[] = [];

  const companies = [
    { name: "Vertex Pharmaceuticals", ticker: "VRTX" },
    { name: "Moderna",                ticker: "MRNA" },
    { name: "Gilead Sciences",        ticker: "GILD" },
    { name: "Amgen",                  ticker: "AMGN" },
    { name: "Regeneron",              ticker: "REGN" },
    { name: "Eli Lilly",              ticker: "LLY"  },
    { name: "Pfizer",                 ticker: "PFE"  },
    { name: "Summit Therapeutics",    ticker: "SMMT" },
    { name: "Exelixis",               ticker: "EXEL" },
  ];

  for (const co of companies) {
    try {
      // Phase 3 완료 예정 임상만 가져오기
      const url = `https://clinicaltrials.gov/api/v2/studies?` +
        `query.term=${encodeURIComponent(co.name)}` +
        `&filter.advanced=AREA[Phase]PHASE3` +
        `&filter.advanced=AREA[OverallStatus]RECRUITING OR ACTIVE_NOT_RECRUITING` +
        `&fields=NCTId,BriefTitle,PrimaryCompletionDate,LeadSponsorName` +
        `&pageSize=5&sort=PrimaryCompletionDate:asc`;

      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const studies = data?.studies ?? [];

      for (const s of studies) {
        const proto = s?.protocolSection;
        const nctId = proto?.identificationModule?.nctId;
        const title = proto?.identificationModule?.briefTitle;
        const completionDate = proto?.statusModule?.primaryCompletionDateStruct?.date;

        if (!nctId || !completionDate) continue;

        // 완료 예정이 6개월 이내인 것만 이벤트로 등록
        const targetDate = new Date(completionDate);
        const monthsAway = (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAway < 0 || monthsAway > 18) continue;

        const { error } = await supabase
          .from("pharma_events")
          .upsert({
            ticker: co.ticker,
            company_name: co.name,
            event_date: completionDate,
            event_type: "TRIAL",
            label: `Phase 3 완료 예정: ${title?.substring(0, 60)}...`,
            indication: title,
            status: "trial",
            source_url: `https://clinicaltrials.gov/study/${nctId}`,
            is_manual: false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "ticker,event_date,label",
            ignoreDuplicates: true,
          });

        if (!error) upserted++;
      }

      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      errors.push(`${co.ticker} trials: ${e.message}`);
    }
  }

  return { upserted, errors };
}

// ── 메인 핸들러 ───────────────────────────────────────────
Deno.serve(async (req) => {
  // cron 또는 수동 호출 모두 허용
  const results = {
    earnings_upcoming: { upserted: 0, errors: [] as string[] },
    earnings_actual:   { updated: 0,  errors: [] as string[] },
    clinical_trials:   { upserted: 0, errors: [] as string[] },
  };

  console.log("[pharma-data-sync] 시작:", new Date().toISOString());

  // 1) 어닝콜 예상치
  const earnRes = await syncEarningsFromYahoo();
  results.earnings_upcoming = earnRes;
  await supabase.from("pharma_sync_log").insert({
    source: "yahoo_upcoming",
    records_upserted: earnRes.upserted,
    status: earnRes.errors.length === 0 ? "ok" : "partial",
    error_msg: earnRes.errors.join("; ") || null,
  });

  // 2) 실제 EPS 결과
  const actualRes = await syncActualEarnings();
  results.earnings_actual = actualRes;
  await supabase.from("pharma_sync_log").insert({
    source: "yahoo_actual",
    records_upserted: actualRes.updated,
    status: actualRes.errors.length === 0 ? "ok" : "partial",
    error_msg: actualRes.errors.join("; ") || null,
  });

  // 3) 임상 데이터
  const trialRes = await syncClinicalTrials();
  results.clinical_trials = trialRes;
  await supabase.from("pharma_sync_log").insert({
    source: "clinicaltrials",
    records_upserted: trialRes.upserted,
    status: trialRes.errors.length === 0 ? "ok" : "partial",
    error_msg: trialRes.errors.join("; ") || null,
  });

  console.log("[pharma-data-sync] 완료:", JSON.stringify(results));

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
