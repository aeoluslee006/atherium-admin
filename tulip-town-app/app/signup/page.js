'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function formatAddressLine({ street, city, state, zip }) {
  return `${street}, ${city}, ${state} ${zip}`.replace(/\s+/g, ' ').trim();
}

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('MI');
  const [zip, setZip] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    const first = firstName.trim();
    const last = lastName.trim();
    const phoneValue = phone.trim();
    const streetValue = street.trim();
    const cityValue = city.trim();
    const stateValue = state.trim().toUpperCase();
    const zipValue = zip.trim();
    const publicId = normalizeUsername(username);

    try {
      if (!first || !last) {
        setError('First name과 Last name을 모두 입력해 주세요.');
        return;
      }
      if (!phoneValue) {
        setError('전화번호를 입력해 주세요.');
        return;
      }
      if (!streetValue || !cityValue || !stateValue || !zipValue) {
        setError('집주소(거리명, 도시, 주, 우편번호)를 모두 입력해 주세요.');
        return;
      }
      if (!/^[A-Z]{2}$/.test(stateValue)) {
        setError('주(State)를 선택해 주세요.');
        return;
      }
      if (!/^\d{5}(-\d{4})?$/.test(zipValue)) {
        setError('우편번호는 12345 또는 12345-6789 형식으로 입력해 주세요.');
        return;
      }
      if (!/^[a-z0-9._-]{3,20}$/.test(publicId)) {
        setError('아이디는 영문 소문자/숫자/._- 3~20자로 입력해 주세요.');
        return;
      }
      if (password !== passwordConfirm) {
        setError('비밀번호 확인이 일치하지 않습니다.');
        return;
      }

      const addressValue = formatAddressLine({
        street: streetValue,
        city: cityValue,
        state: stateValue,
        zip: zipValue,
      });

      const [{ data: takenByUsername }, { data: takenByDisplay }] = await Promise.all([
        supabase.from('profiles').select('id').eq('username', publicId).maybeSingle(),
        supabase.from('profiles').select('id').eq('display_name', publicId).maybeSingle(),
      ]);
      if (takenByUsername?.id || takenByDisplay?.id) {
        setError('이미 사용 중인 아이디입니다.');
        return;
      }

      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: first,
            last_name: last,
            phone: phoneValue,
            address: addressValue,
            address_street: streetValue,
            address_city: cityValue,
            address_state: stateValue,
            address_zip: zipValue,
            username: publicId,
            display_name: publicId,
          },
        },
      });
      if (signError) throw signError;

      if (data.user) {
        const fullProfile = {
          id: data.user.id,
          email,
          phone: phoneValue,
          first_name: first,
          last_name: last,
          address: addressValue,
          address_street: streetValue,
          address_city: cityValue,
          address_state: stateValue,
          address_zip: zipValue,
          username: publicId,
          display_name: publicId,
        };
        const { error: profileError } = await supabase.from('profiles').upsert(fullProfile);
        if (profileError) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            phone: phoneValue,
            display_name: publicId,
            address: addressValue,
          });
        }
      }

      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        setMessage('가입 확인 메일을 보냈습니다. 이메일을 확인해주세요.');
      }
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <h2 className="section-title">회원가입 · Sign up</h2>
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-row-2">
          <div>
            <label htmlFor="firstName">First name · 이름</label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <label htmlFor="lastName">Last name · 성</label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
        </div>

        <label htmlFor="phone">전화번호</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="예: 616-555-0100"
          autoComplete="tel"
          required
        />

        <label htmlFor="email">이메일</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <fieldset className="address-fieldset">
          <legend>집주소</legend>

          <label htmlFor="street">거리명 · Street</label>
          <input
            id="street"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 Main St"
            autoComplete="street-address"
            required
          />

          <div className="form-row-city-state-zip">
            <div className="form-field-city">
              <label htmlFor="city">도시 · City</label>
              <input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Holland"
                autoComplete="address-level2"
                required
              />
            </div>
            <div className="form-field-state">
              <label htmlFor="state">주 · State</label>
              <select
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                autoComplete="address-level1"
                required
              >
                {US_STATES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field-zip">
              <label htmlFor="zip">우편번호 · ZIP</label>
              <input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="49423"
                autoComplete="postal-code"
                inputMode="numeric"
                required
              />
            </div>
          </div>
        </fieldset>

        <label htmlFor="username">아이디</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="영문 소문자/숫자 3~20자"
          autoComplete="username"
          minLength={3}
          maxLength={20}
          required
        />
        <p className="field-help">글을 올릴 때 이 아이디가 공개됩니다. (로그인 이메일이 아닙니다)</p>

        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        <label htmlFor="passwordConfirm">비밀번호 확인</label>
        <input
          id="passwordConfirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        {error ? <div className="error-text">{error}</div> : null}
        {message ? <div className="hint-text">{message}</div> : null}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? '가입 중…' : '회원가입'}
        </button>
        <p className="hint-text" style={{ marginTop: 14 }}>
          이미 계정이 있나요? <Link href="/login">로그인</Link>
        </p>
      </form>
    </div>
  );
}
