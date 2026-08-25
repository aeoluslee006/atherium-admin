// Supabase Edge Function: pharma-ai-analysis
// Secrets: ANTHROPIC_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Quote = {
  price?: number | null
  change_pct?: number | null
}

type Overview = {
  company_name?: string | null
  sector?: string | null
  pe_ratio?: number | null
  beta?: number | null
  analyst_target?: number | null
  pct_institutions?: number | null
}

type NewsItem = {
  title?: string | null
  ticker_label?: string | null
  ticker_score?: number | null
}

type Earning = {
  fiscal_quarter: string
  report_date: string
  eps_estimate: number | null
  eps_actual: number | null
  eps_beat: boolean | null
  eps_surprise_pct: number | null
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

    const {
      ticker,
      events = [],
      earnings = [],
      quote = null,
      overview = null,
      news = [],
      nextCatalyst = null,
    } = await req.json()

    if (!ticker) {
      return new Response(JSON.stringify({ error: 'ticker required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const q = quote as Quote | null
    const o = overview as Overview | null
    const headlines = (news as NewsItem[]).slice(0, 3).map((n) => n.title).filter(Boolean).join(' / ')
    const earnLines = (earnings as Earning[]).slice(0, 4).map((e) =>
      `${e.fiscal_quarter}: Est $${e.eps_estimate ?? 'TBD'} / Act ${e.eps_actual != null ? `$${e.eps_actual}` : 'TBD'} / ${e.eps_beat === true ? 'Beat' : e.eps_beat === false ? 'Miss' : 'Pending'} ${e.eps_surprise_pct != null ? `${e.eps_surprise_pct}%` : ''}`.trim(),
    ).join('\n')

    const changePct = q?.change_pct != null ? `${q.change_pct > 0 ? '+' : ''}${q.change_pct}%` : 'N/A'
    const catalystLine = nextCatalyst
      ? `${nextCatalyst.label} (${nextCatalyst.date}${nextCatalyst.dDay != null ? `, D-${nextCatalyst.dDay}` : ''})`
      : '(none)'

    const prompt = `종목: ${ticker} (${o?.company_name ?? ticker})
섹터: ${o?.sector ?? 'N/A'}
현재가: $${q?.price ?? 'N/A'} (${changePct})
P/E: ${o?.pe_ratio ?? 'N/A'}  Beta: ${o?.beta ?? 'N/A'}
애널리스트 목표가: $${o?.analyst_target ?? 'N/A'}
기관보유율: ${o?.pct_institutions ?? 'N/A'}%

다가오는 이벤트: ${catalystLine}

최근 어닝 히스토리:
${earnLines || '(none)'}

뉴스 센티먼트: ${(news as NewsItem[])[0]?.ticker_label ?? 'N/A'} (${(news as NewsItem[])[0]?.ticker_score ?? 'N/A'})
최근 뉴스: ${headlines || '(none)'}

위 데이터를 바탕으로 이 종목의 투자 포인트, 리스크 요인, 다가오는 이벤트 관련 주요 체크포인트를 한국어로 3-5문장으로 간결하게 분석해줘. 투자 권유는 하지 말고 팩트 기반으로만.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
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
