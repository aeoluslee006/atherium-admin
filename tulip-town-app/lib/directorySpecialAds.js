/** First-page special ads (directory 지면 상단 슬라이드). */

export const SPECIAL_AD_EXTRA_CENTS = 200; // +$2/월
export const SPECIAL_AD_CAPACITY = 10;
export const SPECIAL_AD_INTERVAL_MS = 6000;
export const SPECIAL_AD_IMAGE_GUIDE = {
  size: '800×400px (2:1 가로형) 권장',
  formats: 'JPG/PNG · 파일당 2MB 이하',
  tip: '세로형 이미지는 잘리거나 여백이 생길 수 있습니다. 그리드용 사진과 별도 파일을 올려 주세요.',
};

const SPECIAL_ELIGIBLE = new Set(['ultra', 'large', 'medium']);

export function canAddSpecialAd(sizeTier) {
  return SPECIAL_ELIGIBLE.has(String(sizeTier || ''));
}

export function shuffleArray(list = []) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Active specials currently in the rotating slider (not queued). */
export async function countLiveSpecialAds(db) {
  const { count, error } = await db
    .from('directory_slot_ads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('is_special', true)
    .is('special_queue_position', null);
  if (error) throw error;
  return Number(count) || 0;
}

export async function nextSpecialQueuePosition(db) {
  const { data, error } = await db
    .from('directory_slot_ads')
    .select('special_queue_position')
    .eq('status', 'active')
    .eq('is_special', true)
    .not('special_queue_position', 'is', null)
    .order('special_queue_position', { ascending: false })
    .limit(1);
  if (error) throw error;
  const max = Number(data?.[0]?.special_queue_position) || 0;
  return max + 1;
}

/**
 * After a live special leaves, promote the earliest queued special into the slider.
 */
export async function promoteNextSpecialFromQueue(db) {
  const live = await countLiveSpecialAds(db);
  if (live >= SPECIAL_AD_CAPACITY) return null;

  const { data: next, error } = await db
    .from('directory_slot_ads')
    .select('id,special_queue_position')
    .eq('status', 'active')
    .eq('is_special', true)
    .not('special_queue_position', 'is', null)
    .order('special_queue_position', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!next?.id) return null;

  const { error: upErr } = await db
    .from('directory_slot_ads')
    .update({ special_queue_position: null })
    .eq('id', next.id);
  if (upErr) throw upErr;
  return next.id;
}

/** Fill open slider seats from the queue (FIFO). */
export async function drainSpecialQueue(db) {
  const promoted = [];
  for (let i = 0; i < SPECIAL_AD_CAPACITY; i += 1) {
    const id = await promoteNextSpecialFromQueue(db);
    if (!id) break;
    promoted.push(id);
  }
  return promoted;
}
