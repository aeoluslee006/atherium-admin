import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { STICKER_COLORS } from '../components/StickersPanel'

export function usePharmaNotes() {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [noteColor, setNoteColor] = useState(STICKER_COLORS[0])
  const [dragging, setDragging] = useState(null)
  const boardRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const loadNotes = useCallback(async () => {
    const { data } = await supabase.from('pharma_notes').select('*').order('created_at')
    if (data) setNotes(data)
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])

  const addNote = async () => {
    if (!newNote.trim()) return
    const { data } = await supabase.from('pharma_notes')
      .insert({ content: newNote, color: noteColor, pos_x: 30, pos_y: 30 })
      .select().single()
    if (data) setNotes(n => [...n, data])
    setNewNote('')
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

  const onMouseDown = (e, id) => {
    if (!boardRef.current) return
    const b = boardRef.current.getBoundingClientRect()
    const note = notes.find(n => n.id === id)
    if (!note) return
    dragOffset.current = { x: e.clientX - b.left - note.pos_x, y: e.clientY - b.top - note.pos_y }
    setDragging(id)
  }

  const onMouseMove = (e) => {
    if (!dragging || !boardRef.current) return
    const b = boardRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - b.left - dragOffset.current.x, b.width - 140))
    const y = Math.max(0, Math.min(e.clientY - b.top - dragOffset.current.y, Math.max(b.height, boardRef.current.scrollHeight) - 72))
    setNotes(n => n.map(note => note.id === dragging ? { ...note, pos_x: x, pos_y: y } : note))
  }

  const onMouseUp = () => {
    if (dragging) {
      const note = notes.find(n => n.id === dragging)
      if (note) saveNotePos(dragging, note.pos_x, note.pos_y)
    }
    setDragging(null)
  }

  return {
    notes, newNote, setNewNote, noteColor, setNoteColor, dragging, boardRef,
    addNote, deleteNote, updateNoteContent, onMouseDown, onMouseMove, onMouseUp, loadNotes,
  }
}
