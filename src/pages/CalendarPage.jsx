import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const NOTE_COLORS = ["#fef9c3","#dcfce7","#dbeafe","#fce7f3","#ede9fe","#fee2e2"];
const ALL = "All";

const THEME = {
  bg: "#eef2f7",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  surfaceHover: "#f1f5f9",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  text: "#0f172a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  accent: "#2563eb",
  accentSoft: "#dbeafe",
  accentText: "#1d4ed8",
  today: "#2563eb",
  selDay: "#eff6ff",
};

const STATUS_META = {
  approved: { label:"Approved", dot:"#16a34a", bg:"#dcfce7", border:"#86efac", text:"#166534" },
  pending:  { label:"FDA Pending", dot:"#d97706", bg:"#fef3c7", border:"#fcd34d", text:"#92400e" },
  trial:    { label:"Trial", dot:"#0891b2", bg:"#cffafe", border:"#67e8f9", text:"#155e75" },
  event:    { label:"IR", dot:"#7c3aed", bg:"#ede9fe", border:"#c4b5fd", text:"#5b21b6" },
  upcoming: { label:"Upcoming", dot:"#64748b", bg:"#f1f5f9", border:"#cbd5e1", text:"#475569" },
  failed:   { label:"Failed", dot:"#dc2626", bg:"#fee2e2", border:"#fca5a5", text:"#991b1b" },
  earnings: { label:"Earnings", dot:"#2563eb", bg:"#dbeafe", border:"#93c5fd", text:"#1e40af" },
};

const TYPE_ICON = { FDA:"💊", TRIAL:"🧪", IR:"📢", EARN:"📊", OTHER:"📌" };
const FILTER_LABELS = { All: "All", FDA: "💊 FDA", EARN: "📊 Earnings", TRIAL: "🧪 Trial", IR: "📢 IR" };

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const diffDays = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

function PriorityBadge({ level }) {
  const styles = {
    P1: { bg: "#fef3c7", color: "#92400e", label: "P1" },
    P2: { bg: "#e0e7ff", color: "#3730a3", label: "P2" },
    bonus: { bg: "#f3e8ff", color: "#6b21a8", label: "Bonus" },
  };
  const s = styles[level];
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
      background: s.bg, color: s.color, letterSpacing: 0.3,
    }}>{s.label}</span>
  );
}

function SectionCard({ title, priority, children, apiLabel }) {
  return (
    <div style={{
      background: THEME.surface, border: `1px solid ${THEME.border}`,
      borderRadius: 8, padding: "10px 12px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {priority && <PriorityBadge level={priority} />}
        <span style={{ fontWeight: 700, fontSize: 11, color: THEME.text }}>{title}</span>
        {apiLabel && (
          <span style={{ marginLeft: "auto", fontSize: 8, color: THEME.textFaint, fontFamily: "monospace" }}>{apiLabel}</span>
        )}
      </div>
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

function CompanyDetailPanel({ ticker, events, earnings, onClose }) {
  const companyEvents = events.filter(e => e.ticker === ticker)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const companyEarnings = earnings.filter(e => e.ticker === ticker)
    .sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
  const companyName = companyEarnings[0]?.company_name || companyEvents[0]?.company_name || ticker;
  const upcomingEarn = companyEarnings.filter(e => new Date(e.report_date) >= new Date());
  const pastEarn = companyEarnings.filter(e => new Date(e.report_date) < new Date());

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
        </div>
        <button type="button" onClick={onClose} style={{
          background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
          borderRadius: 5, width: 26, height: 26, cursor: "pointer",
          color: THEME.textMuted, fontSize: 16, lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>

        <SectionCard title="Live Quote" priority="P2" apiLabel="GLOBAL_QUOTE">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <PlaceholderField label="Price" hint="—" />
            <PlaceholderField label="Change %" hint="—" />
          </div>
          <div style={{ fontSize: 9, color: THEME.textFaint, marginTop: 6 }}>
            Shown next to ticker in calendar once synced.
          </div>
        </SectionCard>

        <SectionCard title="Company Overview" priority="bonus" apiLabel="OVERVIEW">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <PlaceholderField label="Market Cap" />
            <PlaceholderField label="P/E Ratio" />
            <PlaceholderField label="Sector" />
            <PlaceholderField label="Industry" />
          </div>
        </SectionCard>

        <SectionCard title="Earnings Calendar" priority="P1" apiLabel="EARNINGS_CALENDAR">
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
                  color: diffDays(e.report_date) <= 7 ? "#dc2626" : THEME.textMuted,
                }}>D-{diffDays(e.report_date)}</span>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Earnings History" priority="P1" apiLabel="EARNINGS">
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
                        color: k === "Beat" && e.eps_beat === true ? "#16a34a" : k === "Beat" && e.eps_beat === false ? "#dc2626" : THEME.text,
                      }}>{v}</div>
                    </div>
                  ))}
                </div>
                {e.eps_surprise_pct != null && (
                  <div style={{
                    marginTop: 4, fontSize: 9, fontWeight: 600, textAlign: "center",
                    color: e.eps_surprise_pct >= 0 ? "#16a34a" : "#dc2626",
                  }}>
                    {e.eps_surprise_pct >= 0 ? "▲ Beat" : "▼ Miss"} {Math.abs(e.eps_surprise_pct).toFixed(1)}%
                  </div>
                )}
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="News Sentiment" priority="P2" apiLabel="NEWS_SENTIMENT">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: THEME.surfaceAlt, border: `2px dashed ${THEME.borderStrong}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: THEME.textFaint,
            }}>—</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: THEME.textMuted }}>Sentiment score</div>
              <div style={{ fontSize: 9, color: THEME.textFaint, marginTop: 2 }}>
                Pre-PDUFA / pre-earnings signal
              </div>
            </div>
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
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selDay, setSelDay] = useState(null);
  const [selCompany, setSelCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [tickerFilter, setTickerFilter] = useState(ALL);
  const [newNote, setNewNote] = useState("");
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [dragging, setDragging] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const boardRef = useRef(null);

  const openCompany = (ticker, e) => {
    e?.stopPropagation?.();
    setSelCompany(ticker);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [evRes, erRes, ntRes, lgRes] = await Promise.all([
      supabase.from("pharma_events").select("*").order("event_date"),
      supabase.from("pharma_earnings").select("*").order("report_date"),
      supabase.from("pharma_notes").select("*").order("created_at"),
      supabase.from("pharma_sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1),
    ]);
    if (evRes.data) setEvents(evRes.data);
    if (erRes.data) setEarnings(erRes.data);
    if (ntRes.data) setNotes(ntRes.data);
    if (lgRes.data?.[0]) setLastSync(lgRes.data[0].synced_at);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); setSelDay(null); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); setSelDay(null); };

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

  const selDayItems = selDay ? getDayItems(selDay) : [];
  const upcoming = filtered.filter(e => new Date(e.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10);
  const tickers = [ALL, ...new Set(allItems.map(e => e.ticker).sort())];

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data } = await supabase.from("pharma_notes")
      .insert({ content: newNote, color: noteColor, pos_x: 30, pos_y: 30 })
      .select().single();
    if (data) setNotes(n => [...n, data]);
    setNewNote("");
  };

  const deleteNote = async (id) => {
    await supabase.from("pharma_notes").delete().eq("id", id);
    setNotes(n => n.filter(note => note.id !== id));
  };

  const saveNotePos = async (id, x, y) => {
    await supabase.from("pharma_notes").update({ pos_x: x, pos_y: y }).eq("id", id);
  };

  const onMouseDown = (e, id) => {
    const b = boardRef.current.getBoundingClientRect();
    const note = notes.find(n => n.id === id);
    dragOffset.current = { x: e.clientX - b.left - note.pos_x, y: e.clientY - b.top - note.pos_y };
    setDragging(id);
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const b = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - b.left - dragOffset.current.x, b.width - 160));
    const y = Math.max(0, Math.min(e.clientY - b.top - dragOffset.current.y, b.height - 64));
    setNotes(n => n.map(note => note.id === dragging ? { ...note, pos_x: x, pos_y: y } : note));
  };
  const onMouseUp = () => {
    if (dragging) {
      const note = notes.find(n => n.id === dragging);
      if (note) saveNotePos(dragging, note.pos_x, note.pos_y);
    }
    setDragging(null);
  };

  const triggerSync = async () => {
    const { error } = await supabase.functions.invoke("pharma-data-sync");
    if (!error) await loadData();
    else alert("Sync failed: " + error.message);
  };

  const EventChip = ({ ev, compact }) => {
    const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => openCompany(ev.ticker, e)}
        onKeyDown={(e) => e.key === "Enter" && openCompany(ev.ticker, e)}
        style={{
          display: "flex", alignItems: "center", gap: compact ? 2 : 4,
          background: sm.bg, border: `1px solid ${sm.border}`,
          borderRadius: compact ? 3 : 5, padding: compact ? "1px 3px" : "4px 6px",
          overflow: "hidden", cursor: "pointer",
          transition: "box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
      >
        <span style={{ fontSize: compact ? 8 : 10, flexShrink: 0 }}>{TYPE_ICON[ev.event_type] ?? TYPE_ICON.OTHER}</span>
        <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: sm.text }}>{ev.ticker}</span>
            {!compact && (
              <span style={{ fontSize: 8, color: THEME.textFaint }}>$— <span style={{ color: THEME.textMuted }}>(—%)</span></span>
            )}
          </div>
          <div style={{ fontSize: compact ? 7 : 9, color: sm.text, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ev._type === "earning" ? `EPS $${ev.eps_estimate ?? "TBD"}` : ev.label}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: THEME.bg, color: THEME.textMuted, fontSize: 13 }}>
        Loading calendar…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: THEME.bg, color: THEME.text, fontFamily: "'Inter', sans-serif", overflow: "hidden", fontSize: 12 }}>

      {/* Left sidebar */}
      <div style={{ width: 200, background: THEME.surface, borderRight: `1px solid ${THEME.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "10px 10px 8px", borderBottom: `1px solid ${THEME.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: THEME.text }}>📅 Calendar</div>
          {lastSync && (
            <div style={{ fontSize: 9, color: THEME.textFaint, marginTop: 2 }}>
              Last sync: {new Date(lastSync).toLocaleString("en-US")}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: THEME.textFaint, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Upcoming</div>
          {upcoming.map(ev => {
            const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
            const diff = diffDays(ev.date);
            return (
              <div
                key={`${ev._type}-${ev.id}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelCompany(ev.ticker)}
                onKeyDown={(e) => e.key === "Enter" && setSelCompany(ev.ticker)}
                style={{
                  marginBottom: 5, padding: "6px 7px", borderRadius: 6,
                  background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 10 }}>{TYPE_ICON[ev.event_type] ?? TYPE_ICON.OTHER}</span>
                  <span style={{ fontWeight: 700, color: sm.dot, fontSize: 10 }}>{ev.ticker}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 9, fontWeight: 700,
                    color: diff <= 7 ? "#dc2626" : diff <= 30 ? "#d97706" : THEME.textFaint,
                    padding: "0 4px", borderRadius: 3,
                  }}>D-{diff}</span>
                </div>
                <div style={{ fontSize: 9, fontWeight: 500, lineHeight: 1.25, color: THEME.textMuted, marginBottom: 1 }}>{ev.label}</div>
                <div style={{ fontSize: 8, color: THEME.textFaint }}>{fmtDate(ev.date)}</div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "8px", borderTop: `1px solid ${THEME.border}` }}>
          <button type="button" onClick={triggerSync} style={{
            width: "100%", padding: "5px 0", background: THEME.accentSoft, border: `1px solid ${THEME.accent}`,
            color: THEME.accentText, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>🔄 Sync data</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{ background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button type="button" onClick={prevMonth} style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.textMuted, borderRadius: 5, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 12, minWidth: 110, textAlign: "center" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button type="button" onClick={nextMonth} style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.textMuted, borderRadius: 5, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>›</button>

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

          <button type="button" onClick={() => setNotesOpen(o => !o)} style={{
            padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
            background: notesOpen ? "#ede9fe" : "transparent",
            border: `1px solid ${notesOpen ? "#8b5cf6" : THEME.border}`,
            color: notesOpen ? "#6d28d9" : THEME.textMuted,
          }}>📌 Notes</button>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Calendar grid */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <div key={d} style={{ textAlign: "center", padding: "4px 0", fontSize: 10, fontWeight: 600, color: i === 0 ? "#dc2626" : i === 6 ? THEME.accentText : THEME.textMuted }}>{d}</div>
              ))}
            </div>

            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(72px, 1fr)", background: THEME.surface }}>
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
                    padding: "3px 3px 2px", borderRight: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}`,
                    background: isSel ? THEME.selDay : isToday ? "#f0f7ff" : THEME.surface,
                    cursor: "pointer", overflow: "hidden",
                  }}>
                    <div style={{ marginBottom: 2 }}>
                      {isToday
                        ? <span style={{ background: THEME.today, color: "#fff", borderRadius: 99, width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{day}</span>
                        : <span style={{ fontSize: 10, color: THEME.textMuted }}>{day}</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {items.slice(0, 3).map(ev => (
                        <EventChip key={`${ev._type}-${ev.id}`} ev={ev} compact />
                      ))}
                      {items.length > 3 && <div style={{ fontSize: 7, color: THEME.textFaint, paddingLeft: 2 }}>+{items.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {selDay && selDayItems.length > 0 && (
              <div style={{ background: THEME.surface, borderTop: `1px solid ${THEME.border}`, padding: "8px 12px", flexShrink: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 11, color: THEME.textMuted, marginBottom: 8 }}>
                  {MONTH_NAMES[viewMonth]} {selDay} — {selDayItems.length} event{selDayItems.length !== 1 ? "s" : ""}
                  <span style={{ fontWeight: 400, fontSize: 9, marginLeft: 8, color: THEME.textFaint }}>Click a company for details</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selDayItems.map(ev => (
                    <div key={`${ev._type}-${ev.id}`} style={{ minWidth: 160, maxWidth: 240, flex: "1 1 160px" }}>
                      <EventChip ev={ev} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Company detail panel */}
          {selCompany && (
            <CompanyDetailPanel
              ticker={selCompany}
              events={events}
              earnings={earnings}
              onClose={() => setSelCompany(null)}
            />
          )}

          {/* Notes panel */}
          <div style={{
            width: notesOpen ? 260 : 0,
            transition: "width 0.2s ease",
            overflow: "hidden", flexShrink: 0,
            background: THEME.surface, borderLeft: `1px solid ${THEME.border}`,
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ width: 260, height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px", borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>📌 Notes</div>
                <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                  {NOTE_COLORS.map(c => (
                    <div key={c} onClick={() => setNoteColor(c)} style={{
                      width: 16, height: 16, borderRadius: "50%", background: c, cursor: "pointer",
                      border: noteColor === c ? `2px solid ${THEME.accent}` : "2px solid transparent", flexShrink: 0,
                    }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={newNote} onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addNote()}
                    placeholder="Add note, press Enter"
                    style={{ flex: 1, background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.text, borderRadius: 5, padding: "4px 6px", fontSize: 10 }} />
                  <button type="button" onClick={addNote} style={{ background: THEME.accent, color: "#fff", border: "none", borderRadius: 5, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>+</button>
                </div>
              </div>

              <div ref={boardRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                style={{ flex: 1, position: "relative", background: THEME.surfaceAlt, overflow: "hidden" }}>
                {notes.length === 0 && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: THEME.textFaint, fontSize: 10, textAlign: "center" }}>Add a note</div>
                )}
                {notes.map(note => (
                  <div key={note.id} onMouseDown={e => onMouseDown(e, note.id)} style={{
                    position: "absolute", left: note.pos_x, top: note.pos_y,
                    background: note.color, color: "#1e293b", borderRadius: 6,
                    padding: "6px 22px 6px 8px", width: 150,
                    fontSize: 10, fontWeight: 500, cursor: "grab", lineHeight: 1.4,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)", userSelect: "none",
                    zIndex: dragging === note.id ? 100 : 1,
                  }}>
                    <button type="button" onClick={() => deleteNote(note.id)} style={{
                      position: "absolute", top: 3, right: 5, background: "none", border: "none",
                      cursor: "pointer", fontSize: 12, color: "#64748b",
                    }}>×</button>
                    {note.ticker_tag && (
                      <span style={{ fontSize: 8, fontWeight: 700, background: "#e2e8f0", color: "#475569", borderRadius: 3, padding: "1px 4px", marginBottom: 3, display: "inline-block" }}>
                        {note.ticker_tag}
                      </span>
                    )}
                    <div>{note.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
