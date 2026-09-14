'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { IconLock, IconUser } from './MyPageIcons';
import { useLocale } from './LocaleProvider';

export default function MyPageAccountPanel({
  initialNickname = '',
  email = '',
  username = '',
  firstName = '',
  lastName = '',
}) {
  const { t } = useLocale();
  const [nickname, setNickname] = useState(initialNickname || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  async function saveNickname(e) {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setSavingProfile(true);
    try {
      const next = nickname.trim();
      if (!next) throw new Error(t('mypage.needNickname'));
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t('mypage.needLogin'));

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: next })
        .eq('id', user.id);
      if (error) throw error;
      setProfileMsg(t('mypage.nicknameSaved'));
    } catch (err) {
      setProfileErr(err?.message || t('mypage.saveFailed'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg('');
    setPwErr('');
    setSavingPw(true);
    try {
      if (password.length < 6) throw new Error(t('mypage.passwordMin'));
      if (password !== passwordConfirm) throw new Error(t('auth.passwordMismatch'));
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setPasswordConfirm('');
      setPwMsg(t('mypage.passwordChanged'));
    } catch (err) {
      setPwErr(err?.message || t('mypage.passwordChangeFailed'));
    } finally {
      setSavingPw(false);
    }
  }

  async function sendResetEmail() {
    setPwMsg('');
    setPwErr('');
    if (!email) {
      setPwErr(t('mypage.noEmail'));
      return;
    }
    setSendingReset(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setPwMsg(t('mypage.resetSent'));
    } catch (err) {
      setPwErr(err?.message || t('mypage.resetFailed'));
    } finally {
      setSendingReset(false);
    }
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return (
    <section id="mypage-account" className="mypage-section card" aria-labelledby="mypage-account-title">
      <div className="mypage-section-head">
        <h2 id="mypage-account-title" className="mypage-section-title">
          <span className="mypage-section-icon" aria-hidden="true">
            <IconUser />
          </span>
          {t('mypage.account')}
        </h2>
      </div>

      <div className="mypage-account-meta">
        <div>
          <span className="mypage-account-label">{t('auth.email')}</span>
          <strong>{email || '—'}</strong>
        </div>
        <div>
          <span className="mypage-account-label">{t('auth.username')}</span>
          <strong>{username || '—'}</strong>
        </div>
        {fullName ? (
          <div>
            <span className="mypage-account-label">{t('mypage.name')}</span>
            <strong>{fullName}</strong>
          </div>
        ) : null}
      </div>

      <form className="mypage-account-form mypage-account-form--compact" onSubmit={saveNickname}>
        <label htmlFor="mypage-nickname">
          {t('mypage.nickname')}
          <input
            id="mypage-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={40}
            required
          />
        </label>
        {profileErr ? <p className="error-text">{profileErr}</p> : null}
        {profileMsg ? (
          <p className="hint-text" style={{ color: '#176b3a' }}>
            {profileMsg}
          </p>
        ) : null}
        <button type="submit" className="btn" disabled={savingProfile}>
          {savingProfile ? t('common.saving') : t('mypage.saveNickname')}
        </button>
      </form>

      <details className="mypage-details">
        <summary>
          <span className="mypage-section-icon" aria-hidden="true">
            <IconLock />
          </span>
          {t('mypage.changePassword')}
        </summary>
        <form className="mypage-account-form mypage-account-form--compact" onSubmit={changePassword}>
          <label htmlFor="mypage-password">
            {t('mypage.newPassword')}
            <input
              id="mypage-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <label htmlFor="mypage-password-confirm">
            {t('mypage.newPasswordConfirm')}
            <input
              id="mypage-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          {pwErr ? <p className="error-text">{pwErr}</p> : null}
          {pwMsg ? (
            <p className="hint-text" style={{ color: '#176b3a' }}>
              {pwMsg}
            </p>
          ) : null}
          <div className="mypage-empty-actions">
            <button type="submit" className="btn" disabled={savingPw}>
              {savingPw ? t('mypage.changing') : t('mypage.changePassword')}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={sendingReset || !email}
              onClick={sendResetEmail}
            >
              {sendingReset ? t('mypage.sendingMail') : t('mypage.resetByEmail')}
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
