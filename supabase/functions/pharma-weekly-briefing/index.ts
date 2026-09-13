// Supabase Edge Function: pharma-weekly-briefing
// Schedule: Monday 8am ET — Supabase Dashboard → Edge Functions → Schedules
// Secrets:
//   RESEND_API_KEY
//   BRIEFING_FROM_EMAIL  (e.g. calendar@atherium.cosmonova.io)
//   BRIEFING_TO_EMAIL    (comma-separated recipients)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('BRIEFING_FROM_EMAIL')
    const toEmail = Deno.env.get('BRIEFING_TO_EMAIL')

    if (!resendKey || !fromEmail || !toEmail) {
      return new Response(JSON.stringify({
        error: 'Configure RESEND_API_KEY, BRIEFING_FROM_EMAIL, and BRIEFING_TO_EMAIL in Edge Function secrets.',
      }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const today = new Date()
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const start = today.toISOString().split('T')[0]
    const end = weekEnd.toISOString().split('T')[0]

    const [{ data: events }, { data: earnings }] = await Promise.all([
      supabase.from('pharma_events').select('ticker,event_date,event_type,label').gte('event_date', start).lte('event_date', end).order('event_date'),
      supabase.from('pharma_earnings').select('ticker,fiscal_quarter,report_date,eps_estimate').gte('report_date', start).lte('report_date', end).order('report_date'),
    ])

    const lines: string[] = []
    for (const e of events ?? []) {
      lines.push(`${fmt(e.event_date)} · ${e.ticker} · ${e.event_type} · ${e.label}`)
    }
    for (const e of earnings ?? []) {
      lines.push(`${fmt(e.report_date)} · ${e.ticker} · Earnings ${e.fiscal_quarter} (EPS est $${e.eps_estimate ?? 'TBD'})`)
    }

    const body = lines.length
      ? lines.join('\n')
      : 'No catalysts scheduled this week.'

    const html = `
      <div style="font-family:sans-serif;color:#111;">
        <h2>Atherium Weekly Catalyst Briefing</h2>
        <p>${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — next 7 days</p>
        <pre style="background:#f4f4f5;padding:16px;border-radius:8px;font-size:13px;line-height:1.5;">${body}</pre>
        <p style="color:#666;font-size:12px;">Atherium Holdings · atherium.cosmonova.io/calendar</p>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail.split(',').map(s => s.trim()),
        subject: `Atherium Weekly Briefing — ${lines.length} events`,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: errText }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const sent = await res.json()
    return new Response(JSON.stringify({ ok: true, eventCount: lines.length, sent }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
