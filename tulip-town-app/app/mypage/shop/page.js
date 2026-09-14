'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ShopContactChannelsEditor from '../../../components/ShopContactChannelsEditor';
import AutoTranslatedText from '../../../components/AutoTranslatedText';
import { useLocale } from '../../../components/LocaleProvider';
import {
  SELLER_STATUS_LABEL,
  canManageShopProducts,
  formatPriceCents,
  shopProductLimit,
} from '../../../lib/sellerConstants';
import {
  emptyContactChannels,
  normalizeContactChannels,
} from '../../../lib/sellerContact';
import { supabase } from '../../../lib/supabaseClient';

function MyPageShopInner() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerStatusLabel = (status) => {
    const key = `mypage.sellerStatus.${status}`;
    const value = t(key);
    return value === key ? (SELLER_STATUS_LABEL[status] || status) : value;
  };
  const [token, setToken] = useState('');
  const [sponsor, setSponsor] = useState(null);
  const [products, setProducts] = useState([]);
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactChannels, setContactChannels] = useState(emptyContactChannels());
  const [savingContact, setSavingContact] = useState(false);

  const authHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const load = useCallback(async (accessToken) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const meRes = await fetch('/api/seller/me', { headers });
    const me = await meRes.json();
    if (!meRes.ok) throw new Error(me.error || t('mypage.loadFailed'));
    const s = me.sponsor || me.seller;
    setSponsor(s);
    if (s) {
      const channels = normalizeContactChannels(s.contact_channels);
      setContactPhone(channels.phone || String(s.contact || '').trim());
      setContactChannels(channels);
    } else {
      setContactPhone('');
      setContactChannels(emptyContactChannels());
    }

    if (s && s.status === 'approved') {
      const pRes = await fetch('/api/seller/products', { headers });
      const pData = await pRes.json();
      if (pRes.ok) {
        setProducts(pData.products || []);
        setLimit(pData.limit || shopProductLimit(s));
      }
    } else {
      setProducts([]);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login?next=/mypage/shop');
        return;
      }
      setToken(data.session.access_token);
      try {
        await load(data.session.access_token);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, router]);

  useEffect(() => {
    if (!token) return;
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      setMessage(t('mypage.checkoutSuccess'));
      load(token).catch(() => {});
    }
    if (checkout === 'cancel') {
      setMessage(t('mypage.checkoutCancel'));
    }
  }, [token, searchParams, load, t]);

  async function startCheckout(plan, interval = 'month') {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/seller/subscribe', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ plan, interval }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || t('mypage.checkoutFailed'));
      if (payload.url) window.location.href = payload.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(product) {
    setError('');
    setBusyId(product.id);
    try {
      const res = await fetch('/api/seller/products', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id: product.id, is_active: product.is_active === false }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || t('mypage.updateFailed'));
      await load(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function saveContact(e) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSavingContact(true);
    try {
      const res = await fetch('/api/seller/me', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          phone: contactPhone,
          contact_channels: contactChannels,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || t('mypage.contactSaveFailed'));
      const next = payload.sponsor || payload.seller;
      if (next) {
        setSponsor(next);
        const channels = normalizeContactChannels(next.contact_channels);
        setContactPhone(channels.phone || String(next.contact || '').trim());
        setContactChannels(channels);
      }
      setMessage(t('mypage.contactSaved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingContact(false);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(t('mypage.deleteConfirm', { title: product.title }))) return;
    setError('');
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/seller/products?id=${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || t('mypage.deleteFailed'));
      await load(token);
      setMessage(t('mypage.productDeleted'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  if (loading) {
    return (
      <div className="container mypage">
        <div className="card empty-state">{t('common.loading')}</div>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="container mypage">
        <header className="mypage-hero">
          <div className="mypage-hero-text">
            <p className="mypage-kicker">Shop</p>
            <h1 className="mypage-title">{t('mypage.shopTitle')}</h1>
            <p className="mypage-meta">{t('mypage.shopSubtitle')}</p>
          </div>
        </header>
        <div className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 18 }}>{t('mypage.sellerRegister')}</h2>
          <p className="hint-text" style={{ marginTop: 8, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
            {t('mypage.sellerRegisterHint')}
          </p>
          <p className="hint-text" style={{ marginTop: 8 }}>
            {t('mypage.sellerTradeHint')}
          </p>
          <div className="mypage-empty-actions" style={{ marginTop: 16 }}>
            <Link href="/mypage/shop/apply" className="btn">
              {t('mypage.startSelling')}
            </Link>
            <Link href="/shop" className="btn btn-outline">
              {t('mypage.publicTulipShop')}
            </Link>
            <Link href="/mypage" className="btn btn-outline">
              {t('auth.mypage')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = products.filter((p) => p.is_active !== false).length;
  const canManage = canManageShopProducts(sponsor);
  const atLimit = canManage && activeCount >= limit;
  const tierLabel = sponsor.plan_tier === 'extended' ? t('mypage.tierPro') : t('mypage.tierBasic');
  const trialActive =
    sponsor.trial_ends_at && new Date(sponsor.trial_ends_at).getTime() > Date.now();

  return (
    <div className="container mypage">
      <header className="mypage-hero">
        <div className="mypage-hero-text">
          <p className="mypage-kicker">Shop</p>
          <h1 className="mypage-title">{t('mypage.shopTitle')}</h1>
          <p className="mypage-meta">
            {sponsor.business_name}
            {' · '}
            {sellerStatusLabel(sponsor.status)}
            {sponsor.city ? ` · ${sponsor.city}` : ''}
            {canManage
              ? ` · ${tierLabel} · ${t('mypage.productQuota', { active: activeCount, limit })}`
              : ''}
          </p>
        </div>
        <div className="mypage-empty-actions" style={{ flexWrap: 'wrap' }}>
          <Link href="/mypage" className="btn btn-outline">
            {t('auth.mypage')}
          </Link>
          <Link href="/shop" className="btn btn-outline">
            {t('mypage.publicShop')}
          </Link>
          {canManage ? (
            <Link href="/mypage/shop/new" className="btn">
              {t('mypage.registerProduct')}
            </Link>
          ) : null}
        </div>
      </header>

      {message ? <div className="hint-text" style={{ marginBottom: 12 }}>{message}</div> : null}
      {error ? <div className="error-text" style={{ marginBottom: 12 }}>{error}</div> : null}

      {sponsor.status === 'pending' ? (
        <section className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 16 }}>{t('mypage.pendingTitle')}</h2>
          <p className="hint-text" style={{ marginTop: 8 }}>
            {t('mypage.pendingHint')}
          </p>
        </section>
      ) : null}

      {sponsor.status === 'rejected' ? (
        <section className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 16 }}>{t('mypage.rejectedTitle')}</h2>
          <p className="hint-text" style={{ marginTop: 8 }}>
            {sponsor.review_notes
              ? t('mypage.rejectedReason', { notes: sponsor.review_notes })
              : t('mypage.rejectedDefault')}
          </p>
          <Link href="/mypage/shop/apply" className="btn" style={{ marginTop: 12, display: 'inline-flex' }}>
            {t('mypage.reapply')}
          </Link>
        </section>
      ) : null}

      {sponsor.status !== 'rejected' ? (
        <section className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 16 }}>{t('mypage.contact')}</h2>
          <p className="hint-text" style={{ marginTop: 8, marginBottom: 12 }}>
            {t('mypage.contactHint')}
          </p>
          <form onSubmit={saveContact}>
            <ShopContactChannelsEditor
              phone={contactPhone}
              onPhoneChange={setContactPhone}
              value={contactChannels}
              onChange={setContactChannels}
              disabled={savingContact}
            />
            <button className="btn" type="submit" disabled={savingContact} style={{ marginTop: 14 }}>
              {savingContact ? t('common.saving') : t('mypage.saveContact')}
            </button>
          </form>
        </section>
      ) : null}

      {canManage ? (
        <section className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 16 }}>{t('mypage.plans')}</h2>
          <p className="hint-text" style={{ marginTop: 8, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
            {t('mypage.plansHint')}
          </p>
          {trialActive ? (
            <p className="hint-text" style={{ marginTop: 8 }}>
              {t('mypage.trialActive', {
                date: new Date(sponsor.trial_ends_at).toLocaleDateString(
                  locale === 'en' ? 'en-US' : 'ko-KR'
                ),
              })}
            </p>
          ) : (
            <p className="hint-text" style={{ marginTop: 8 }}>
              {t('mypage.promoNote')}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => startCheckout('basic', 'month')}
            >
              {t('mypage.planBasicMonth')}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => startCheckout('basic', 'year')}
            >
              {t('mypage.planBasicYear')}
            </button>
            {sponsor.plan_tier !== 'extended' ? (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => startCheckout('upgrade', 'month')}
                >
                  {t('mypage.planProMonth')}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => startCheckout('upgrade', 'year')}
                >
                  {t('mypage.planProYear')}
                </button>
              </>
            ) : (
              <>
                <span className="hint-text">{t('mypage.proActive', { limit })}</span>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => startCheckout('extra_pack', 'month')}
                >
                  {t('mypage.extraPack')}
                </button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="mypage-section card">
          <div className="mypage-section-head">
            <h2 className="section-title" style={{ fontSize: 16, margin: 0 }}>
              {t('mypage.myProducts')}
            </h2>
            <span className="mypage-count">
              {activeCount}/{limit}
            </span>
          </div>
          {atLimit ? (
            <p className="hint-text" style={{ marginBottom: 12 }}>
              {t('mypage.atLimit')}
            </p>
          ) : null}
          <div className="mypage-empty-actions" style={{ marginBottom: 12 }}>
            <Link href="/mypage/shop/new" className="btn">
              {t('mypage.registerProduct')}
            </Link>
            <Link href={`/shop/seller/${sponsor.id}`} className="btn btn-outline">
              {t('mypage.viewStore')}
            </Link>
          </div>
          {products.length ? (
            <ul className="mypage-list">
              {products.map((p) => (
                <li key={p.id} className="mypage-list-row">
                  <div>
                    <Link href={`/shop/${p.id}`} className="mypage-post-link">
                      <strong>
                        <AutoTranslatedText text={p.title} />
                      </strong>
                    </Link>
                    <p className="mypage-list-sub">
                      {formatPriceCents(p.price_cents)}
                      {p.is_active === false
                        ? ` · ${t('mypage.private')}`
                        : ` · ${t('mypage.public')}`}
                    </p>
                  </div>
                  <div className="mypage-empty-actions" style={{ gap: 8 }}>
                    <Link href={`/mypage/shop/products/${p.id}/edit`} className="btn btn-outline">
                      {t('common.edit')}
                    </Link>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busyId === p.id}
                      onClick={() => toggleActive(p)}
                    >
                      {p.is_active === false ? t('mypage.public') : t('mypage.private')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busyId === p.id}
                      onClick={() => removeProduct(p)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mypage-empty">
              <p>{t('mypage.noShopProducts')}</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default function MyPageShopPage() {
  return (
    <Suspense
      fallback={
        <div className="container mypage">
          <div className="card empty-state">…</div>
        </div>
      }
    >
      <MyPageShopInner />
    </Suspense>
  );
}
