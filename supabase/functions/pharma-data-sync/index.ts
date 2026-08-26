// ============================================================
// Supabase Edge Function: pharma-data-sync
// Atherium Holdings — atherium.cosmonova.io
//
// Secrets: ALPHA_VANTAGE_API_KEY
// Phases: calendar | actual | overview | quotes | news | trials | all
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const AV_SLEEP_MS = 13000;

const QUOTE_TICKERS = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "AVGO", "NFLX", "AMGN",
  "GILD", "VRTX", "REGN", "MRNA", "LLY", "PFE", "SMMT", "CRWD", "COST", "ADBE",
];

const OVERVIEW_TICKERS = [
  "LLY", "PFE", "AMGN", "GILD", "VRTX", "REGN", "MRNA", "SMMT",
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA",
];

const EARNINGS_TICKERS = [
  "VRTX", "GILD", "AMGN", "REGN", "MRNA", "BNTX",
  "EXEL", "AXSM", "IONS", "MDGL", "SMMT", "LLY", "PFE",
  ...QUOTE_TICKERS.filter((t) => !["VRTX", "GILD", "AMGN", "REGN", "MRNA", "SMMT", "LLY", "PFE"].includes(t)),
];

const NEWS_TICKERS = [...new Set([...OVERVIEW_TICKERS, ...QUOTE_TICKERS.slice(0, 10)])];
const EARNINGS_TICKER_SET = new Set(EARNINGS_TICKERS);

function parseAvPublished(raw: string | undefined): string | null {
  if (!raw || raw.length < 15) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}Z`;
}

function fiscalQuarterFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function parseAvNumber(raw: unknown): number | null {
  if (raw == null || raw === "None" || raw === "") return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

async function avFetch(params: Record<string, string>) {
  const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (!apiKey) throw new Error("ALPHA_VANTAGE_API_KEY is not configured");

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("apikey", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const data = await res.json();
  if (data.Note || data.Information) {
    throw new Error(String(data.Note || data.Information));
  }
  return data;
}

async function syncQuotes() {
  let upserted = 0;
  const errors: string[] = [];

  for (const ticker of QUOTE_TICKERS) {
    try {
      const data = await avFetch({ function: "GLOBAL_QUOTE", symbol: ticker });
      const quote = data["Global Quote"];
      if (!quote?.["05. price"]) {
        errors.push(`${ticker}: empty quote`);
        await sleep(AV_SLEEP_MS);
        continue;
      }

      const changePctRaw = String(quote["10. change percent"] ?? "0").replace("%", "");
      const { error } = await supabase.from("pharma_quotes").upsert({
        ticker,
        price: parseFloat(quote["05. price"]),
        change_amt: parseFloat(quote["09. change"]),
        change_pct: parseFloat(changePctRaw),
        volume: parseInt(quote["06. volume"], 10),
        prev_close: parseFloat(quote["08. previous close"]),
        updated_at: new Date().toISOString(),
      }, { onConflict: "ticker" });

      if (error) errors.push(`${ticker}: ${error.message}`);
      else upserted++;

      await sleep(AV_SLEEP_MS);
    } catch (e) {
      errors.push(`${ticker}: ${(e as Error).message}`);
      await sleep(AV_SLEEP_MS);
    }
  }

  return { upserted, errors };
}

async function syncOverview() {
  let upserted = 0;
  const errors: string[] = [];

  for (const ticker of OVERVIEW_TICKERS) {
    try {
      const data = await avFetch({ function: "OVERVIEW", symbol: ticker });
      if (!data?.Symbol) {
        errors.push(`${ticker}: empty overview`);
        await sleep(AV_SLEEP_MS);
        continue;
      }

      const { error } = await supabase.from("pharma_overview").upsert({
        ticker,
        company_name: data.Name ?? null,
        sector: data.Sector ?? null,
        industry: data.Industry ?? null,
        market_cap: parseInt(data.MarketCapitalization, 10) || null,
        pe_ratio: parseFloat(data.PERatio) || null,
        beta: parseFloat(data.Beta) || null,
        analyst_target: parseFloat(data.AnalystTargetPrice) || null,
        week52_high: parseFloat(data["52WeekHigh"]) || null,
        week52_low: parseFloat(data["52WeekLow"]) || null,
        dividend_yield: parseFloat(data.DividendYield) || null,
        pct_insiders: parseFloat(data.PercentInsiders) || null,
        pct_institutions: parseFloat(data.PercentInstitutions) || null,
        description: data.Description?.substring(0, 500) ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "ticker" });

      if (error) errors.push(`${ticker}: ${error.message}`);
      else upserted++;

      await sleep(AV_SLEEP_MS);
    } catch (e) {
      errors.push(`${ticker}: ${(e as Error).message}`);
      await sleep(AV_SLEEP_MS);
    }
  }

  return { upserted, errors };
}

async function syncNewsSentiment() {
  let upserted = 0;
  const errors: string[] = [];

  for (const ticker of NEWS_TICKERS) {
    try {
      const data = await avFetch({
        function: "NEWS_SENTIMENT",
        tickers: ticker,
        limit: "20",
      });
      const feed = data?.feed ?? [];

      for (const item of feed) {
        const tickerHit = item.ticker_sentiment?.find(
          (t: { ticker: string }) => t.ticker === ticker,
        );

        const { error } = await supabase.from("pharma_news").upsert({
          ticker,
          title: item.title ?? null,
          url: item.url ?? null,
          published_at: parseAvPublished(item.time_published),
          overall_score: item.overall_sentiment_score ?? null,
          overall_label: item.overall_sentiment_label ?? null,
          ticker_score: tickerHit?.ticker_sentiment_score ?? null,
          ticker_label: tickerHit?.ticker_sentiment_label ?? null,
        }, { onConflict: "ticker,url", ignoreDuplicates: true });

        if (!error) upserted++;
        else errors.push(`${ticker} news: ${error.message}`);
      }

      await sleep(AV_SLEEP_MS);
    } catch (e) {
      errors.push(`${ticker}: ${(e as Error).message}`);
      await sleep(AV_SLEEP_MS);
    }
  }

  return { upserted, errors };
}

async function syncEarningsCalendar() {
  let upserted = 0;
  const errors: string[] = [];

  try {
    const data = await avFetch({
      function: "EARNINGS_CALENDAR",
      horizon: "6month",
    });

    const rows = data?.earningsCalendar ?? [];
    for (const row of rows) {
      const ticker = String(row.symbol ?? "").toUpperCase();
      if (!ticker || !EARNINGS_TICKER_SET.has(ticker)) continue;
      if (!row.reportDate) continue;

      const fiscalQuarter = row.fiscalDateEnding
        ? fiscalQuarterFromDate(row.fiscalDateEnding)
        : fiscalQuarterFromDate(row.reportDate);

      const { error } = await supabase.from("pharma_earnings").upsert({
        ticker,
        company_name: row.name ?? ticker,
        report_date: row.reportDate,
        fiscal_quarter: fiscalQuarter,
        report_time: "tbd",
        eps_estimate: parseAvNumber(row.estimate),
        status: "upcoming",
        is_manual: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "ticker,fiscal_quarter", ignoreDuplicates: false });

      if (error) errors.push(`${ticker}: ${error.message}`);
      else upserted++;
    }
  } catch (e) {
    errors.push((e as Error).message);
  }

  return { upserted, errors };
}

async function syncActualEarnings() {
  let updated = 0;
  const errors: string[] = [];
  const tickers = [...new Set(EARNINGS_TICKERS)];

  for (const ticker of tickers) {
    try {
      const data = await avFetch({ function: "EARNINGS", symbol: ticker });
      const quarters = data?.quarterlyEarnings ?? [];

      for (const q of quarters.slice(0, 8)) {
        const epsActual = parseAvNumber(q.reportedEPS);
        if (epsActual == null || !q.fiscalDateEnding) continue;

        const fiscalQuarter = fiscalQuarterFromDate(q.fiscalDateEnding);
        const epsEstimate = parseAvNumber(q.estimatedEPS);
        const surprise = parseAvNumber(q.surprise);
        const surprisePct = parseAvNumber(q.surprisePercentage);

        const { error } = await supabase.from("pharma_earnings").upsert({
          ticker,
          company_name: data.name ?? ticker,
          report_date: q.reportedDate || q.fiscalDateEnding,
          fiscal_quarter: fiscalQuarter,
          eps_estimate: epsEstimate,
          eps_actual: epsActual,
          eps_beat: surprise != null ? surprise >= 0 : (epsEstimate != null ? epsActual >= epsEstimate : null),
          eps_surprise_pct: surprisePct,
          status: "reported",
          is_manual: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "ticker,fiscal_quarter", ignoreDuplicates: false });

        if (!error) updated++;
      }

      await sleep(AV_SLEEP_MS);
    } catch (e) {
      errors.push(`${ticker}: ${(e as Error).message}`);
      await sleep(AV_SLEEP_MS);
    }
  }

  return { updated, errors };
}

async function syncClinicalTrials() {
  let upserted = 0;
  const errors: string[] = [];

  const companies = [
    { name: "Vertex Pharmaceuticals", ticker: "VRTX" },
    { name: "Moderna", ticker: "MRNA" },
    { name: "Gilead Sciences", ticker: "GILD" },
    { name: "Amgen", ticker: "AMGN" },
    { name: "Regeneron", ticker: "REGN" },
    { name: "Eli Lilly", ticker: "LLY" },
    { name: "Pfizer", ticker: "PFE" },
    { name: "Summit Therapeutics", ticker: "SMMT" },
    { name: "Exelixis", ticker: "EXEL" },
  ];

  for (const co of companies) {
    try {
      const url = `https://clinicaltrials.gov/api/v2/studies?` +
        `query.term=${encodeURIComponent(co.name)}` +
        `&filter.advanced=AREA[Phase]PHASE3` +
        `&filter.advanced=AREA[OverallStatus]RECRUITING OR ACTIVE_NOT_RECRUITING` +
        `&fields=NCTId,BriefTitle,PrimaryCompletionDate,LeadSponsorName` +
        `&pageSize=5&sort=PrimaryCompletionDate:asc`;

      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      for (const s of data?.studies ?? []) {
        const proto = s?.protocolSection;
        const nctId = proto?.identificationModule?.nctId;
        const title = proto?.identificationModule?.briefTitle;
        const completionDate = proto?.statusModule?.primaryCompletionDateStruct?.date;
        if (!nctId || !completionDate) continue;

        const targetDate = new Date(completionDate);
        const monthsAway = (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAway < 0 || monthsAway > 18) continue;

        const { error } = await supabase.from("pharma_events").upsert({
          ticker: co.ticker,
          company_name: co.name,
          event_date: completionDate,
          event_type: "TRIAL",
          label: `Phase 3 completion: ${title?.substring(0, 60)}...`,
          indication: title,
          status: "trial",
          source_url: `https://clinicaltrials.gov/study/${nctId}`,
          is_manual: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "ticker,event_date,label", ignoreDuplicates: true });

        if (!error) upserted++;
      }

      await sleep(500);
    } catch (e) {
      errors.push(`${co.ticker} trials: ${(e as Error).message}`);
    }
  }

  return { upserted, errors };
}

function resolvePhases(phase: string): string[] {
  switch (phase) {
    case "calendar":
      return ["calendar", "actual"];
    case "overview":
      return ["overview", "quotes"];
    case "earnings":
      return ["calendar", "actual"];
    case "market-data":
      return ["overview", "quotes"];
    case "all":
      return ["calendar", "actual", "overview", "quotes", "news", "trials"];
    default:
      return [phase];
  }
}

async function logSync(source: string, records: number, errors: string[]) {
  await supabase.from("pharma_sync_log").insert({
    source,
    records_upserted: records,
    status: errors.length === 0 ? "ok" : "partial",
    error_msg: errors.join("; ") || null,
  });
}

Deno.serve(async (req) => {
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const phase = body.phase ?? "all";
  const phases = resolvePhases(phase);

  const results: Record<string, unknown> = { phase, phases };
  console.log("[pharma-data-sync] start:", phase, new Date().toISOString());

  if (phases.includes("calendar")) {
    const res = await syncEarningsCalendar();
    results.earnings_calendar = res;
    await logSync("alpha_earnings_calendar", res.upserted, res.errors);
  }

  if (phases.includes("actual")) {
    const res = await syncActualEarnings();
    results.earnings_actual = res;
    await logSync("alpha_earnings_actual", res.updated, res.errors);
  }

  if (phases.includes("overview")) {
    const res = await syncOverview();
    results.overview = res;
    await logSync("alpha_overview", res.upserted, res.errors);
  }

  if (phases.includes("quotes")) {
    const res = await syncQuotes();
    results.quotes = res;
    await logSync("alpha_quotes", res.upserted, res.errors);
  }

  if (phases.includes("news")) {
    const res = await syncNewsSentiment();
    results.news = res;
    await logSync("alpha_news", res.upserted, res.errors);
  }

  if (phases.includes("trials")) {
    const res = await syncClinicalTrials();
    results.clinical_trials = res;
    await logSync("clinicaltrials", res.upserted, res.errors);
  }

  console.log("[pharma-data-sync] done:", JSON.stringify(results));

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
