// ============================================================
// CalendarPage.jsx
// Atherium Holdings — atherium.cosmonova.io
// Route: /calendar
//
// 설치: src/pages/CalendarPage.jsx 로 저장
// Router에 추가: <Route path="/calendar" element={<CalendarPage />} />
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ── 상수 ─────────────────────────────────────────────────
const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const NOTE_COLORS = ["#fef9c3","#dcfce7","#dbeafe","#fce7f3","#ede9fe","#fee2e2"];

const STATUS_META = {
  approved: { label:"승인",    dot:"#22c55e", bg:"#166534", border:"#22c55e", text:"#86efac" },
  pending:  { label:"FDA대기", dot:"#f59e0b", bg:"#78350f", border:"#f59e0b", text:"#fcd34d" },
  trial:    { label:"임상",    dot:"#06b6d4", bg:"#164e63", border:"#06b6d4", text:"#67e8f9" },
  event:    { label:"IR",      dot:"#8b5cf6", bg:"#4c1d95", border:"#8b5cf6", text:"#c4b5fd" },
  upcoming: { label:"예정",    dot:"#64748b", bg:"#1e293b", border:"#64748b", text:"#94a3b8" },
  failed:   { label:"불승인",  dot:"#ef4444", bg:"#450a0a", border:"#ef4444", text:"#fca5a5" },
  earnings: { label:"어닝콜",  dot:"#3b82f6", bg:"#1e3a8a", border:"#3b82f6", text:"#93c5fd" },
};

const TYPE_ICON = { FDA:"💊", TRIAL:"🧪", IR:"📢", EARN:"📊", OTHER:"📌" };

// ── 유틸 ─────────────────────────────────────────────────
const fmtDate  = (d) => new Date(d).toLocaleDateString("ko-KR");
const diffDays = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const getQ     = (d) => { const dt = new Date(d); return `Q${Math.ceil((dt.getMonth()+1)/3)} ${dt.getFullYear()}`; };

// ── 컴포넌트 ─────────────────────────────────────────────
export default function CalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events,    setEvents]    = useState([]);
  const [earnings,  setEarnings]  = useState([]);
  const [notes,     setNotes]     = useState([]);
  const [selDay,    setSelDay]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [typeFilter,setTypeFilter]= useState("전체");
  const [tickerFilter,setTickerFilter] = useState("전체");
  const [newNote,   setNewNote]   = useState("");
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [dragging,  setDragging]  = useState(null);
  const [lastSync,  setLastSync]  = useState(null);
  const dragOffset = useRef({ x:0, y:0 });
  const boardRef   = useRef(null);

  // ── Supabase 데이터 로드 ──────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [evRes, erRes, ntRes, lgRes] = await Promise.all([
      supabase.from("pharma_events").select("*").order("event_date"),
      supabase.from("pharma_earnings").select("*").order("report_date"),
      supabase.from("pharma_notes").select("*").order("created_at"),
      supabase.from("pharma_sync_log").select("synced_at").order("synced_at",{ascending:false}).limit(1),
    ]);
    if (evRes.data)  setEvents(evRes.data);
    if (erRes.data)  setEarnings(erRes.data);
    if (ntRes.data)  setNotes(ntRes.data);
    if (lgRes.data?.[0]) setLastSync(lgRes.data[0].synced_at);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── 캘린더 날짜 계산 ──────────────────────────────────
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonth   = () => { if(viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); setSelDay(null); };
  const nextMonth   = () => { if(viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); setSelDay(null); };

  // ── 이벤트 필터링 ─────────────────────────────────────
  const allItems = [
    ...events.map(e  => ({ ...e, _type:"event",   date: e.event_date,  status: e.status })),
    ...earnings.map(e => ({ ...e, _type:"earning", date: e.report_date, status: "earnings",
      event_type:"EARN", label:`${e.fiscal_quarter} 어닝콜 (EPS est: $${e.eps_estimate ?? "TBD"})`,
      ticker: e.ticker })),
  ];

  const filtered = allItems.filter(e =>
    (tickerFilter==="전체" || e.ticker===tickerFilter) &&
    (typeFilter==="전체"
      || (typeFilter==="EARN"  && e.event_type==="EARN")
      || (typeFilter==="FDA"   && e.event_type==="FDA")
      || (typeFilter==="TRIAL" && e.event_type==="TRIAL")
      || (typeFilter==="IR"    && e.event_type==="IR"))
  );

  const getDayItems = (day) => filtered.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear()===viewYear && d.getMonth()===viewMonth && d.getDate()===day;
  });

  const selDayItems = selDay ? getDayItems(selDay) : [];

  const upcoming = filtered
    .filter(e => new Date(e.date) >= today)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 12);

  const tickers = ["전체", ...new Set(allItems.map(e=>e.ticker).sort())];

  // ── Notes CRUD ────────────────────────────────────────
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
    dragOffset.current = { x: e.clientX-b.left-note.pos_x, y: e.clientY-b.top-note.pos_y };
    setDragging(id);
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const b = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX-b.left-dragOffset.current.x, b.width-200));
    const y = Math.max(0, Math.min(e.clientY-b.top-dragOffset.current.y, b.height-80));
    setNotes(n => n.map(note => note.id===dragging ? {...note, pos_x:x, pos_y:y} : note));
  };
  const onMouseUp = () => {
    if (dragging) {
      const note = notes.find(n => n.id === dragging);
      if (note) saveNotePos(dragging, note.pos_x, note.pos_y);
    }
    setDragging(null);
  };

  // ── 수동 Sync 트리거 ──────────────────────────────────
  const triggerSync = async () => {
    const { error } = await supabase.functions.invoke("pharma-data-sync");
    if (!error) { await loadData(); }
    else alert("Sync 실패: " + error.message);
  };

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#080d1a",color:"#64748b",fontSize:14}}>
      데이터 로딩 중...
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:"#080d1a",color:"#e2e8f0",fontFamily:"'Inter','Apple SD Gothic Neo',sans-serif",overflow:"hidden"}}>

      {/* ── LEFT SIDEBAR: 다가오는 이벤트 ── */}
      <div style={{width:240,background:"#0d1424",borderRight:"1px solid #1e3a5f",display:"flex",flexDirection:"column",flexShrink:0}}>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          style={{
            margin: "10px 14px 0",
            padding: 0,
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: 11,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          ← Dashboard
        </button>
        {/* 헤더 */}
        <div style={{padding:"14px 14px 10px",borderBottom:"1px solid #1e3a5f"}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:2}}>📅 Pharma Calendar</div>
          {lastSync && <div style={{fontSize:9,color:"#334155"}}>마지막 동기화: {new Date(lastSync).toLocaleString("ko-KR")}</div>}
        </div>

        {/* Upcoming 리스트 */}
        <div style={{flex:1,overflow:"auto",padding:"10px 10px"}}>
          <div style={{fontSize:10,fontWeight:800,color:"#334155",marginBottom:8}}>다가오는 이벤트</div>
          {upcoming.map(ev => {
            const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
            const diff = diffDays(ev.date);
            return (
              <div key={`${ev._type}-${ev.id}`} style={{marginBottom:6,padding:"8px 9px",borderRadius:7,background:"#111827",border:`1px solid ${sm.border}2a`}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                  <span style={{fontSize:11}}>{TYPE_ICON[ev.event_type]??TYPE_ICON.OTHER}</span>
                  <span style={{fontWeight:800,color:sm.dot,fontSize:11}}>{ev.ticker}</span>
                  <span style={{marginLeft:"auto",fontSize:10,fontWeight:800,
                    color:diff<=7?"#f87171":diff<=30?"#fbbf24":"#475569",
                    background:diff<=7?"#450a0a22":diff<=30?"#43140722":"transparent",
                    padding:"0 5px",borderRadius:4
                  }}>D-{diff}</span>
                </div>
                <div style={{fontSize:10,fontWeight:600,lineHeight:1.3,color:"#cbd5e1",marginBottom:2}}>{ev.label}</div>
                <div style={{fontSize:9,color:"#334155"}}>{fmtDate(ev.date)}</div>
              </div>
            );
          })}
        </div>

        {/* Sync 버튼 */}
        <div style={{padding:"10px 10px",borderTop:"1px solid #1e3a5f"}}>
          <button onClick={triggerSync} style={{
            width:"100%",padding:"7px 0",background:"#1e3a5f",border:"1px solid #3b82f6",
            color:"#93c5fd",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"
          }}>🔄 데이터 동기화</button>
        </div>
      </div>

      {/* ── MAIN: 캘린더 ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* 툴바 */}
        <div style={{background:"#0d1424",borderBottom:"1px solid #1e3a5f",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {/* 월 네비 */}
          <button onClick={prevMonth} style={{background:"#1e293b",border:"1px solid #1e3a5f",color:"#94a3b8",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14}}>‹</button>
          <span style={{fontWeight:800,fontSize:14,minWidth:100,textAlign:"center"}}>{viewYear}년 {MONTH_NAMES[viewMonth]}</span>
          <button onClick={nextMonth} style={{background:"#1e293b",border:"1px solid #1e3a5f",color:"#94a3b8",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14}}>›</button>

          <div style={{width:1,height:20,background:"#1e3a5f",margin:"0 4px"}}/>

          {/* 타입 필터 */}
          {["전체","FDA","EARN","TRIAL","IR"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding:"3px 9px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",
              background:typeFilter===t?"#1e3a5f":"transparent",
              border:`1px solid ${typeFilter===t?"#3b82f6":"#1e3a5f"}`,
              color:typeFilter===t?"#93c5fd":"#475569",
            }}>
              {t==="전체"?"전체":t==="EARN"?"📊어닝":t==="FDA"?"💊FDA":t==="TRIAL"?"🧪임상":"📢IR"}
            </button>
          ))}

          {/* 종목 필터 */}
          <select value={tickerFilter} onChange={e=>{setTickerFilter(e.target.value);setSelDay(null);}}
            style={{background:"#1e293b",border:"1px solid #1e3a5f",color:"#e2e8f0",borderRadius:6,padding:"4px 8px",fontSize:11,marginLeft:"auto"}}>
            {tickers.map(t=><option key={t}>{t}</option>)}
          </select>

          {/* 노트 패널 토글 */}
          <button onClick={() => setNotesOpen(o => !o)} style={{
            padding:"4px 11px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",
            background:notesOpen?"#4c1d95":"transparent",
            border:`1px solid ${notesOpen?"#8b5cf6":"#1e3a5f"}`,
            color:notesOpen?"#c4b5fd":"#475569",
          }}>📌 노트</button>
        </div>

        {/* 캘린더 + 노트 패널 */}
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

          {/* 캘린더 본체 */}
          <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
            {/* 요일 헤더 */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"#0d1424",borderBottom:"1px solid #1e3a5f",flexShrink:0}}>
              {["일","월","화","수","목","금","토"].map((d,i) => (
                <div key={d} style={{textAlign:"center",padding:"7px 0",fontSize:11,fontWeight:700,
                  color:i===0?"#f87171":i===6?"#60a5fa":"#475569"}}>{d}</div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(7,1fr)",gridAutoRows:"minmax(110px,1fr)"}}>
              {Array.from({length:firstDay}).map((_,i) => (
                <div key={`e${i}`} style={{background:"#080d1a",borderRight:"1px solid #0d1424",borderBottom:"1px solid #0d1424"}}/>
              ))}
              {Array.from({length:daysInMonth}).map((_,i) => {
                const day = i+1;
                const items = getDayItems(day);
                const isToday = today.getFullYear()===viewYear && today.getMonth()===viewMonth && today.getDate()===day;
                const isSel   = selDay===day;
                return (
                  <div key={day} onClick={() => setSelDay(isSel?null:day)} style={{
                    padding:"5px 5px 4px",borderRight:"1px solid #0d1424",borderBottom:"1px solid #0d1424",
                    background:isSel?"#162040":isToday?"#0f1e38":"transparent",
                    cursor:"pointer",overflow:"hidden",
                  }}>
                    {/* 날짜 숫자 */}
                    <div style={{marginBottom:4}}>
                      {isToday
                        ? <span style={{background:"#3b82f6",color:"#fff",borderRadius:99,width:20,height:20,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{day}</span>
                        : <span style={{fontSize:11,fontWeight:400,color:"#475569"}}>{day}</span>
                      }
                    </div>
                    {/* 이벤트 뱃지 */}
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      {items.map(ev => {
                        const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
                        return (
                          <div key={`${ev._type}-${ev.id}`} style={{
                            display:"flex",alignItems:"center",gap:2,
                            background:sm.bg,border:`1px solid ${sm.border}`,
                            borderRadius:4,padding:"2px 4px",overflow:"hidden",
                          }}>
                            <span style={{fontSize:9,flexShrink:0}}>{TYPE_ICON[ev.event_type]??TYPE_ICON.OTHER}</span>
                            <div style={{overflow:"hidden",minWidth:0}}>
                              <div style={{fontSize:9,fontWeight:800,color:sm.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                {ev.ticker}
                              </div>
                              <div style={{fontSize:8,color:sm.text,opacity:0.75,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                {ev._type==="earning"
                                  ? `어닝콜 EPS $${ev.eps_estimate??'TBD'}`
                                  : ev.label
                                }
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 선택된 날 상세 */}
            {selDay && selDayItems.length > 0 && (
              <div style={{background:"#0d1424",borderTop:"1px solid #1e3a5f",padding:"12px 16px",flexShrink:0}}>
                <div style={{fontWeight:700,fontSize:12,color:"#64748b",marginBottom:10}}>
                  {viewMonth+1}월 {selDay}일 — {selDayItems.length}건
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {selDayItems.map(ev => {
                    const sm = STATUS_META[ev.status] ?? STATUS_META.upcoming;
                    const isEarn = ev._type === "earning";
                    return (
                      <div key={`${ev._type}-${ev.id}`} style={{
                        padding:"10px 12px",borderRadius:8,background:"#080d1a",
                        border:`1px solid ${sm.border}44`,minWidth:220,maxWidth:300,flex:"1 1 220px"
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <span style={{fontSize:13}}>{TYPE_ICON[ev.event_type]??TYPE_ICON.OTHER}</span>
                          <span style={{fontWeight:800,fontSize:13,color:sm.dot}}>{ev.ticker}</span>
                          <span style={{fontSize:9,padding:"2px 6px",borderRadius:99,background:sm.bg,color:sm.text,border:`1px solid ${sm.border}`,fontWeight:700}}>{sm.label}</span>
                        </div>
                        {isEarn ? (
                          <>
                            <div style={{fontWeight:700,fontSize:11,marginBottom:4}}>{ev.fiscal_quarter} 실적 발표</div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                              {[
                                ["EPS 예상", ev.eps_estimate ? `$${ev.eps_estimate}` : "TBD"],
                                ["EPS 실제", ev.eps_actual !== null ? `$${ev.eps_actual}` : "미발표"],
                                ["매출 예상", ev.rev_estimate ? `$${(ev.rev_estimate/1e3).toFixed(1)}B` : "TBD"],
                                ["매출 실제", ev.rev_actual !== null ? `$${(ev.rev_actual/1e3).toFixed(1)}B` : "미발표"],
                              ].map(([k,v]) => (
                                <div key={k} style={{background:"#0d1424",borderRadius:4,padding:"4px 6px"}}>
                                  <div style={{fontSize:8,color:"#475569"}}>{k}</div>
                                  <div style={{fontSize:11,fontWeight:700,color:
                                    k.includes("실제") && ev.eps_beat===true ? "#22c55e" :
                                    k.includes("실제") && ev.eps_beat===false ? "#ef4444" : "#e2e8f0"
                                  }}>{v}</div>
                                </div>
                              ))}
                            </div>
                            {ev.eps_surprise_pct !== null && (
                              <div style={{marginTop:4,fontSize:10,fontWeight:700,
                                color:ev.eps_surprise_pct>=0?"#22c55e":"#ef4444"}}>
                                {ev.eps_surprise_pct>=0?"▲ Beat":"▼ Miss"} {Math.abs(ev.eps_surprise_pct).toFixed(1)}%
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{fontWeight:700,fontSize:11,marginBottom:3}}>{ev.label}</div>
                            {ev.indication && <div style={{fontSize:10,color:"#64748b"}}>🎯 {ev.indication}</div>}
                            {ev.drug_name   && <div style={{fontSize:10,color:"#64748b"}}>💊 {ev.drug_name}</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── NOTES 슬라이드 패널 ── */}
          <div style={{
            width: notesOpen ? 320 : 0,
            transition:"width 0.25s ease",
            overflow:"hidden",flexShrink:0,
            background:"#0d1424",borderLeft:"1px solid #1e3a5f",
            display:"flex",flexDirection:"column",
          }}>
            <div style={{width:320,height:"100%",display:"flex",flexDirection:"column"}}>
              {/* 노트 입력 */}
              <div style={{padding:"12px",borderBottom:"1px solid #1e3a5f",flexShrink:0}}>
                <div style={{fontWeight:800,fontSize:12,marginBottom:8}}>📌 투자 메모</div>
                <div style={{display:"flex",gap:4,marginBottom:8}}>
                  {NOTE_COLORS.map(c => (
                    <div key={c} onClick={() => setNoteColor(c)} style={{
                      width:18,height:18,borderRadius:"50%",background:c,cursor:"pointer",
                      border:noteColor===c?"2.5px solid #3b82f6":"2px solid transparent",flexShrink:0
                    }}/>
                  ))}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <input value={newNote} onChange={e=>setNewNote(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addNote()}
                    placeholder="메모 입력 후 Enter"
                    style={{flex:1,background:"#080d1a",border:"1px solid #1e3a5f",color:"#e2e8f0",
                      borderRadius:6,padding:"5px 8px",fontSize:11}}/>
                  <button onClick={addNote} style={{background:"#3b82f6",color:"#fff",border:"none",
                    borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontWeight:700}}>+</button>
                </div>
              </div>

              {/* 드래그 보드 */}
              <div ref={boardRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                style={{flex:1,position:"relative",background:"#080d1a",overflow:"hidden"}}>
                {notes.length===0 && (
                  <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                    color:"#1e3a5f",fontSize:11,textAlign:"center"}}>메모를 추가하세요</div>
                )}
                {notes.map(note => (
                  <div key={note.id} onMouseDown={e=>onMouseDown(e,note.id)} style={{
                    position:"absolute",left:note.pos_x,top:note.pos_y,
                    background:note.color,color:"#1e293b",borderRadius:8,
                    padding:"8px 26px 8px 10px",width:180,
                    fontSize:11,fontWeight:500,cursor:"grab",lineHeight:1.5,
                    boxShadow:"3px 5px 16px rgba(0,0,0,0.5)",userSelect:"none",
                    zIndex:dragging===note.id?100:1,
                  }}>
                    <button onClick={()=>deleteNote(note.id)} style={{
                      position:"absolute",top:4,right:6,background:"none",border:"none",
                      cursor:"pointer",fontSize:13,color:"#64748b"}}>×</button>
                    {note.ticker_tag && (
                      <span style={{fontSize:9,fontWeight:800,background:"#1e293b",color:"#94a3b8",
                        borderRadius:4,padding:"1px 5px",marginBottom:4,display:"inline-block"}}>
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
