/** Mirror of tulip-town-app/lib/pricingAdminUi.js for Atherium admin. */

export function centsToDollarInput(cents) {
  const n = Number(cents)
  if (!Number.isFinite(n)) return ''
  return (n / 100).toFixed(2)
}

export function dollarsToCents(value) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export const PRICING_DISPLAY_LABELS = {
  directory_small: '소형',
  directory_medium: '중형',
  directory_large: '대형',
  directory_ultra: '울트라',
  special_ad_addon: '특별광고 추가',
  directory_listing: '레거시(미사용)',
  shop_monthly: '일반 셀러',
  shop_upgrade_monthly: '프로 셀러',
  shop_extra_pack_monthly: '상품 10개 추가',
  tulip_shop: '레거시 키 (shop_monthly와 중복)',
  seller_monthly: '셀러 월 구독 (레거시)',
}

const DIRECTORY_ORDER = [
  'directory_small',
  'directory_medium',
  'directory_large',
  'directory_ultra',
  'special_ad_addon',
  'directory_listing',
]

const TULIP_ORDER = ['shop_monthly', 'shop_upgrade_monthly', 'shop_extra_pack_monthly']

export function groupPricingSettings(rows = []) {
  const byKey = new Map((rows || []).map((r) => [r.key, r]))
  const pickOrdered = (keys) =>
    keys
      .map((k) => byKey.get(k))
      .filter(Boolean)
      .map((row) => {
        byKey.delete(row.key)
        return row
      })

  const directory = pickOrdered(DIRECTORY_ORDER)
  const tulip = pickOrdered(TULIP_ORDER)

  const legacyItems = []
  for (const k of ['tulip_shop', 'seller_monthly']) {
    if (byKey.has(k)) {
      legacyItems.push(byKey.get(k))
      byKey.delete(k)
    }
  }
  const other = [...byKey.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)))

  const groups = [
    { id: 'directory', title: '업체 디렉토리', items: directory },
    {
      id: 'tulip',
      title: '튤립몰',
      items: tulip,
      hints: {
        shop_monthly: '최대 6개 상품 등록',
        shop_upgrade_monthly: '기본 최대 20개 · 이후 10개당 +$8',
        shop_extra_pack_monthly: '프로 셀러 전용 · 상품 한도 +10',
      },
    },
  ]

  if (legacyItems.length) {
    groups.push({
      id: 'legacy_seller',
      title: '레거시 (신규 판매 중단 / 중복 키)',
      items: legacyItems,
      hints: {
        tulip_shop: '일반 셀러는 shop_monthly 사용 · 이 키는 미사용',
        seller_monthly: '기존 구독만 유지 · 신규 노출 비활성',
      },
    })
  }
  if (other.length) groups.push({ id: 'other', title: '기타', items: other })
  return groups.filter((g) => g.items.length > 0)
}

export function displayLabelForPricingRow(row) {
  return PRICING_DISPLAY_LABELS[row?.key] || row?.label || row?.key || ''
}
