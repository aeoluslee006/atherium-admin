'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MyPageAccountPanel({
  initialNickname = '',
  email = '',
  username = '',
  firstName = '',
  lastName = '',
}) {
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
      if (!next) throw new Error('닉네임을 입력해 주세요.');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: next })
        .eq('id', user.id);
      if (error) throw error;
      setProfileMsg('닉네임이 저장되었습니다.');
    } catch (err) {
      setProfileErr(err?.message || '저장에 실패했습니다.');
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
      if (password.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.');
      if (password !== passwordConfirm) throw new Error('비밀번호 확인이 일치하지 않습니다.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setPasswordConfirm('');
      setPwMsg('비밀번호가 변경되었습니다.');
    } catch (err) {
      setPwErr(err?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setSavingPw(false);
    }
  }

  async function sendResetEmail() {
    setPwMsg('');
    setPwErr('');
    if (!email) {
      setPwErr('이메일 주소가 없습니다.');
      return;
    }
    setSendingReset(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setPwMsg('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.');
    } catch (err) {
      setPwErr(err?.message || '재설정 메일 발송에 실패했습니다.');
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <>
      <section className="mypage-section card" aria-labelledby="mypage-account-title">
        <div className="mypage-section-head">
          <h2 id="mypage-account-title">내 정보</h2>
        </div>
        <dl className="mypage-dl">
          <div>
            <dt>이메일</dt>
            <dd>{email || '—'}</dd>
          </div>
          <div>
            <dt>아이디</dt>
            <dd>{username || '—'}</dd>
          </div>
          {(firstName || lastName) && (
            <div>
              <dt>이름</dt>
              <dd>{[firstName, lastName].filter(Boolean).join(' ') || '—'}</dd>
            </div>
          )}
        </dl>

        <form className="mypage-account-form" onSubmit={saveNickname}>
          <label htmlFor="mypage-nickname">
            닉네임
            <input
              id="mypage-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={40}
              required
            />
          </label>
          {profileErr ? <p className="error-text">{profileErr}</p> : null}
          {profileMsg ? <p className="hint-text" style={{ color: '#176b3a' }}>{profileMsg}</p> : null}
          <button type="submit" className="btn" disabled={savingProfile}>
            {savingProfile ? '저장 중…' : '닉네임 저장'}
          </button>
        </form>
      </section>

      <section className="mypage-section card" aria-labelledby="mypage-password-title">
        <div className="mypage-section-head">
          <h2 id="mypage-password-title">비밀번호 재설정</h2>
        </div>
        <p className="mypage-list-sub" style={{ marginBottom: 12 }}>
          로그인 상태에서 새 비밀번호로 바로 바꾸거나, 이메일로 재설정 링크를 받을 수 있습니다.
        </p>
        <form className="mypage-account-form" onSubmit={changePassword}>
          <label htmlFor="mypage-password">
            새 비밀번호
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
            새 비밀번호 확인
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
          {pwMsg ? <p className="hint-text" style={{ color: '#176b3a' }}>{pwMsg}</p> : null}
          <div className="mypage-empty-actions">
            <button type="submit" className="btn" disabled={savingPw}>
              {savingPw ? '변경 중…' : '비밀번호 변경'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={sendingReset || !email}
              onClick={sendResetEmail}
            >
              {sendingReset ? '메일 발송 중…' : '이메일로 재설정 링크 받기'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
