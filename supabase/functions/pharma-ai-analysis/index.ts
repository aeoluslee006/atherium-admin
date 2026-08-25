// Supabase Edge Function: pharma-ai-analysis
// Secrets: ANTHROPIC_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'ANTHROPIC_API_KEY is not configured in Supabase Edge Function secrets.',
      }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { ticker, events = [], earnings = [] } = await req.json()
    if (!ticker) {
      return new Response(JSON.stringify({ error: 'ticker required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const eventLines = events.slice(0, 12).map((e: { event_date: string; event_type: string; label: string; status: string }) =>
      `- ${e.event_date} [${e.event_type}] ${e.label} (${e.status})`,
    ).join('\n')

    const earnLines = earnings.slice(0, 8).map((e: {
      fiscal_quarter: string; report_date: string; eps_estimate: number | null
      eps_actual: number | null; eps_beat: boolean | null; eps_surprise_pct: number | null
    }) =>
      `- ${e.fiscal_quarter} ${e.report_date}: est ${e.eps_estimate ?? 'TBD'}, act ${e.eps_actual ?? '—'}, beat ${e.eps_beat ?? 'pending'}, surprise ${e.eps_surprise_pct ?? '—'}%`,
    ).join('\n')

    const prompt = `You are a biotech/pharma equity analyst for Atherium Holdings.

Analyze ${ticker} for a portfolio manager. Focus on near-term catalyst risk and opportunity.

Upcoming events:
${eventLines || '(none)'}

Earnings:
${earnLines || '(none)'}

Respond in English with:
1) Catalyst summary (2-3 bullets)
2) Key risks before next event
3) Trading/setup angle (neutral tone, not financial advice)

Keep under 220 words. Use plain text, no markdown headers.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: `Anthropic API error: ${errText}` }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const analysis = data?.content?.[0]?.text ?? 'No analysis returned.'

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
