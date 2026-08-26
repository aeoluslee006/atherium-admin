import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { STICKER_COLORS, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../components/StickersPanel'

export function usePharmaNotes() {
  const [notes, setNotes] = useState([])
  const [noteColor, setNoteColor] = useState(STICKER_COLORS[0])
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)
  const boardRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ w: 0, h: 0, mouseX: 0, mouseY: 0 })

  const noteSize = (note) => ({
    w: note.width ?? DEFAULT_NOTE_WIDTH,
    h: note.height ?? DEFAULT_NOTE_HEIGHT,
  })

  const loadNotes = useCallback(async () => {
    const { data } = await supabase.from('pharma_notes').select('*').order('created_at')
    if (data) setNotes(data)
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])

  const addNote = async () => {
    const offset = notes.length * 22
    const pos_x = 24 + (offset % 180)
    const pos_y = 24 + (offset % 180)
    const { data } = await supabase.from('pharma_notes').insert({
      content: '',
      color: noteColor,
      pos_x,
      pos_y,
      width: DEFAULT_NOTE_WIDTH,
      height: DEFAULT_NOTE_HEIGHT,
    }).select().single()
    if (data) setNotes(n => [...n, data])
  }

  const updateNoteContent = async (id, content) => {
    await supabase.from('pharma_notes').update({ content }).eq('id', id)
    setNotes(n => n.map(note => note.id === id ? { ...note, content } : note))
  }

  const deleteNote = async (id) => {
    await supabase.from('pharma_notes').delete().eq('id', id)
    setNotes(n => n.filter(note => note.id !== id))
  }

  const saveNotePos = async (id, x, y) => {
    await supabase.from('pharma_notes').update({ pos_x: x, pos_y: y }).eq('id', id)
  }

  const saveNoteSize = async (id, width, height) => {
    await supabase.from('pharma_notes').update({ width, height }).eq('id', id)
  }

  const onMouseDown = (e, id) => {
    if (!boardRef.current) return
    const b = boardRef.current.getBoundingClientRect()
    const note = notes.find(n => n.id === id)
    if (!note) return
    const { w } = noteSize(note)
    const displayX = Math.max(0, Math.min(note.pos_x, b.width - w))
    const displayY = Math.max(0, note.pos_y)
    dragOffset.current = { x: e.clientX - b.left - displayX, y: e.clientY - b.top - displayY }
    setDragging(id)
  }

  const onResizeMouseDown = (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    const note = notes.find(n => n.id === id)
    if (!note) return
    const { w, h } = noteSize(note)
    resizeStart.current = { w, h, mouseX: e.clientX, mouseY: e.clientY }
    setResizing(id)
  }

  const onMouseMove = (e) => {
    if (!boardRef.current) return
    const b = boardRef.current.getBoundingClientRect()

    if (resizing) {
      const note = notes.find(n => n.id === resizing)
      const maxW = note ? Math.max(80, b.width - note.pos_x) : 480
      const dx = e.clientX - resizeStart.current.mouseX
      const dy = e.clientY - resizeStart.current.mouseY
      const w = Math.max(80, Math.min(maxW, Math.round(resizeStart.current.w + dx)))
      const h = Math.max(60, Math.min(480, Math.round(resizeStart.current.h + dy)))
      setNotes(n => n.map(note => note.id === resizing ? { ...note, width: w, height: h } : note))
      return
    }

    if (!dragging) return
    const note = notes.find(n => n.id === dragging)
    if (!note) return
    const { w, h } = noteSize(note)
    const x = Math.max(0, Math.min(e.clientX - b.left - dragOffset.current.x, b.width - w))
    const y = Math.max(0, Math.min(
      e.clientY - b.top - dragOffset.current.y,
      Math.max(b.height, boardRef.current.scrollHeight) - h,
    ))
    setNotes(n => n.map(item => item.id === dragging ? { ...item, pos_x: x, pos_y: y } : item))
  }

  const onMouseUp = () => {
    if (resizing) {
      const note = notes.find(n => n.id === resizing)
      if (note) saveNoteSize(resizing, note.width ?? DEFAULT_NOTE_WIDTH, note.height ?? DEFAULT_NOTE_HEIGHT)
      setResizing(null)
    }
    if (dragging) {
      const note = notes.find(n => n.id === dragging)
      if (note) saveNotePos(dragging, note.pos_x, note.pos_y)
    }
    setDragging(null)
  }

  return {
    notes, noteColor, setNoteColor, dragging, resizing, boardRef,
    addNote, deleteNote, updateNoteContent,
    onMouseDown, onResizeMouseDown, onMouseMove, onMouseUp, loadNotes,
  }
}
