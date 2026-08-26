import { useState, useRef, useEffect } from 'react'

const NOTE_COLORS = ['#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3', '#ede9fe', '#fee2e2']
export const DEFAULT_NOTE_WIDTH = 140
export const DEFAULT_NOTE_HEIGHT = 100

const THEME = {
  surface: '#151929',
  surfaceAlt: '#1C2235',
  border: 'rgba(201,168,76,0.15)',
  text: '#D4DCF0',
  textMuted: '#8892AA',
  textFaint: '#5A6478',
  accent: '#C9A84C',
  accentText: '#E8D08A',
  surfaceHover: '#252D45',
}

export { NOTE_COLORS as STICKER_COLORS }

export default function StickersPanel({
  notes,
  noteColor,
  setNoteColor,
  onAdd,
  onDelete,
  onUpdateContent,
  boardRef,
  onMouseMove,
  onMouseUp,
  onMouseDown,
  onResizeMouseDown,
  dragging,
  resizing,
  width = 280,
  fullWidth = false,
  hideControls = false,
  title = '📌 Stickers',
  showBoard = true,
  listOnly = false,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const editRef = useRef(null)

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editingId])

  const noteW = (n) => n.width ?? DEFAULT_NOTE_WIDTH
  const noteH = (n) => n.height ?? DEFAULT_NOTE_HEIGHT

  const boardContentH = notes.length
    ? Math.max(360, ...notes.map(n => (n.pos_y || 0) + noteH(n) + 16))
    : 360

  const startEdit = (note) => {
    setEditingId(note.id)
    setEditDraft(note.content ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft('')
  }

  const saveEdit = () => {
    if (!editingId) return
    const original = notes.find(n => n.id === editingId)?.content ?? ''
    const trimmed = editDraft.trim()
    if (trimmed !== original && onUpdateContent) onUpdateContent(editingId, trimmed)
    cancelEdit()
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    e.preventDefault()
    if (window.confirm('Delete this sticker?')) onDelete(id)
  }

  const handleNoteMouseDown = (e, id) => {
    if (editingId === id) return
    if (e.detail >= 2) return
    if (e.target.closest('button') || e.target.closest('textarea') || e.target.dataset.resize) return
    onMouseDown(e, id)
  }

  const colorPicker = (
    <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
      {NOTE_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => setNoteColor(c)}
          style={{
            width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer',
            border: noteColor === c ? `2px solid ${THEME.accent}` : '2px solid transparent',
            padding: 0,
          }}
        />
      ))}
    </div>
  )

  const addButton = (
    <button type="button" onClick={onAdd} style={{
      width: '100%', padding: '5px 0', background: THEME.accent, color: '#0A0C14',
      border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
    }}>+ Add sticker</button>
  )

  return (
    <div style={{
      ...(fullWidth ? { flex: 1, minWidth: 0 } : { width, flexShrink: 0 }),
      alignSelf: 'stretch',
      display: 'flex', flexDirection: 'column',
      minHeight: 0,
      background: THEME.surface, borderLeft: fullWidth ? 'none' : `1px solid ${THEME.border}`,
    }}>
      {!hideControls && (
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6, color: THEME.accentText }}>{title}</div>
        {colorPicker}
        {addButton}
      </div>
      )}

      {hideControls && title && (
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: THEME.accentText }}>{title}</div>
        </div>
      )}

      {showBoard && (
        <div
          ref={boardRef}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClick={() => { if (editingId) saveEdit() }}
          style={{
            flex: 1, position: 'relative', overflow: 'auto', minHeight: 120,
            background: THEME.surfaceAlt,
            backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            cursor: resizing ? 'nwse-resize' : undefined,
          }}
        >
          <div style={{ position: 'relative', minHeight: boardContentH, width: '100%' }}>
          {notes.length === 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              color: THEME.textFaint, fontSize: 10, textAlign: 'center', padding: '0 12px',
            }}>
              Pick a color and + Add sticker — drag, resize corners, double-click to edit
            </div>
          )}
          {notes.map(note => {
            const isEditing = editingId === note.id
            const w = noteW(note)
            const h = noteH(note)
            const isEmpty = !note.content?.trim()
            return (
              <div
                key={note.id}
                onMouseDown={e => handleNoteMouseDown(e, note.id)}
                onDoubleClick={e => { e.stopPropagation(); startEdit(note) }}
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', left: note.pos_x, top: note.pos_y,
                  width: w, height: h,
                  background: note.color, color: '#1e293b', borderRadius: 6,
                  padding: '6px 8px 10px',
                  boxSizing: 'border-box',
                  fontSize: 10, fontWeight: 500,
                  cursor: isEditing ? 'text' : (dragging === note.id ? 'grabbing' : 'grab'),
                  lineHeight: 1.4,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                  userSelect: isEditing ? 'text' : 'none',
                  zIndex: isEditing || dragging === note.id || resizing === note.id ? 100 : 1,
                  wordBreak: 'break-word',
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <button type="button" onMouseDown={e => e.stopPropagation()} onClick={e => handleDelete(note.id, e)} style={{
                  position: 'absolute', top: 3, right: 5, background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 12, color: '#64748b', zIndex: 2,
                }}>×</button>
                {note.ticker_tag && !isEditing && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, background: THEME.surfaceHover,
                    color: THEME.textMuted, borderRadius: 3, padding: '1px 4px',
                    marginBottom: 3, display: 'inline-block', alignSelf: 'flex-start',
                  }}>{note.ticker_tag}</span>
                )}
                {isEditing ? (
                  <textarea
                    ref={editRef}
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={e => {
                      if (e.key === 'Escape') cancelEdit()
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    style={{
                      flex: 1, width: '100%', resize: 'none',
                      background: 'transparent', border: 'none', outline: 'none',
                      color: '#1e293b', fontSize: 10, fontWeight: 500,
                      fontFamily: 'inherit', lineHeight: 1.4, padding: 0,
                      minHeight: 0,
                    }}
                  />
                ) : (
                  <div style={{ flex: 1, overflow: 'auto', paddingRight: 10, opacity: isEmpty ? 0.45 : 1, fontStyle: isEmpty ? 'italic' : 'normal' }}>
                    {isEmpty ? 'Double-click to edit' : note.content}
                  </div>
                )}
                <div
                  data-resize="1"
                  onMouseDown={e => onResizeMouseDown?.(e, note.id)}
                  title="Drag to resize"
                  style={{
                    position: 'absolute', right: 0, bottom: 0,
                    width: 14, height: 14, cursor: 'nwse-resize',
                    background: 'linear-gradient(135deg, transparent 50%, rgba(100,116,139,0.45) 50%)',
                    borderBottomRightRadius: 6,
                  }}
                />
              </div>
            )
          })}
          </div>
        </div>
      )}

      {listOnly && (
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
          {notes.length === 0 && (
            <div style={{ padding: '12px', fontSize: 10, color: THEME.textFaint, textAlign: 'center' }}>No stickers yet</div>
          )}
          {notes.map(note => (
            <div key={note.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
              borderBottom: `1px solid ${THEME.border}`,
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: 2, background: note.color,
                flexShrink: 0, marginTop: 2,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: THEME.text, lineHeight: 1.35 }}>{note.content || '(empty)'}</div>
                {note.ticker_tag && (
                  <div style={{ fontSize: 8, color: THEME.textFaint, marginTop: 2 }}>{note.ticker_tag}</div>
                )}
              </div>
              <button type="button" onClick={e => handleDelete(note.id, e)} style={{
                background: 'none', border: 'none', color: '#E84F4F', cursor: 'pointer', fontSize: 14, padding: 0,
              }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
