import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../lib/adminAuth';
import { createAdminSupabase } from '../../../../lib/supabaseAdmin';
import { promoLabel, resolveMemberStatus } from '../../../../lib/memberStatus';
import { TIER_META } from '../../../../lib/memberTier';

const PAGE_SIZE_DEFAULT = 50;

export async function GET(request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const tierFilter = (searchParams.get('tier') || '').trim().toLowerCase();
    const statusFilter = (searchParams.get('status') || '').trim().toLowerCase();
    const hasMessage = searchParams.get('has_message') === '1';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || PAGE_SIZE_DEFAULT)));
    const offset = (page - 1) * limit;

    const supabase = createAdminSupabase();

    let query = supabase
      .from('profiles')
      .select(
        'id, display_name, email, is_admin, is_moderator, status, promo_end_date, is_banned, banned_reason, suspended_until, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (statusFilter && ['active', 'hold', 'deleted'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    if (q) {
      query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data: profiles, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
      // Fallback if status/promo columns missing
      if (String(error.message || '').includes('status') || String(error.message || '').includes('promo')) {
        const legacy = await supabase
          .from('profiles')
          .select(
            'id, display_name, email, is_admin, is_moderator, is_banned, banned_reason, suspended_until, created_at',
            { count: 'exact' }
          )
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (legacy.error) throw legacy.error;
        return NextResponse.json({
          members: (legacy.data || []).map((p) => ({
            ...p,
            status: resolveMemberStatus(p),
            promo_end_date: null,
            promo_label: '미적용',
            tier: p.is_admin ? 'super_admin' : p.is_moderator ? 'black' : 'bronze',
            tier_label: p.is_admin ? '관리자' : p.is_moderator ? '운영진' : '브론즈',
            unread_messages: 0,
          })),
          page,
          limit,
          total: legacy.count || 0,
          migration_needed: true,
        });
      }
      throw error;
    }

    const ids = (profiles || []).map((p) => p.id);

    // Tiers from view
    const tierById = new Map();
    if (ids.length) {
      const { data: tiers } = await supabase
        .from('member_tier_view')
        .select('profile_id,tier')
        .in('profile_id', ids);
      for (const t of tiers || []) {
        tierById.set(t.profile_id, t.tier);
      }
    }

    // Unread message counts
    const unreadById = new Map();
    if (ids.length) {
      const { data: msgs } = await supabase
        .from('admin_messages')
        .select('profile_id,is_read')
        .in('profile_id', ids)
        .eq('is_read', false);
      for (const m of msgs || []) {
        unreadById.set(m.profile_id, (unreadById.get(m.profile_id) || 0) + 1);
      }
    }

    // Email fallback from auth if profiles.email empty
    let emailById = new Map();
    try {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 200 });
      emailById = new Map((authData?.users || []).map((u) => [u.id, u.email || '']));
    } catch {
      /* ignore */
    }

    let members = (profiles || []).map((p) => {
      const status = resolveMemberStatus(p);
      const tier =
        tierById.get(p.id) ||
        (p.is_admin ? 'super_admin' : p.is_moderator ? 'black' : 'bronze');
      const meta = TIER_META[tier] || TIER_META.bronze;
      return {
        ...p,
        email: p.email || emailById.get(p.id) || '',
        status,
        promo_end_date: p.promo_end_date || null,
        promo_label: promoLabel(p.promo_end_date),
        tier,
        tier_label: meta.labelKo,
        unread_messages: unreadById.get(p.id) || 0,
      };
    });

    if (tierFilter) {
      members = members.filter((m) => m.tier === tierFilter);
    }
    if (hasMessage) {
      members = members.filter((m) => m.unread_messages > 0);
    }

    return NextResponse.json({
      members,
      page,
      limit,
      total: typeof count === 'number' ? count : members.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
