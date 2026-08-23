import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const NOTE_COLORS = ["#fef9c3","#dcfce7","#dbeafe","#fce7f3","#ede9fe","#fee2e2"];
const ALL = "All";

const STATUS_META = {
  approved: { label:"Approved", dot:"#22c55e", bg:"#166534", border:"#22c55e", text:"#86efac" },
  pending:  { label:"FDA Pending", dot:"#f59e0b", bg:"#78350f", border:"#f59e0b", text:"#fcd34d" },
  trial:    { label:"Trial", dot:"#06b6d4", bg:"#164e63", border:"#06b6d4", text:"#67e8f9" },
  event:    { label:"IR", dot:"#8b5cf6", bg:"#4c1d95", border:"#8b5cf6", text:"#c4b5fd" },
  upcoming: { label:"Upcoming", dot:"#64748b", bg:"#1e293b", border:"#64748b", text:"#94a3b8" },
  failed:   { label:"Failed", dot:"#ef4444", bg:"#450a0a", border:"#ef4444", text:"#fca5a5" },
  earnings: { label:"Earnings", dot:"#3b82f6", bg:"#1e3a8a", border:"#3b82f6", text:"#93c5fd" },
};

const TYPE_ICON = { FDA:"💊", TRIAL:"🧪", IR:"📢", EARN:"📊", OTHER:"📌" };
const FILTER_LABELS = { All: "All", FDA: "💊 FDA", EARN: "📊 Earnings", TRIAL: "🧪 Trial", IR: "📢 IR" };

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const diffDays = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

export default function CalendarPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selDay, setSelDay] = useState(null);
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

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#080d1a", color: "#64748b", fontSize: 13 }}>
        Loading calendar…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#080d1a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif", overflow: "hidden", fontSize: 12 }}>

      {/* Left sidebar */}
      <div style={{ width: 200, background: "#0d1424", borderRight: "1px solid #1e3a5f", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid #1e3a5f" }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>📅 Calendar</div>
          {lastSync && (
            <div style={{ fontSize: 9, color: "#334155", marginTop: 2 }}>
              Last sync: {new Date(lastSync).toLocaleString("en-US")}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#334155", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Upcoming</div>
          {upcoming.map(ev => {
            const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
            const diff = diffDays(ev.date);
            return (
              <div key={`${ev._type}-${ev.id}`} style={{ marginBottom: 5, padding: "6px 7px", borderRadius: 6, background: "#111827", border: `1px solid ${sm.border}2a` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 10 }}>{TYPE_ICON[ev.event_type] ?? TYPE_ICON.OTHER}</span>
                  <span style={{ fontWeight: 700, color: sm.dot, fontSize: 10 }}>{ev.ticker}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 9, fontWeight: 700,
                    color: diff <= 7 ? "#f87171" : diff <= 30 ? "#fbbf24" : "#475569",
                    padding: "0 4px", borderRadius: 3,
                  }}>D-{diff}</span>
                </div>
                <div style={{ fontSize: 9, fontWeight: 500, lineHeight: 1.25, color: "#cbd5e1", marginBottom: 1 }}>{ev.label}</div>
                <div style={{ fontSize: 8, color: "#334155" }}>{fmtDate(ev.date)}</div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "8px", borderTop: "1px solid #1e3a5f" }}>
          <button type="button" onClick={triggerSync} style={{
            width: "100%", padding: "5px 0", background: "#1e3a5f", border: "1px solid #3b82f6",
            color: "#93c5fd", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>🔄 Sync data</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Toolbar */}
        <div style={{ background: "#0d1424", borderBottom: "1px solid #1e3a5f", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button type="button" onClick={prevMonth} style={{ background: "#1e293b", border: "1px solid #1e3a5f", color: "#94a3b8", borderRadius: 5, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 12, minWidth: 110, textAlign: "center" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button type="button" onClick={nextMonth} style={{ background: "#1e293b", border: "1px solid #1e3a5f", color: "#94a3b8", borderRadius: 5, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>›</button>

          <div style={{ width: 1, height: 16, background: "#1e3a5f", margin: "0 2px" }} />

          {["All", "FDA", "EARN", "TRIAL", "IR"].map(t => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)} style={{
              padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
              background: typeFilter === t ? "#1e3a5f" : "transparent",
              border: `1px solid ${typeFilter === t ? "#3b82f6" : "#1e3a5f"}`,
              color: typeFilter === t ? "#93c5fd" : "#475569",
            }}>{FILTER_LABELS[t]}</button>
          ))}

          <select value={tickerFilter} onChange={e => { setTickerFilter(e.target.value); setSelDay(null); }}
            style={{ background: "#1e293b", border: "1px solid #1e3a5f", color: "#e2e8f0", borderRadius: 5, padding: "2px 6px", fontSize: 10, marginLeft: "auto" }}>
            {tickers.map(t => <option key={t}>{t}</option>)}
          </select>

          <button type="button" onClick={() => setNotesOpen(o => !o)} style={{
            padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
            background: notesOpen ? "#4c1d95" : "transparent",
            border: `1px solid ${notesOpen ? "#8b5cf6" : "#1e3a5f"}`,
            color: notesOpen ? "#c4b5fd" : "#475569",
          }}>📌 Notes</button>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Calendar grid */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#0d1424", borderBottom: "1px solid #1e3a5f", flexShrink: 0 }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <div key={d} style={{ textAlign: "center", padding: "4px 0", fontSize: 10, fontWeight: 600, color: i === 0 ? "#f87171" : i === 6 ? "#60a5fa" : "#475569" }}>{d}</div>
              ))}
            </div>

            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(72px, 1fr)" }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e${i}`} style={{ background: "#080d1a", borderRight: "1px solid #0d1424", borderBottom: "1px solid #0d1424" }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const items = getDayItems(day);
                const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                const isSel = selDay === day;
                return (
                  <div key={day} onClick={() => setSelDay(isSel ? null : day)} style={{
                    padding: "3px 3px 2px", borderRight: "1px solid #0d1424", borderBottom: "1px solid #0d1424",
                    background: isSel ? "#162040" : isToday ? "#0f1e38" : "transparent",
                    cursor: "pointer", overflow: "hidden",
                  }}>
                    <div style={{ marginBottom: 2 }}>
                      {isToday
                        ? <span style={{ background: "#3b82f6", color: "#fff", borderRadius: 99, width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{day}</span>
                        : <span style={{ fontSize: 10, color: "#475569" }}>{day}</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {items.slice(0, 3).map(ev => {
                        const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
                        return (
                          <div key={`${ev._type}-${ev.id}`} style={{
                            display: "flex", alignItems: "center", gap: 2,
                            background: sm.bg, border: `1px solid ${sm.border}`,
                            borderRadius: 3, padding: "1px 3px", overflow: "hidden",
                          }}>
                            <span style={{ fontSize: 8, flexShrink: 0 }}>{TYPE_ICON[ev.event_type] ?? TYPE_ICON.OTHER}</span>
                            <div style={{ overflow: "hidden", minWidth: 0 }}>
                              <div style={{ fontSize: 8, fontWeight: 700, color: sm.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.ticker}</div>
                              <div style={{ fontSize: 7, color: sm.text, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {ev._type === "earning" ? `EPS $${ev.eps_estimate ?? "TBD"}` : ev.label}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {items.length > 3 && <div style={{ fontSize: 7, color: "#475569", paddingLeft: 2 }}>+{items.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {selDay && selDayItems.length > 0 && (
              <div style={{ background: "#0d1424", borderTop: "1px solid #1e3a5f", padding: "8px 12px", flexShrink: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                  {MONTH_NAMES[viewMonth]} {selDay} — {selDayItems.length} event{selDayItems.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selDayItems.map(ev => {
                    const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
                    const isEarn = ev._type === "earning";
                    return (
                      <div key={`${ev._type}-${ev.id}`} style={{
                        padding: "8px 10px", borderRadius: 6, background: "#080d1a",
                        border: `1px solid ${sm.border}44`, minWidth: 180, maxWidth: 260, flex: "1 1 180px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                          <span style={{ fontSize: 11 }}>{TYPE_ICON[ev.event_type] ?? TYPE_ICON.OTHER}</span>
                          <span style={{ fontWeight: 700, fontSize: 11, color: sm.dot }}>{ev.ticker}</span>
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 99, background: sm.bg, color: sm.text, border: `1px solid ${sm.border}`, fontWeight: 600 }}>{sm.label}</span>
                        </div>
                        {isEarn ? (
                          <>
                            <div style={{ fontWeight: 600, fontSize: 10, marginBottom: 3 }}>{ev.fiscal_quarter} Earnings Report</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
                              {[
                                ["EPS Est.", ev.eps_estimate ? `$${ev.eps_estimate}` : "TBD"],
                                ["EPS Act.", ev.eps_actual !== null ? `$${ev.eps_actual}` : "Pending"],
                                ["Rev Est.", ev.rev_estimate ? `$${(ev.rev_estimate / 1e3).toFixed(1)}B` : "TBD"],
                                ["Rev Act.", ev.rev_actual !== null ? `$${(ev.rev_actual / 1e3).toFixed(1)}B` : "Pending"],
                              ].map(([k, v]) => (
                                <div key={k} style={{ background: "#0d1424", borderRadius: 3, padding: "3px 5px" }}>
                                  <div style={{ fontSize: 7, color: "#475569" }}>{k}</div>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: k.includes("Act.") && ev.eps_beat === true ? "#22c55e" : k.includes("Act.") && ev.eps_beat === false ? "#ef4444" : "#e2e8f0" }}>{v}</div>
                                </div>
                              ))}
                            </div>
                            {ev.eps_surprise_pct !== null && (
                              <div style={{ marginTop: 3, fontSize: 9, fontWeight: 600, color: ev.eps_surprise_pct >= 0 ? "#22c55e" : "#ef4444" }}>
                                {ev.eps_surprise_pct >= 0 ? "▲ Beat" : "▼ Miss"} {Math.abs(ev.eps_surprise_pct).toFixed(1)}%
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 600, fontSize: 10, marginBottom: 2 }}>{ev.label}</div>
                            {ev.indication && <div style={{ fontSize: 9, color: "#64748b" }}>🎯 {ev.indication}</div>}
                            {ev.drug_name && <div style={{ fontSize: 9, color: "#64748b" }}>💊 {ev.drug_name}</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notes panel */}
          <div style={{
            width: notesOpen ? 260 : 0,
            transition: "width 0.2s ease",
            overflow: "hidden", flexShrink: 0,
            background: "#0d1424", borderLeft: "1px solid #1e3a5f",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ width: 260, height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px", borderBottom: "1px solid #1e3a5f", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>📌 Notes</div>
                <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                  {NOTE_COLORS.map(c => (
                    <div key={c} onClick={() => setNoteColor(c)} style={{
                      width: 16, height: 16, borderRadius: "50%", background: c, cursor: "pointer",
                      border: noteColor === c ? "2px solid #3b82f6" : "2px solid transparent", flexShrink: 0,
                    }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={newNote} onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addNote()}
                    placeholder="Add note, press Enter"
                    style={{ flex: 1, background: "#080d1a", border: "1px solid #1e3a5f", color: "#e2e8f0", borderRadius: 5, padding: "4px 6px", fontSize: 10 }} />
                  <button type="button" onClick={addNote} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 5, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>+</button>
                </div>
              </div>

              <div ref={boardRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                style={{ flex: 1, position: "relative", background: "#080d1a", overflow: "hidden" }}>
                {notes.length === 0 && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#1e3a5f", fontSize: 10, textAlign: "center" }}>Add a note</div>
                )}
                {notes.map(note => (
                  <div key={note.id} onMouseDown={e => onMouseDown(e, note.id)} style={{
                    position: "absolute", left: note.pos_x, top: note.pos_y,
                    background: note.color, color: "#1e293b", borderRadius: 6,
                    padding: "6px 22px 6px 8px", width: 150,
                    fontSize: 10, fontWeight: 500, cursor: "grab", lineHeight: 1.4,
                    boxShadow: "2px 3px 12px rgba(0,0,0,0.4)", userSelect: "none",
                    zIndex: dragging === note.id ? 100 : 1,
                  }}>
                    <button type="button" onClick={() => deleteNote(note.id)} style={{
                      position: "absolute", top: 3, right: 5, background: "none", border: "none",
                      cursor: "pointer", fontSize: 12, color: "#64748b",
                    }}>×</button>
                    {note.ticker_tag && (
                      <span style={{ fontSize: 8, fontWeight: 700, background: "#1e293b", color: "#94a3b8", borderRadius: 3, padding: "1px 4px", marginBottom: 3, display: "inline-block" }}>
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
