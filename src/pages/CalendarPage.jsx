import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AtheriumNavRail from "../components/AtheriumNavRail";
import StickersPanel from "../components/StickersPanel";
import { usePharmaNotes } from "../hooks/usePharmaNotes";
import { exportMonthToIcs, downloadIcs, parseIcsFile } from "../lib/icsCalendar";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ALL = "All";
const EVENT_TYPES = ["FDA", "TRIAL", "IR", "OTHER"];

// Atherium palette — slightly lifted from pure night, matches admin shell
const THEME = {
  bg: "#0F1220",           // --night2
  surface: "#151929",      // --night3
  surfaceAlt: "#1C2235",   // --night4
  surfaceHover: "#252D45", // --dim
  border: "rgba(201,168,76,0.15)",
  borderStrong: "rgba(201,168,76,0.28)",
  text: "#D4DCF0",
  textMuted: "#8892AA",
  textFaint: "#5A6478",
  accent: "#C9A84C",       // --gold
  accentSoft: "rgba(201,168,76,0.12)",
  accentText: "#E8D08A",   // --gold-light
  today: "#C9A84C",
  selDay: "rgba(201,168,76,0.08)",
};

const dDayLabel = (date) => {
  const d = diffDays(date);
  if (d < 0) return null;
  if (d === 0) return "D-Day";
  return `D-${d}`;
};

const dDayColor = (date) => {
  const d = diffDays(date);
  if (d <= 7) return "#E84F4F";
  if (d <= 30) return "#E8943A";
  return THEME.textFaint;
};

const STATUS_META = {
  approved: { label:"Approved", dot:"#2EC08A", bg:"rgba(46,192,138,0.14)", border:"rgba(46,192,138,0.35)", text:"#7ee8b8" },
  pending:  { label:"Regulatory pending", dot:"#E8943A", bg:"rgba(232,148,58,0.14)", border:"rgba(232,148,58,0.35)", text:"#fcd34d" },
  trial:    { label:"Trial", dot:"#4F8FE8", bg:"rgba(79,143,232,0.14)", border:"rgba(79,143,232,0.35)", text:"#93c5fd" },
  event:    { label:"IR", dot:"#7B5CF0", bg:"rgba(123,92,240,0.14)", border:"rgba(123,92,240,0.35)", text:"#c4b5fd" },
  upcoming: { label:"Upcoming", dot:"#8892AA", bg:"rgba(136,146,170,0.1)", border:"rgba(136,146,170,0.22)", text:"#8892AA" },
  failed:   { label:"Failed", dot:"#E84F4F", bg:"rgba(232,79,79,0.14)", border:"rgba(232,79,79,0.35)", text:"#fca5a5" },
  earnings: { label:"Earnings", dot:"#4F8FE8", bg:"rgba(79,143,232,0.14)", border:"rgba(79,143,232,0.35)", text:"#93c5fd" },
};

const TYPE_ICON = { FDA: "⚖️", TRIAL: "📊", IR: "📢", EARN: "📈", OTHER: "📌" };
const FILTER_LABELS = { All: "All", FDA: "Regulatory", EARN: "Earnings", TRIAL: "Data", IR: "IR" };
const CATALYST_TYPE_LABELS = { FDA: "Regulatory", TRIAL: "Data release", IR: "Investor relations", OTHER: "Other" };
const OFFICE_CATEGORIES = ["MEETING", "DEADLINE", "REMINDER", "OUT_OF_OFFICE", "OTHER"];
const OFFICE_META = {
  MEETING: { icon: "📅", label: "Meeting", bg: "rgba(79,143,232,0.16)", border: "rgba(79,143,232,0.4)", text: "#93c5fd" },
  DEADLINE: { icon: "⏰", label: "Deadline", bg: "rgba(232,148,58,0.16)", border: "rgba(232,148,58,0.4)", text: "#fcd34d" },
  REMINDER: { icon: "🔔", label: "Reminder", bg: "rgba(123,92,240,0.16)", border: "rgba(123,92,240,0.4)", text: "#c4b5fd" },
  OUT_OF_OFFICE: { icon: "🚫", label: "Out of office", bg: "rgba(136,146,170,0.14)", border: "rgba(136,146,170,0.35)", text: "#8892AA" },
  OTHER: { icon: "📌", label: "Other", bg: "rgba(201,168,76,0.12)", border: "rgba(201,168,76,0.35)", text: "#E8D08A" },
};
const fmtTime = (t) => (t ? String(t).slice(0, 5) : "");

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const diffDays = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

const fmtMoney = (v) => (v != null && !Number.isNaN(Number(v)) ? `$${Number(v).toFixed(2)}` : "—");
const fmtMarketCap = (v) => {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};
const fmtVolume = (v) => {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};
const fmtPct = (v, digits = 1) => (v != null && !Number.isNaN(Number(v))
  ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(digits)}%`
  : "—");
const sentimentTo100 = (score) => {
  if (score == null || Number.isNaN(Number(score))) return null;
  const n = Number(score);
  if (n >= -1 && n <= 1) return Math.round((n + 1) * 50);
  return Math.round(Math.min(100, Math.max(0, n)));
};
const sentimentStyle = (label) => {
  const l = String(label || "").toLowerCase();
  if (l.includes("bull")) return { color: "#2EC08A", bg: "rgba(46,192,138,0.14)" };
  if (l.includes("bear")) return { color: "#E84F4F", bg: "rgba(232,79,79,0.14)" };
  return { color: THEME.textMuted, bg: THEME.surfaceAlt };
};
const timeAgo = (d) => {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
};

function SectionCard({ title, children, muted }) {
  return (
    <div style={{
      background: THEME.surface, border: `1px solid ${THEME.border}`,
      borderRadius: 8, padding: "10px 12px", marginBottom: 8,
    }}>
      <div style={{ fontWeight: 700, fontSize: 11, color: THEME.text, marginBottom: muted ? 4 : 8 }}>{title}</div>
      {muted && <div style={{ fontSize: 9, color: THEME.textFaint, marginBottom: 8 }}>{muted}</div>}
      {children}
    </div>
  );
}

function PlaceholderField({ label, hint }) {
  return (
    <div style={{ background: THEME.surfaceAlt, borderRadius: 5, padding: "6px 8px" }}>
      <div style={{ fontSize: 9, color: THEME.textFaint, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: THEME.textMuted, fontStyle: "italic" }}>{hint ?? "Coming soon"}</div>
    </div>
  );
}

function RailSection({ title, children }) {
  return (
    <div style={{ padding: "10px 12px", borderBottom: `1px solid ${THEME.border}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: THEME.textFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function BeatMissStrip({ earnings }) {
  const quarters = earnings
    .filter(e => e.eps_beat != null || e.status === "reported")
    .sort((a, b) => new Date(a.report_date) - new Date(b.report_date))
    .slice(-4);

  if (quarters.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
      padding: "6px 8px", background: THEME.surfaceAlt, borderRadius: 6,
    }}>
      <span style={{ fontSize: 8, color: THEME.textFaint, fontWeight: 600, textTransform: "uppercase" }}>Beat track</span>
      <div style={{ display: "flex", gap: 4 }}>
        {quarters.map(e => (
          <span
            key={e.id}
            title={`${e.fiscal_quarter}: ${e.eps_beat ? `Beat ${e.eps_surprise_pct != null ? `${Math.abs(e.eps_surprise_pct).toFixed(1)}%` : ""}` : "Miss"}`}
            style={{ fontSize: 12, lineHeight: 1 }}
          >
            {e.eps_beat === true ? "✅" : e.eps_beat === false ? "❌" : "○"}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompanyDetailPanel({ ticker, events, earnings, onClose, onDeleteEvent }) {
  const [detailLoading, setDetailLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [overview, setOverview] = useState(null);
  const [news, setNews] = useState([]);
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");

  const companyEvents = events.filter(e => e.ticker === ticker)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const companyEarnings = earnings.filter(e => e.ticker === ticker)
    .sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
  const companyName = overview?.company_name || companyEarnings[0]?.company_name || companyEvents[0]?.company_name || ticker;

  useEffect(() => {
    let cancelled = false;
    const loadTickerDetail = async () => {
      setDetailLoading(true);
      setAiText("");
      setAiError("");
      const [quoteRes, overviewRes, newsRes, earningsRes] = await Promise.all([
        supabase.from("pharma_quotes").select("*").eq("ticker", ticker).maybeSingle(),
        supabase.from("pharma_overview").select("*").eq("ticker", ticker).maybeSingle(),
        supabase.from("pharma_news").select("*").eq("ticker", ticker).order("published_at", { ascending: false }).limit(5),
        supabase.from("pharma_earnings").select("*").eq("ticker", ticker).order("report_date", { ascending: false }).limit(6),
      ]);
      if (cancelled) return;
      setQuote(quoteRes.data);
      setOverview(overviewRes.data);
      setNews(newsRes.data || []);
      setEarningsHistory(earningsRes.data?.length ? earningsRes.data : companyEarnings.slice(0, 6));
      setDetailLoading(false);
    };
    loadTickerDetail();
    return () => { cancelled = true; };
  }, [ticker]);

  const historyRows = earningsHistory.length ? earningsHistory : companyEarnings.slice(0, 6);
  const upcomingEarn = historyRows.filter(e => new Date(e.report_date) >= new Date());

  const allUpcoming = [
    ...companyEvents.filter(e => new Date(e.event_date) >= new Date()).map(e => ({ ...e, date: e.event_date, kind: "event" })),
    ...upcomingEarn.map(e => ({ ...e, date: e.report_date, kind: "earning", label: `${e.fiscal_quarter} Earnings` })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextCatalyst = allUpcoming[0];

  const week52Low = overview?.week52_low ?? quote?.week52_low;
  const week52High = overview?.week52_high ?? quote?.week52_high;
  const price = quote?.price;
  const week52Pct = (week52Low != null && week52High != null && price != null && week52High > week52Low)
    ? ((Number(price) - Number(week52Low)) / (Number(week52High) - Number(week52Low))) * 100
    : null;
  const changeUp = quote?.change_pct != null && Number(quote.change_pct) >= 0;
  const targetUpside = (overview?.analyst_target != null && price != null && Number(price) > 0)
    ? ((Number(overview.analyst_target) - Number(price)) / Number(price)) * 100
    : null;

  const topNews = news.slice(0, 3);
  const avgSentiment = news.find(n => n.ticker_score != null)?.ticker_score
    ?? news.find(n => n.overall_score != null)?.overall_score;
  const sentimentScore = sentimentTo100(avgSentiment);
  const sentimentLabel = news[0]?.ticker_label || news[0]?.overall_label || "Neutral";
  const sentStyle = sentimentStyle(sentimentLabel);

  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiError("");
    setAiText("");
    const dDay = nextCatalyst ? diffDays(nextCatalyst.date) : null;
    const { data, error } = await supabase.functions.invoke("pharma-ai-analysis", {
      body: {
        ticker,
        events: companyEvents,
        earnings: historyRows,
        quote,
        overview,
        news: topNews,
        nextCatalyst: nextCatalyst ? {
          label: nextCatalyst.label || nextCatalyst.fiscal_quarter,
          date: nextCatalyst.date,
          dDay,
        } : null,
      },
    });
    setAiLoading(false);
    if (error) { setAiError(error.message); return; }
    if (data?.error) { setAiError(data.error); return; }
    setAiText(data?.analysis ?? "");
  };

  const StatCell = ({ label, value, accent }) => (
    <div style={{ background: THEME.surfaceAlt, borderRadius: 5, padding: "6px 8px" }}>
      <div style={{ fontSize: 8, color: THEME.textFaint, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: accent || THEME.text }}>{value}</div>
    </div>
  );

  return (
    <div style={{
      width: 320, height: "100%", display: "flex", flexDirection: "column",
      background: THEME.surfaceAlt, borderLeft: `1px solid ${THEME.border}`,
      flexShrink: 0,
    }}>
      <div style={{
        padding: "12px 14px", borderBottom: `1px solid ${THEME.border}`,
        background: THEME.surface, display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: THEME.accentText, letterSpacing: 0.5 }}>{ticker}</div>
          <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>{companyName}</div>
          {nextCatalyst && (
            <div style={{
              marginTop: 8, padding: "6px 8px", borderRadius: 6,
              background: THEME.accentSoft, border: `1px solid ${THEME.borderStrong}`,
            }}>
              <div style={{ fontSize: 8, color: THEME.textFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Next catalyst</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: THEME.text }}>{nextCatalyst.label || nextCatalyst.fiscal_quarter}</div>
              <div style={{ fontSize: 9, color: THEME.textMuted, marginTop: 2 }}>
                {fmtDate(nextCatalyst.date)}
                {dDayLabel(nextCatalyst.date) && (
                  <span style={{ marginLeft: 6, fontWeight: 700, color: dDayColor(nextCatalyst.date) }}>{dDayLabel(nextCatalyst.date)}</span>
                )}
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} style={{
          background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
          borderRadius: 5, width: 26, height: 26, cursor: "pointer",
          color: THEME.textMuted, fontSize: 16, lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>
        {detailLoading ? (
          <div style={{ fontSize: 10, color: THEME.textMuted, padding: "20px 0", textAlign: "center" }}>Loading…</div>
        ) : (
          <>
            <SectionCard title="Live Quote" muted={quote ? undefined : "Run Sync data to refresh quotes"}>
              {quote ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: THEME.text }}>{fmtMoney(quote.price)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: changeUp ? "#2EC08A" : "#E84F4F" }}>
                      {changeUp ? "▲" : "▼"} {fmtPct(quote.change_pct)} ({quote.change_amt >= 0 ? "+" : ""}{fmtMoney(Math.abs(quote.change_amt))})
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: THEME.textMuted, marginBottom: 8 }}>Volume: {fmtVolume(quote.volume)}</div>
                  {week52Low != null && week52High != null && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: THEME.textFaint, marginBottom: 4 }}>
                        <span>{fmtMoney(week52Low)}</span>
                        <span>52-week range</span>
                        <span>{fmtMoney(week52High)}</span>
                      </div>
                      <div style={{ position: "relative", height: 8, background: THEME.surfaceAlt, borderRadius: 99, overflow: "hidden", border: `1px solid ${THEME.border}` }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, bottom: 0,
                          width: `${Math.min(100, Math.max(0, week52Pct ?? 0))}%`,
                          background: changeUp ? "rgba(46,192,138,0.45)" : "rgba(232,79,79,0.45)",
                          borderRadius: 99,
                        }} />
                        {week52Pct != null && (
                          <div style={{
                            position: "absolute", top: -2, left: `calc(${Math.min(100, Math.max(0, week52Pct))}% - 4px)`,
                            width: 8, height: 8, borderRadius: "50%", background: THEME.accent,
                            border: "1px solid #0A0C14",
                          }} />
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 10, color: THEME.textMuted }}>No quote data yet.</div>
              )}
            </SectionCard>

            <SectionCard title="Company Overview">
              {overview ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <StatCell label="Market Cap" value={fmtMarketCap(overview.market_cap)} />
                  <StatCell label="P/E Ratio" value={overview.pe_ratio != null ? `${Number(overview.pe_ratio).toFixed(1)}x` : "—"} />
                  <StatCell label="Sector" value={overview.sector || "—"} />
                  <StatCell label="Industry" value={overview.industry || "—"} />
                  <StatCell label="Beta" value={overview.beta != null ? Number(overview.beta).toFixed(2) : "—"} />
                  <StatCell
                    label="Analyst Target"
                    value={overview.analyst_target != null ? `${fmtMoney(overview.analyst_target)}${targetUpside != null ? ` ${targetUpside >= 0 ? "↑" : "↓"}${Math.abs(targetUpside).toFixed(1)}%` : ""}` : "—"}
                    accent={targetUpside != null ? (targetUpside >= 0 ? "#2EC08A" : "#E84F4F") : undefined}
                  />
                  <StatCell label="Institutions" value={overview.pct_institutions != null ? `${Number(overview.pct_institutions).toFixed(1)}%` : "—"} />
                  <StatCell label="Insiders" value={overview.pct_insiders != null ? `${Number(overview.pct_insiders).toFixed(1)}%` : "—"} />
                </div>
              ) : (
                <div style={{ fontSize: 10, color: THEME.textMuted }}>No overview data yet.</div>
              )}
            </SectionCard>

            <SectionCard title="Earnings History">
              <BeatMissStrip earnings={historyRows} />
              {historyRows.length === 0 ? (
                <div style={{ fontSize: 10, color: THEME.textMuted }}>No earnings data yet.</div>
              ) : (
                historyRows.map(e => {
                  const isUpcoming = new Date(e.report_date) >= new Date();
                  const dd = diffDays(e.report_date);
                  return (
                    <div key={`hist-${e.id}`} style={{
                      padding: "8px", borderRadius: 6, marginBottom: 6,
                      background: THEME.surface, border: `1px solid ${THEME.border}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: THEME.text }}>{e.fiscal_quarter}</span>
                        <span style={{ fontSize: 9, color: THEME.textMuted }}>
                          {fmtDate(e.report_date)}
                          {isUpcoming && dd >= 0 && (
                            <span style={{ marginLeft: 4, fontWeight: 700, color: dd <= 7 ? "#E84F4F" : THEME.textMuted }}>D-{dd}</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                        {[
                          ["Est.", e.eps_estimate != null ? `$${Number(e.eps_estimate).toFixed(2)}` : "TBD"],
                          ["Act.", e.eps_actual != null ? `$${Number(e.eps_actual).toFixed(2)}` : "—"],
                          ["Beat", e.eps_beat === true ? "✅" : e.eps_beat === false ? "❌" : "—"],
                        ].map(([k, v]) => (
                          <div key={k} style={{ background: THEME.surfaceAlt, borderRadius: 4, padding: "4px 6px", textAlign: "center" }}>
                            <div style={{ fontSize: 8, color: THEME.textFaint }}>{k}</div>
                            <div style={{
                              fontSize: 10, fontWeight: 600,
                              color: k === "Beat" && e.eps_beat === true ? "#2EC08A" : k === "Beat" && e.eps_beat === false ? "#E84F4F" : THEME.text,
                            }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {e.eps_surprise_pct != null && (
                        <div style={{
                          marginTop: 4, fontSize: 9, fontWeight: 600, textAlign: "center",
                          color: e.eps_surprise_pct >= 0 ? "#2EC08A" : "#E84F4F",
                        }}>
                          {e.eps_surprise_pct >= 0 ? "✅ Beat" : "❌ Miss"} {Math.abs(Number(e.eps_surprise_pct)).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </SectionCard>

            <SectionCard title="News Sentiment" muted="Pre-catalyst and pre-earnings signal">
              {news.length > 0 ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: sentStyle.color }}>
                        Sentiment Score: {sentimentScore ?? "—"}/100 {sentimentLabel} {sentimentLabel.toLowerCase().includes("bull") ? "📈" : sentimentLabel.toLowerCase().includes("bear") ? "📉" : ""}
                      </div>
                      {sentimentScore != null && (
                        <div style={{ marginTop: 6, height: 8, width: 140, background: THEME.surfaceAlt, borderRadius: 99, overflow: "hidden", border: `1px solid ${THEME.border}` }}>
                          <div style={{ width: `${sentimentScore}%`, height: "100%", background: sentStyle.color, opacity: 0.75 }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 8, color: THEME.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Recent headlines</div>
                  {topNews.map(n => {
                    const ns = sentimentStyle(n.ticker_label || n.overall_label);
                    return (
                      <a
                        key={n.id ?? n.url}
                        href={n.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "block", padding: "6px 0", borderBottom: `1px solid ${THEME.border}`,
                          textDecoration: "none", color: THEME.textMuted, fontSize: 9, lineHeight: 1.45,
                        }}
                      >
                        <span style={{ color: ns.color, fontWeight: 700 }}>[{n.ticker_label || n.overall_label || "Neutral"}]</span>
                        {" "}{n.title}
                        {n.published_at && <span style={{ color: THEME.textFaint }}> ({timeAgo(n.published_at)})</span>}
                      </a>
                    );
                  })}
                </>
              ) : (
                <div style={{ fontSize: 10, color: THEME.textMuted }}>No news sentiment data yet.</div>
              )}
            </SectionCard>

            {companyEvents.length > 0 && (
              <SectionCard title="Events & Catalysts">
                {companyEvents.map(ev => {
                  const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
                  return (
                    <div key={ev.id} style={{
                      display: "flex", gap: 8, padding: "6px 8px", borderRadius: 5, marginBottom: 4,
                      background: sm.bg, border: `1px solid ${sm.border}`,
                    }}>
                      <span style={{ fontSize: 11 }}>{TYPE_ICON[ev.event_type] ?? TYPE_ICON.OTHER}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: sm.text }}>{ev.label}</div>
                        <div style={{ fontSize: 9, color: THEME.textMuted }}>{fmtDate(ev.event_date)} · {sm.label}</div>
                        {ev.drug_name && <div style={{ fontSize: 9, color: THEME.textFaint }}>{ev.drug_name}</div>}
                      </div>
                      {ev.is_manual && onDeleteEvent && (
                        <button type="button" onClick={() => onDeleteEvent(ev.id)} title="Remove event" style={{
                          background: "none", border: "none", color: "#E84F4F", cursor: "pointer",
                          fontSize: 14, padding: 0, flexShrink: 0,
                        }}>×</button>
                      )}
                    </div>
                  );
                })}
              </SectionCard>
            )}

            <SectionCard title="AI Analysis">
              {!aiText && !aiLoading && (
                <div style={{ fontSize: 10, color: THEME.textMuted, lineHeight: 1.5, marginBottom: 8 }}>
                  Claude AI analyzes event risk and key checkpoints for this ticker.
                </div>
              )}
              {aiLoading && (
                <div style={{ fontSize: 10, color: THEME.textMuted, marginBottom: 8 }}>Analyzing…</div>
              )}
              {aiText && (
                <div style={{ fontSize: 10, color: THEME.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{aiText}</div>
              )}
              {aiError && (
                <div style={{ fontSize: 9, color: "#E84F4F", marginTop: 8, lineHeight: 1.4 }}>{aiError}</div>
              )}
            </SectionCard>
          </>
        )}
      </div>

      <div style={{
        padding: "10px 12px", borderTop: `1px solid ${THEME.border}`,
        background: THEME.surface, flexShrink: 0,
      }}>
        <button type="button" onClick={runAiAnalysis} disabled={aiLoading || detailLoading} style={{
          width: "100%", padding: "8px 0", borderRadius: 6, cursor: aiLoading ? "wait" : "pointer",
          background: "rgba(123,92,240,0.15)", border: "1px solid rgba(123,92,240,0.45)",
          color: "#c4b5fd", fontSize: 11, fontWeight: 600,
          opacity: aiLoading || detailLoading ? 0.7 : 1,
        }}>
          {aiLoading ? "Analyzing…" : "🤖 Run analysis"}
        </button>
      </div>
    </div>
  );
}

function OfficeEventPanel({ event, onClose, onDelete }) {
  const om = OFFICE_META[event.category] ?? OFFICE_META.OTHER;
  return (
    <div style={{
      width: 320, height: "100%", display: "flex", flexDirection: "column",
      background: THEME.surfaceAlt, borderLeft: `1px solid ${THEME.border}`, flexShrink: 0,
    }}>
      <div style={{
        padding: "12px 14px", borderBottom: `1px solid ${THEME.border}`,
        background: THEME.surface, display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: om.text, fontWeight: 700, marginBottom: 4 }}>{om.icon} {om.label}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: THEME.text, lineHeight: 1.3 }}>{event.title}</div>
          <div style={{ fontSize: 10, color: THEME.textMuted, marginTop: 6 }}>
            {fmtDate(event.event_date)}
            {!event.all_day && event.start_time && (
              <span> · {fmtTime(event.start_time)}{event.end_time ? ` – ${fmtTime(event.end_time)}` : ""}</span>
            )}
            {event.all_day && <span> · All day</span>}
          </div>
        </div>
        <button type="button" onClick={onClose} style={{
          background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
          borderRadius: 5, width: 26, height: 26, cursor: "pointer", color: THEME.textMuted, fontSize: 16,
        }}>×</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>
        {event.location && (
          <SectionCard title="Location">
            <div style={{ fontSize: 11, color: THEME.text }}>{event.location}</div>
          </SectionCard>
        )}
        {event.attendees && (
          <SectionCard title="Attendees">
            <div style={{ fontSize: 10, color: THEME.textMuted, lineHeight: 1.5 }}>{event.attendees}</div>
          </SectionCard>
        )}
        {event.description && (
          <SectionCard title="Notes">
            <div style={{ fontSize: 10, color: THEME.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{event.description}</div>
          </SectionCard>
        )}
        {event.created_by && (
          <div style={{ fontSize: 9, color: THEME.textFaint, marginTop: 8 }}>Created by {event.created_by}</div>
        )}
      </div>
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${THEME.border}`, background: THEME.surface }}>
        <button type="button" onClick={() => onDelete(event.id)} style={{
          width: "100%", padding: "8px 0", borderRadius: 6, cursor: "pointer",
          background: "rgba(232,79,79,0.12)", border: "1px solid rgba(232,79,79,0.35)",
          color: "#fca5a5", fontSize: 11, fontWeight: 600,
        }}>Delete event</button>
      </div>
    </div>
  );
}

export default function CalendarPage({ userEmail = 'Admin' }) {
  const location = useLocation();
  const activeView = location.pathname === "/stickers" ? "stickers" : "calendar";

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selDay, setSelDay] = useState(null);
  const [selCompany, setSelCompany] = useState(null);
  const [selOffice, setSelOffice] = useState(null);
  const [officeEvents, setOfficeEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [calendarView, setCalendarView] = useState("ALL");
  const [tickerFilter, setTickerFilter] = useState(ALL);
  const [lastSync, setLastSync] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const syncDoneTimer = useRef(null);
  const [newEv, setNewEv] = useState({ ticker: "", date: "", event_type: "FDA", label: "" });
  const [addMode, setAddMode] = useState("office");
  const [newOffice, setNewOffice] = useState({
    title: "", date: "", start_time: "09:00", end_time: "10:00",
    all_day: false, location: "", attendees: "", description: "", category: "MEETING",
  });
  const icsInputRef = useRef(null);

  const sticker = usePharmaNotes();

  const openCompany = (ticker, e) => {
    e?.stopPropagation?.();
    setSelOffice(null);
    setSelCompany(ticker);
  };

  const openOffice = (event, e) => {
    e?.stopPropagation?.();
    setSelCompany(null);
    setSelOffice(event);
  };

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const [evRes, erRes, offRes, lgRes] = await Promise.all([
      supabase.from("pharma_events").select("*").order("event_date"),
      supabase.from("pharma_earnings").select("*").order("report_date"),
      supabase.from("company_calendar_events").select("*").order("event_date"),
      supabase.from("pharma_sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1),
    ]);
    if (evRes.data) setEvents(evRes.data);
    if (erRes.data) setEarnings(erRes.data);
    if (offRes.data) setOfficeEvents(offRes.data);
    if (lgRes.data?.[0]) setLastSync(lgRes.data[0].synced_at);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => () => {
    if (syncDoneTimer.current) clearTimeout(syncDoneTimer.current);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setSelCompany(null); setSelOffice(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const weekRows = Math.ceil((firstDay + daysInMonth) / 7);
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); setSelDay(null); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); setSelDay(null); };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelDay(today.getDate());
    setSelCompany(null);
    setSelOffice(null);
  };
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const pharmaItems = [
    ...events.map(e => ({ ...e, _type: "event", date: e.event_date, status: e.status })),
    ...earnings.map(e => ({
      ...e, _type: "earning", date: e.report_date, status: "earnings",
      event_type: "EARN",
      label: `${e.fiscal_quarter} Earnings (EPS est: $${e.eps_estimate ?? "TBD"})`,
      ticker: e.ticker,
    })),
  ];

  const officeItems = officeEvents.map(e => ({
    ...e, _type: "office", date: e.event_date, status: "office", event_type: "OFFICE",
    label: e.title, ticker: null,
  }));

  const filteredPharma = pharmaItems.filter(e =>
    (tickerFilter === ALL || e.ticker === tickerFilter) &&
    (typeFilter === ALL
      || (typeFilter === "EARN" && e.event_type === "EARN")
      || (typeFilter === "FDA" && e.event_type === "FDA")
      || (typeFilter === "TRIAL" && e.event_type === "TRIAL")
      || (typeFilter === "IR" && e.event_type === "IR"))
  );

  const filtered = calendarView === "MARKET" ? filteredPharma
    : calendarView === "OFFICE" ? officeItems
      : [...filteredPharma, ...officeItems];

  const getDayItems = (day) => filtered.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
  });

  const tickers = [ALL, ...new Set(pharmaItems.map(e => e.ticker).sort())];
  const monthEventCount = filtered.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length;

  const addEvent = async () => {
    if (!newEv.ticker.trim() || !newEv.date || !newEv.label.trim()) return;
    const { data, error } = await supabase.from("pharma_events").insert({
      ticker: newEv.ticker.toUpperCase(),
      company_name: newEv.ticker.toUpperCase(),
      event_date: newEv.date,
      event_type: newEv.event_type,
      label: newEv.label,
      status: newEv.event_type === "FDA" ? "pending" : "upcoming",
      is_manual: true,
    }).select().single();
    if (error) { alert(error.message); return; }
    if (data) setEvents(ev => [...ev, data]);
    setNewEv({ ticker: "", date: "", event_type: "FDA", label: "" });
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Remove this event?")) return;
    await supabase.from("pharma_events").delete().eq("id", id);
    setEvents(ev => ev.filter(e => e.id !== id));
  };

  const addOfficeEvent = async () => {
    if (!newOffice.title.trim() || !newOffice.date) return;
    const payload = {
      title: newOffice.title.trim(),
      description: newOffice.description.trim() || null,
      event_date: newOffice.date,
      start_time: newOffice.all_day ? null : newOffice.start_time || null,
      end_time: newOffice.all_day ? null : newOffice.end_time || null,
      all_day: newOffice.all_day,
      location: newOffice.location.trim() || null,
      attendees: newOffice.attendees.trim() || null,
      category: newOffice.category,
      created_by: userEmail,
    };
    const { data, error } = await supabase.from("company_calendar_events").insert(payload).select().single();
    if (error) { alert(error.message.includes("company_calendar") ? "Office calendar table not ready — run Supabase migration." : error.message); return; }
    if (data) setOfficeEvents(prev => [...prev, data]);
    setNewOffice({
      title: "", date: "", start_time: "09:00", end_time: "10:00",
      all_day: false, location: "", attendees: "", description: "", category: "MEETING",
    });
  };

  const deleteOfficeEvent = async (id) => {
    if (!window.confirm("Delete this office event?")) return;
    await supabase.from("company_calendar_events").delete().eq("id", id);
    setOfficeEvents(prev => prev.filter(e => e.id !== id));
    if (selOffice?.id === id) setSelOffice(null);
  };

  const handleExportIcs = () => {
    const ics = exportMonthToIcs({ year: viewYear, month: viewMonth, officeEvents, pharmaEvents: events });
    downloadIcs(ics, `atherium-${viewYear}-${pad(viewMonth + 1)}.ics`);
  };

  const handleImportIcs = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseIcsFile(text);
    if (parsed.length === 0) { alert("No events found in file."); return; }
    const rows = parsed.map(row => ({ ...row, created_by: userEmail }));
    const { data, error } = await supabase.from("company_calendar_events").insert(rows).select();
    if (error) { alert(error.message); return; }
    if (data) setOfficeEvents(prev => [...prev, ...data]);
    e.target.value = "";
    alert(`Imported ${data.length} event(s).`);
  };

  function pad(n) { return String(n).padStart(2, "0"); }

  const handleAddEvent = () => {
    if (addMode === "office") addOfficeEvent();
    else addEvent();
  };

  const triggerSync = async () => {
    setSyncLoading(true);
    try {
      const response = await fetch(
        "https://hgsuzanclpnzlskttkok.supabase.co/functions/v1/pharma-data-sync",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ phase: "quotes" }),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await loadData();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncLoading(false);
    }
  };

  const EventChip = ({ ev }) => {
    const isOffice = ev._type === "office";
    const sm = isOffice
      ? { ...(OFFICE_META[ev.category] ?? OFFICE_META.OTHER), text: (OFFICE_META[ev.category] ?? OFFICE_META.OTHER).text }
      : (STATUS_META[ev.status] ?? STATUS_META.upcoming);
    const dd = !isOffice ? dDayLabel(ev.date) : null;
    const om = isOffice ? (OFFICE_META[ev.category] ?? OFFICE_META.OTHER) : null;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => isOffice ? openOffice(ev, e) : openCompany(ev.ticker, e)}
        onKeyDown={(e) => e.key === "Enter" && (isOffice ? openOffice(ev, e) : openCompany(ev.ticker, e))}
        style={{
          display: "flex", alignItems: "center", gap: 3,
          background: isOffice ? om.bg : sm.bg,
          border: `1px solid ${isOffice ? om.border : sm.border}`,
          borderRadius: 3, padding: "2px 4px",
          overflow: "hidden", cursor: "pointer",
          transition: "box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(201,168,76,0.25)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
      >
        <span style={{ fontSize: 8, flexShrink: 0 }}>{isOffice ? om.icon : (TYPE_ICON[ev.event_type] ?? TYPE_ICON.OTHER)}</span>
        <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {!isOffice && <span style={{ fontSize: 8, fontWeight: 700, color: sm.text }}>{ev.ticker}</span>}
            {isOffice && ev.start_time && !ev.all_day && (
              <span style={{ fontSize: 7, fontWeight: 600, color: om.text, flexShrink: 0 }}>{fmtTime(ev.start_time)}</span>
            )}
            {dd && (
              <span style={{ fontSize: 7, fontWeight: 700, color: dDayColor(ev.date), flexShrink: 0 }}>{dd}</span>
            )}
          </div>
          <div style={{ fontSize: 7, color: isOffice ? om.text : sm.text, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isOffice ? ev.title : (ev._type === "earning" ? `EPS $${ev.eps_estimate ?? "TBD"}` : ev.label)}
          </div>
        </div>
      </div>
    );
  };

  const inputStyle = {
    width: "100%", background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
    color: THEME.text, borderRadius: 5, padding: "4px 6px", fontSize: 9, marginBottom: 4,
  };

  const calendarRailTools = (
    <>
      <RailSection title="Sync">
        {lastSync && (
          <div style={{ fontSize: 8, color: THEME.textFaint, marginBottom: 6, lineHeight: 1.3 }}>
            {new Date(lastSync).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </div>
        )}
        <button
          type="button"
          onClick={triggerSync}
          disabled={syncLoading}
          style={{
            width: "100%", padding: "5px 0", background: THEME.accentSoft, border: `1px solid ${THEME.accent}`,
            color: THEME.accentText, borderRadius: 6, fontSize: 9, fontWeight: 600,
            cursor: syncLoading ? "wait" : "pointer",
            opacity: syncLoading ? 0.6 : 1,
          }}
        >
          {syncDone ? "✅ Done!" : syncLoading ? "⏳ Syncing..." : "🔄 Sync data"}
        </button>
        {syncFeedback && (
          <div style={{
            fontSize: 8, marginTop: 6, lineHeight: 1.3,
            color: syncFeedback.type === "error" ? "#E84F4F" : THEME.textFaint,
          }}>
            {syncFeedback.text}
          </div>
        )}
      </RailSection>
      <RailSection title="Add event">
        <select value={addMode} onChange={e => setAddMode(e.target.value)} style={inputStyle}>
          <option value="office">Office meeting</option>
          <option value="market">Market catalyst</option>
        </select>

        {addMode === "office" ? (
          <>
            <input placeholder="Title *" value={newOffice.title} onChange={e => setNewOffice(v => ({ ...v, title: e.target.value }))} style={inputStyle} />
            <input type="date" value={newOffice.date} onChange={e => setNewOffice(v => ({ ...v, date: e.target.value }))} style={inputStyle} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: THEME.textMuted, marginBottom: 6 }}>
              <input type="checkbox" checked={newOffice.all_day} onChange={e => setNewOffice(v => ({ ...v, all_day: e.target.checked }))} />
              All day
            </label>
            {!newOffice.all_day && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 4 }}>
                <input type="time" value={newOffice.start_time} onChange={e => setNewOffice(v => ({ ...v, start_time: e.target.value }))} style={{ ...inputStyle, marginBottom: 0 }} />
                <input type="time" value={newOffice.end_time} onChange={e => setNewOffice(v => ({ ...v, end_time: e.target.value }))} style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
            )}
            <select value={newOffice.category} onChange={e => setNewOffice(v => ({ ...v, category: e.target.value }))} style={inputStyle}>
              {OFFICE_CATEGORIES.map(c => <option key={c} value={c}>{OFFICE_META[c].label}</option>)}
            </select>
            <input placeholder="Location" value={newOffice.location} onChange={e => setNewOffice(v => ({ ...v, location: e.target.value }))} style={inputStyle} />
            <input placeholder="Attendees (emails)" value={newOffice.attendees} onChange={e => setNewOffice(v => ({ ...v, attendees: e.target.value }))} style={inputStyle} />
            <input placeholder="Notes" value={newOffice.description} onChange={e => setNewOffice(v => ({ ...v, description: e.target.value }))} style={inputStyle} />
          </>
        ) : (
          <>
            <input placeholder="Ticker *" value={newEv.ticker} onChange={e => setNewEv(v => ({ ...v, ticker: e.target.value.toUpperCase() }))} style={inputStyle} />
            <input type="date" value={newEv.date} onChange={e => setNewEv(v => ({ ...v, date: e.target.value }))} style={inputStyle} />
            <select value={newEv.event_type} onChange={e => setNewEv(v => ({ ...v, event_type: e.target.value }))} style={inputStyle}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{CATALYST_TYPE_LABELS[t] ?? t}</option>)}
            </select>
            <input placeholder="Description *" value={newEv.label} onChange={e => setNewEv(v => ({ ...v, label: e.target.value }))} style={inputStyle} />
          </>
        )}

        <button type="button" onClick={handleAddEvent} style={{
          width: "100%", padding: "5px 0", marginBottom: 6,
          background: addMode === "office" ? "rgba(79,143,232,0.2)" : THEME.accentSoft,
          color: addMode === "office" ? "#93c5fd" : THEME.accentText,
          border: addMode === "office" ? "1px solid rgba(79,143,232,0.45)" : `1px solid ${THEME.accent}`,
          borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: "pointer",
        }}>+ Add event</button>

        <button type="button" onClick={handleExportIcs} style={{
          width: "100%", padding: "5px 0", background: THEME.surfaceAlt, color: THEME.textMuted,
          border: `1px solid ${THEME.border}`, borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: "pointer", marginBottom: 4,
        }}>↓ Export .ics (Outlook)</button>
        <button type="button" onClick={() => icsInputRef.current?.click()} style={{
          width: "100%", padding: "5px 0", background: THEME.surfaceAlt, color: THEME.textMuted,
          border: `1px solid ${THEME.border}`, borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: "pointer",
        }}>↑ Import .ics</button>
        <input ref={icsInputRef} type="file" accept=".ics,text/calendar" style={{ display: "none" }} onChange={handleImportIcs} />
      </RailSection>
    </>
  );

  const stickersRailTools = (
    <RailSection title={`Stickers (${sticker.notes.length})`}>
      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        {["#fef9c3","#dcfce7","#dbeafe","#fce7f3","#ede9fe","#fee2e2"].map(c => (
          <button key={c} type="button" onClick={() => sticker.setNoteColor(c)} style={{
            width: 14, height: 14, borderRadius: "50%", background: c, cursor: "pointer", padding: 0,
            border: sticker.noteColor === c ? `2px solid ${THEME.accent}` : "2px solid transparent",
          }} />
        ))}
      </div>
      <button type="button" onClick={sticker.addNote} style={{
        width: "100%", padding: "5px 0", background: THEME.accent, color: "#0A0C14",
        border: "none", borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: "pointer",
      }}>+ Add sticker</button>
    </RailSection>
  );

  const stickerPanelProps = {
    notes: sticker.notes,
    noteColor: sticker.noteColor,
    setNoteColor: sticker.setNoteColor,
    onAdd: sticker.addNote,
    onDelete: sticker.deleteNote,
    onUpdateContent: sticker.updateNoteContent,
    boardRef: sticker.boardRef,
    onMouseDown: sticker.onMouseDown,
    onResizeMouseDown: sticker.onResizeMouseDown,
    onMouseMove: sticker.onMouseMove,
    onMouseUp: sticker.onMouseUp,
    dragging: sticker.dragging,
    resizing: sticker.resizing,
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: THEME.bg, color: THEME.textMuted, fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: THEME.bg, color: THEME.text, fontFamily: "'Outfit', sans-serif", overflow: "hidden", fontSize: 12 }}>
      <AtheriumNavRail userEmail={userEmail}>
        {activeView === "stickers" ? stickersRailTools : calendarRailTools}
      </AtheriumNavRail>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {activeView === "stickers" ? (
          <StickersPanel {...stickerPanelProps} fullWidth hideControls title="📌 Sticker Board — drag to arrange" />
        ) : (
          <>
            <div style={{ background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
              <button type="button" onClick={prevMonth} style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.textMuted, borderRadius: 5, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>‹</button>
              <span style={{ fontWeight: 700, fontSize: 12, minWidth: 110, textAlign: "center" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth} style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.textMuted, borderRadius: 5, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>›</button>
              {!isCurrentMonth && (
                <button type="button" onClick={goToday} style={{
                  padding: "2px 8px", borderRadius: 5, fontSize: 9, fontWeight: 600, cursor: "pointer",
                  background: THEME.accentSoft, border: `1px solid ${THEME.accent}`, color: THEME.accentText,
                }}>Today</button>
              )}
              <span style={{ fontSize: 9, color: THEME.textFaint }}>{monthEventCount} events</span>
              <div style={{ width: 1, height: 16, background: THEME.border, margin: "0 2px" }} />
              {[
                { id: "ALL", label: "All" },
                { id: "MARKET", label: "📈 Market" },
                { id: "OFFICE", label: "📅 Office" },
              ].map(v => (
                <button key={v.id} type="button" onClick={() => setCalendarView(v.id)} style={{
                  padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  background: calendarView === v.id ? THEME.accentSoft : "transparent",
                  border: `1px solid ${calendarView === v.id ? THEME.accent : THEME.border}`,
                  color: calendarView === v.id ? THEME.accentText : THEME.textMuted,
                }}>{v.label}</button>
              ))}
              {calendarView !== "OFFICE" && ["All", "FDA", "EARN", "TRIAL", "IR"].map(t => (
                <button key={t} type="button" onClick={() => setTypeFilter(t)} style={{
                  padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  background: typeFilter === t ? THEME.accentSoft : "transparent",
                  border: `1px solid ${typeFilter === t ? THEME.accent : THEME.border}`,
                  color: typeFilter === t ? THEME.accentText : THEME.textMuted,
                }}>{FILTER_LABELS[t]}</button>
              ))}
              {calendarView !== "OFFICE" && (
              <select value={tickerFilter} onChange={e => { setTickerFilter(e.target.value); setSelDay(null); }}
                style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.text, borderRadius: 5, padding: "2px 6px", fontSize: 10 }}>
                {tickers.map(t => <option key={t}>{t}</option>)}
              </select>
              )}
              <div style={{ marginLeft: "auto" }} />
              <button type="button" onClick={() => setStickersOpen(o => !o)} style={{
                padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: stickersOpen ? "rgba(123,92,240,0.15)" : "transparent",
                border: `1px solid ${stickersOpen ? "rgba(123,92,240,0.4)" : THEME.border}`,
                color: stickersOpen ? "#c4b5fd" : THEME.textMuted,
              }}>📌 Stickers</button>
            </div>

            <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                    <div key={d} style={{ textAlign: "center", padding: "5px 0", fontSize: 10, fontWeight: 600, color: i === 6 ? "#E84F4F" : i === 5 ? "#4F8FE8" : THEME.textMuted }}>{d}</div>
                  ))}
                </div>
                <div style={{
                  flex: 1, minHeight: 0,
                  display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: `repeat(${weekRows}, 1fr)`,
                  background: THEME.surface,
                }}>
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`e${i}`} style={{ background: THEME.surfaceAlt, borderRight: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}` }} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const items = getDayItems(day);
                    const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                    const isSel = selDay === day;
                    return (
                      <div key={day} onClick={() => setSelDay(isSel ? null : day)} style={{
                        padding: "4px 4px 2px", borderRight: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}`,
                        background: isSel ? THEME.selDay : isToday ? "rgba(201,168,76,0.06)" : THEME.surface,
                        cursor: "pointer", overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column",
                      }}>
                        <div style={{ marginBottom: 3, flexShrink: 0 }}>
                          {isToday
                            ? <span style={{ background: THEME.today, color: "#0A0C14", borderRadius: 99, width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{day}</span>
                            : <span style={{ fontSize: 10, color: THEME.textMuted }}>{day}</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden", flex: 1 }}>
                          {items.slice(0, 4).map(ev => (
                            <EventChip key={`${ev._type}-${ev.id}`} ev={ev} />
                          ))}
                          {items.length > 4 && <div style={{ fontSize: 7, color: THEME.textFaint, paddingLeft: 2 }}>+{items.length - 4}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selCompany && (
                <CompanyDetailPanel
                  ticker={selCompany}
                  events={events}
                  earnings={earnings}
                  onClose={() => setSelCompany(null)}
                  onDeleteEvent={deleteEvent}
                />
              )}

              {selOffice && (
                <OfficeEventPanel
                  event={selOffice}
                  onClose={() => setSelOffice(null)}
                  onDelete={deleteOfficeEvent}
                />
              )}

              {stickersOpen && (
                <StickersPanel {...stickerPanelProps} width={280} title="📌 Quick Stickers" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
