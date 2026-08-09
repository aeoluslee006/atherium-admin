export function isExampleLocalNews(row) {
  // Ignore placeholder rows from the example INSERT (제목 1 / 출처명 / 기사URL)
  if (!row) return true;
  if (row.url === 'https://기사URL') return true;
  if (row.source === '출처명' && /^제목\s*\d+$/.test(String(row.title || ''))) return true;
  return false;
}

export function formatNewsDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export function hostnameOf(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
