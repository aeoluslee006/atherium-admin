import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AtheriumNavRail from "../components/AtheriumNavRail";
import StickersPanel from "../components/StickersPanel";
import { usePharmaNotes } from "../hooks/usePharmaNotes";

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
  pending:  { label:"FDA Pending", dot:"#E8943A", bg:"rgba(232,148,58,0.14)", border:"rgba(232,148,58,0.35)", text:"#fcd34d" },
  trial:    { label:"Trial", dot:"#4F8FE8", bg:"rgba(79,143,232,0.14)", border:"rgba(79,143,232,0.35)", text:"#93c5fd" },
  event:    { label:"IR", dot:"#7B5CF0", bg:"rgba(123,92,240,0.14)", border:"rgba(123,92,240,0.35)", text:"#c4b5fd" },
  upcoming: { label:"Upcoming", dot:"#8892AA", bg:"rgba(136,146,170,0.1)", border:"rgba(136,146,170,0.22)", text:"#8892AA" },
  failed:   { label:"Failed", dot:"#E84F4F", bg:"rgba(232,79,79,0.14)", border:"rgba(232,79,79,0.35)", text:"#fca5a5" },
  earnings: { label:"Earnings", dot:"#4F8FE8", bg:"rgba(79,143,232,0.14)", border:"rgba(79,143,232,0.35)", text:"#93c5fd" },
};

const TYPE_ICON = { FDA:"💊", TRIAL:"🧪", IR:"📢", EARN:"📊", OTHER:"📌" };
const FILTER_LABELS = { All: "All", FDA: "💊 FDA", EARN: "📊 Earnings", TRIAL: "🧪 Trial", IR: "📢 IR" };

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const diffDays = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

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

function CompanyDetailPanel({ ticker, events, earnings, onClose }) {
  const companyEvents = events.filter(e => e.ticker === ticker)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const companyEarnings = earnings.filter(e => e.ticker === ticker)
    .sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
  const companyName = companyEarnings[0]?.company_name || companyEvents[0]?.company_name || ticker;
  const upcomingEarn = companyEarnings.filter(e => new Date(e.report_date) >= new Date());
  const pastEarn = companyEarnings.filter(e => new Date(e.report_date) < new Date());

  const allUpcoming = [
    ...companyEvents.filter(e => new Date(e.event_date) >= new Date()).map(e => ({ ...e, date: e.event_date, kind: "event" })),
    ...upcomingEarn.map(e => ({ ...e, date: e.report_date, kind: "earning", label: `${e.fiscal_quarter} Earnings` })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextCatalyst = allUpcoming[0];

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

        <SectionCard title="Live Quote" muted="Updates after market data sync">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <PlaceholderField label="Price" hint="—" />
            <PlaceholderField label="Change %" hint="—" />
          </div>
        </SectionCard>

        <SectionCard title="Company Overview">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <PlaceholderField label="Market Cap" />
            <PlaceholderField label="P/E Ratio" />
            <PlaceholderField label="Sector" />
            <PlaceholderField label="Industry" />
          </div>
        </SectionCard>

        <SectionCard title="Earnings Calendar">
          {upcomingEarn.length === 0 ? (
            <div style={{ fontSize: 10, color: THEME.textMuted }}>No upcoming earnings dates.</div>
          ) : (
            upcomingEarn.map(e => (
              <div key={e.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 5, marginBottom: 4,
                background: STATUS_META.earnings.bg, border: `1px solid ${STATUS_META.earnings.border}`,
              }}>
                <span style={{ fontSize: 12 }}>📊</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: STATUS_META.earnings.text }}>{e.fiscal_quarter}</div>
                  <div style={{ fontSize: 9, color: THEME.textMuted }}>{fmtDate(e.report_date)}</div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: diffDays(e.report_date) <= 7 ? "#E84F4F" : THEME.textMuted,
                }}>D-{diffDays(e.report_date)}</span>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Earnings History">
          {[...upcomingEarn, ...pastEarn].length === 0 ? (
            <div style={{ fontSize: 10, color: THEME.textMuted }}>No earnings data yet.</div>
          ) : (
            [...upcomingEarn, ...pastEarn].map(e => (
              <div key={`hist-${e.id}`} style={{
                padding: "8px", borderRadius: 6, marginBottom: 6,
                background: THEME.surface, border: `1px solid ${THEME.border}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: THEME.text }}>{e.fiscal_quarter}</span>
                  <span style={{ fontSize: 9, color: THEME.textMuted }}>{fmtDate(e.report_date)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  {[
                    ["Est.", e.eps_estimate != null ? `$${e.eps_estimate}` : "TBD"],
                    ["Act.", e.eps_actual != null ? `$${e.eps_actual}` : "—"],
                    ["Beat", e.eps_beat === true ? "✓ Yes" : e.eps_beat === false ? "✗ No" : "—"],
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
                    {e.eps_surprise_pct >= 0 ? "▲ Beat" : "▼ Miss"} {Math.abs(e.eps_surprise_pct).toFixed(1)}%
                  </div>
                )}
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="News Sentiment" muted="Pre-PDUFA and pre-earnings signal">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: THEME.surfaceAlt, border: `2px dashed ${THEME.borderStrong}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: THEME.textFaint,
            }}>—</div>
            <div style={{ fontSize: 10, color: THEME.textMuted }}>Sentiment score — coming soon</div>
          </div>
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
                    {ev.drug_name && <div style={{ fontSize: 9, color: THEME.textFaint }}>💊 {ev.drug_name}</div>}
                  </div>
                </div>
              );
            })}
          </SectionCard>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
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
  const [loading, setLoading] = useState(true);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [tickerFilter, setTickerFilter] = useState(ALL);
  const [lastSync, setLastSync] = useState(null);
  const [newEv, setNewEv] = useState({ ticker: "", date: "", event_type: "FDA", label: "" });

  const sticker = usePharmaNotes();

  const openCompany = (ticker, e) => {
    e?.stopPropagation?.();
    setSelCompany(ticker);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [evRes, erRes, lgRes] = await Promise.all([
      supabase.from("pharma_events").select("*").order("event_date"),
      supabase.from("pharma_earnings").select("*").order("report_date"),
      supabase.from("pharma_sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1),
    ]);
    if (evRes.data) setEvents(evRes.data);
    if (erRes.data) setEarnings(erRes.data);
    if (lgRes.data?.[0]) setLastSync(lgRes.data[0].synced_at);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelCompany(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const weekRows = Math.ceil((firstDay + daysInMonth) / 7);
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); setSelDay(null); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); setSelDay(null); };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelDay(today.getDate());
    setSelCompany(null);
  };
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const allItems = [
    ...events.map(e => ({ ...e, _type: "event", date: e.event_date, status: e.status })),
    ...earnings.map(e => ({
      ...e, _type: "earning", date: e.report_date, status: "earnings",
      event_type: "EARN",
      label: `${e.fiscal_quarter} Earnings (EPS est: $${e.eps_estimate ?? "TBD"})`,
      ticker: e.ticker,
    })),
  ];

  const filtered = allItems.filter(e =>
    (tickerFilter === ALL || e.ticker === tickerFilter) &&
    (typeFilter === ALL
      || (typeFilter === "EARN" && e.event_type === "EARN")
      || (typeFilter === "FDA" && e.event_type === "FDA")
      || (typeFilter === "TRIAL" && e.event_type === "TRIAL")
      || (typeFilter === "IR" && e.event_type === "IR"))
  );

  const getDayItems = (day) => filtered.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
  });

  const tickers = [ALL, ...new Set(allItems.map(e => e.ticker).sort())];
  const monthEventCount = filtered.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length;

  const monthEvents = events.filter(e => {
    const d = new Date(e.event_date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

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

  const triggerSync = async () => {
    const { error } = await supabase.functions.invoke("pharma-data-sync");
    if (!error) await loadData();
    else alert("Sync failed: " + error.message);
  };

  const EventChip = ({ ev }) => {
    const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
    const dd = dDayLabel(ev.date);
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => openCompany(ev.ticker, e)}
        onKeyDown={(e) => e.key === "Enter" && openCompany(ev.ticker, e)}
        style={{
          display: "flex", alignItems: "center", gap: 3,
          background: sm.bg, border: `1px solid ${sm.border}`,
          borderRadius: 3, padding: "2px 4px",
          overflow: "hidden", cursor: "pointer",
          transition: "box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(201,168,76,0.25)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
      >
        <span style={{ fontSize: 8, flexShrink: 0 }}>{TYPE_ICON[ev.event_type] ?? TYPE_ICON.OTHER}</span>
        <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: sm.text }}>{ev.ticker}</span>
            {dd && (
              <span style={{ fontSize: 7, fontWeight: 700, color: dDayColor(ev.date), flexShrink: 0 }}>{dd}</span>
            )}
          </div>
          <div style={{ fontSize: 7, color: sm.text, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ev._type === "earning" ? `EPS $${ev.eps_estimate ?? "TBD"}` : ev.label}
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
        <button type="button" onClick={triggerSync} style={{
          width: "100%", padding: "5px 0", background: THEME.accentSoft, border: `1px solid ${THEME.accent}`,
          color: THEME.accentText, borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: "pointer",
        }}>🔄 Sync data</button>
      </RailSection>
      <RailSection title="Add event">
        <input placeholder="Ticker" value={newEv.ticker} onChange={e => setNewEv(v => ({ ...v, ticker: e.target.value }))} style={inputStyle} />
        <input type="date" value={newEv.date} onChange={e => setNewEv(v => ({ ...v, date: e.target.value }))} style={inputStyle} />
        <select value={newEv.event_type} onChange={e => setNewEv(v => ({ ...v, event_type: e.target.value }))} style={inputStyle}>
          {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input placeholder="Label" value={newEv.label} onChange={e => setNewEv(v => ({ ...v, label: e.target.value }))} style={inputStyle} />
        <button type="button" onClick={addEvent} style={{
          width: "100%", padding: "5px 0", background: THEME.accent, color: "#0A0C14",
          border: "none", borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: "pointer",
        }}>+ Add</button>
      </RailSection>
      <RailSection title={`This month (${monthEvents.length})`}>
        {monthEvents.length === 0 && <div style={{ fontSize: 9, color: THEME.textFaint }}>No events</div>}
        {monthEvents.map(ev => {
          const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
          return (
            <div key={ev.id} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 0",
              borderBottom: `1px solid ${THEME.border}`, fontSize: 9,
            }}>
              <span style={{ fontWeight: 700, color: sm.dot, flexShrink: 0 }}>{ev.ticker}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: THEME.textMuted }}>{ev.label}</span>
              <button type="button" onClick={() => deleteEvent(ev.id)} style={{
                background: "none", border: "none", color: "#E84F4F", cursor: "pointer", fontSize: 11, padding: 0,
              }}>×</button>
            </div>
          );
        })}
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
      <input
        value={sticker.newNote}
        onChange={e => sticker.setNewNote(e.target.value)}
        onKeyDown={e => e.key === "Enter" && sticker.addNote()}
        placeholder="New sticker…"
        style={inputStyle}
      />
      <button type="button" onClick={sticker.addNote} style={{
        width: "100%", padding: "5px 0", background: THEME.accent, color: "#0A0C14",
        border: "none", borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: "pointer", marginBottom: 6,
      }}>+ Add sticker</button>
      {sticker.notes.map(note => (
        <div key={note.id} style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 0",
          borderBottom: `1px solid ${THEME.border}`, fontSize: 9,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: note.color, flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: THEME.textMuted }}>{note.content}</span>
          <button type="button" onClick={() => sticker.deleteNote(note.id)} style={{
            background: "none", border: "none", color: "#E84F4F", cursor: "pointer", fontSize: 11, padding: 0,
          }}>×</button>
        </div>
      ))}
    </RailSection>
  );

  const stickerPanelProps = {
    notes: sticker.notes,
    newNote: sticker.newNote,
    setNewNote: sticker.setNewNote,
    noteColor: sticker.noteColor,
    setNoteColor: sticker.setNoteColor,
    onAdd: sticker.addNote,
    onDelete: sticker.deleteNote,
    boardRef: sticker.boardRef,
    onMouseDown: sticker.onMouseDown,
    onMouseMove: sticker.onMouseMove,
    onMouseUp: sticker.onMouseUp,
    dragging: sticker.dragging,
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
      <AtheriumNavRail>
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
              {["All", "FDA", "EARN", "TRIAL", "IR"].map(t => (
                <button key={t} type="button" onClick={() => setTypeFilter(t)} style={{
                  padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  background: typeFilter === t ? THEME.accentSoft : "transparent",
                  border: `1px solid ${typeFilter === t ? THEME.accent : THEME.border}`,
                  color: typeFilter === t ? THEME.accentText : THEME.textMuted,
                }}>{FILTER_LABELS[t]}</button>
              ))}
              <select value={tickerFilter} onChange={e => { setTickerFilter(e.target.value); setSelDay(null); }}
                style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.text, borderRadius: 5, padding: "2px 6px", fontSize: 10, marginLeft: "auto" }}>
                {tickers.map(t => <option key={t}>{t}</option>)}
              </select>
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
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                    <div key={d} style={{ textAlign: "center", padding: "5px 0", fontSize: 10, fontWeight: 600, color: i === 0 ? "#E84F4F" : i === 6 ? "#4F8FE8" : THEME.textMuted }}>{d}</div>
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
                <CompanyDetailPanel ticker={selCompany} events={events} earnings={earnings} onClose={() => setSelCompany(null)} />
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
