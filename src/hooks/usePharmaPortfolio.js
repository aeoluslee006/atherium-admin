import { useCallback, useEffect, useState } from 'react'

const DEFAULT_PORTFOLIO = ['VRTX', 'GILD', 'MRNA', 'REGN', 'AMGN']

function storageKey(userEmail) {
  return `pharma_portfolio_${(userEmail || 'default').toLowerCase()}`
}

export function usePharmaPortfolio(userEmail) {
  const key = storageKey(userEmail)
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return DEFAULT_PORTFOLIO
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(portfolio))
  }, [key, portfolio])

  const isInPortfolio = useCallback(
    (ticker) => portfolio.includes(ticker),
    [portfolio],
  )

  const toggleTicker = useCallback((ticker) => {
    const t = ticker.toUpperCase()
    setPortfolio(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort()))
  }, [])

  return { portfolio, isInPortfolio, toggleTicker, setPortfolio }
}
