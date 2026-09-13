function pad(n) {
  return String(n).padStart(2, '0')
}

function toIcsDate(dateStr, timeStr, allDay) {
  const d = dateStr.replace(/-/g, '')
  if (allDay || !timeStr) return d
  const [h, m] = timeStr.split(':')
  return `${d}T${pad(h)}${pad(m)}00`
}

function escapeIcs(text) {
  return String(text ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function exportMonthToIcs({ year, month, officeEvents = [], pharmaEvents = [] }) {
  const monthStart = `${year}-${pad(month + 1)}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthEnd = `${year}-${pad(month + 1)}-${pad(lastDay)}`

  const inMonth = (dateStr) => dateStr >= monthStart && dateStr <= monthEnd

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Atherium Holdings//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const e of officeEvents.filter(ev => inMonth(ev.event_date))) {
    const uid = `office-${e.id}@atherium.cosmonova.io`
    const start = toIcsDate(e.event_date, e.start_time, e.all_day)
    const endDate = e.end_time
      ? toIcsDate(e.event_date, e.end_time, false)
      : start
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      e.all_day ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
      e.all_day ? `DTEND;VALUE=DATE:${start}` : `DTEND:${endDate}`,
      `SUMMARY:${escapeIcs(e.title)}`,
      e.location ? `LOCATION:${escapeIcs(e.location)}` : '',
      e.description ? `DESCRIPTION:${escapeIcs(e.description)}` : '',
      e.attendees ? `ATTENDEE:${escapeIcs(e.attendees)}` : '',
      'END:VEVENT',
    )
  }

  for (const e of pharmaEvents.filter(ev => inMonth(ev.event_date))) {
    const uid = `pharma-${e.id}@atherium.cosmonova.io`
    const start = e.event_date.replace(/-/g, '')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${start}`,
      `SUMMARY:${escapeIcs(`[${e.ticker}] ${e.label}`)}`,
      `DESCRIPTION:${escapeIcs(`${e.event_type} · ${e.ticker}`)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}

export function downloadIcs(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function unfoldIcs(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
}

function parseIcsDateValue(raw, params) {
  if (!raw) return { date: null, allDay: true }
  const isDateOnly = (params ?? '').includes('VALUE=DATE') || raw.length === 8
  if (isDateOnly) {
    const y = raw.slice(0, 4)
    const m = raw.slice(4, 6)
    const d = raw.slice(6, 8)
    return { date: `${y}-${m}-${d}`, allDay: true, time: null }
  }
  const y = raw.slice(0, 4)
  const m = raw.slice(4, 6)
  const d = raw.slice(6, 8)
  const hh = raw.slice(9, 11)
  const mm = raw.slice(11, 13)
  return { date: `${y}-${m}-${d}`, allDay: false, time: `${hh}:${mm}` }
}

export function parseIcsFile(text) {
  const unfolded = unfoldIcs(text)
  const events = []
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1)

  for (const block of blocks) {
    const chunk = block.split('END:VEVENT')[0]
    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean)
    const fields = {}
    for (const line of lines) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      const keyPart = line.slice(0, idx)
      const val = line.slice(idx + 1)
      const key = keyPart.split(';')[0].toUpperCase()
      fields[key] = { raw: val, params: keyPart }
    }

    const summary = fields.SUMMARY?.raw
    if (!summary || !fields.DTSTART?.raw) continue

    const start = parseIcsDateValue(fields.DTSTART.raw, fields.DTSTART.params ?? '')
    const end = fields.DTEND?.raw
      ? parseIcsDateValue(fields.DTEND.raw, fields.DTEND.params ?? '')
      : start

    events.push({
      title: summary.replace(/\\n/g, '\n').replace(/\\,/g, ','),
      description: (fields.DESCRIPTION?.raw ?? '').replace(/\\n/g, '\n'),
      event_date: start.date,
      start_time: start.allDay ? null : start.time,
      end_time: end.allDay ? null : end.time,
      all_day: start.allDay,
      location: (fields.LOCATION?.raw ?? '').replace(/\\,/g, ',') || null,
      attendees: (fields.ATTENDEE?.raw ?? '').replace(/mailto:/gi, '') || null,
      category: 'MEETING',
    })
  }

  return events
}
