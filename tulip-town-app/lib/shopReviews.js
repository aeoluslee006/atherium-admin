import { createServerSupabase } from './supabaseServer';
import { displayNameFromProfile } from './memberTier';
import { supabaseRest } from './supabaseRest';

export const COMMENT_MAX = 120;

export function normalizeReviewComment(raw) {
  const text = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.slice(0, COMMENT_MAX);
}

function mapReviewRow(row) {
  if (!row?.id) return null;
  const profile = row.reviewer || row.profiles || null;
  return {
    id: row.id,
    productId: row.product_id,
    reviewerId: row.reviewer_id,
    comment: row.comment || null,
    createdAt: row.created_at,
    reviewerName: displayNameFromProfile(profile, null),
  };
}

/** Public review list for a product (newest first). */
export async function loadProductReviews(productId) {
  if (!productId) return [];

  const selects = [
    `product_reviews?select=id,product_id,reviewer_id,comment,created_at,reviewer:profiles(id,display_name,username,first_name,last_name)&product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc`,
    `product_reviews?select=id,product_id,reviewer_id,comment,created_at,profiles(id,display_name,username)&product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc`,
    `product_reviews?select=id,product_id,reviewer_id,comment,created_at&product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc`,
  ];

  for (const path of selects) {
    try {
      const rows = await supabaseRest(path);
      if (!Array.isArray(rows)) continue;
      return rows.map(mapReviewRow).filter(Boolean);
    } catch {
      // try next select shape
    }
  }
  return [];
}

/** Current user's review on a product (null if logged out / none). */
export async function loadMyProductReview(productId) {
  if (!productId) return null;
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('product_reviews')
      .select('id,product_id,reviewer_id,comment,created_at')
      .eq('product_id', productId)
      .eq('reviewer_id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    return mapReviewRow(data);
  } catch {
    return null;
  }
}

/** Cumulative review count across a seller's products. */
export async function loadSellerReviewCount(sponsorId) {
  if (!sponsorId) return 0;

  try {
    const supabase = createServerSupabase();
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('sponsor_id', sponsorId);
    if (productsError || !products?.length) {
      return await countReviewsViaRest(sponsorId);
    }

    const ids = products.map((p) => p.id).filter(Boolean);
    if (!ids.length) return 0;

    const { count, error } = await supabase
      .from('product_reviews')
      .select('id', { count: 'exact', head: true })
      .in('product_id', ids);
    if (error) return await countReviewsViaRest(sponsorId);
    return count || 0;
  } catch {
    return await countReviewsViaRest(sponsorId);
  }
}

async function countReviewsViaRest(sponsorId) {
  try {
    const products = await supabaseRest(
      `products?select=id&sponsor_id=eq.${encodeURIComponent(sponsorId)}`
    );
    if (!Array.isArray(products) || !products.length) return 0;
    const ids = products.map((p) => p.id).filter(Boolean);
    if (!ids.length) return 0;

    const reviews = await supabaseRest(
      `product_reviews?select=id&product_id=in.(${ids.map(encodeURIComponent).join(',')})`
    );
    return Array.isArray(reviews) ? reviews.length : 0;
  } catch {
    return 0;
  }
}
