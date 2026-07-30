'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const CITIES = ['Holland', 'Grand Rapids', 'Zeeland', 'Hudsonville', 'Other'];

export default function NewBusinessPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('Holland');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('업체 등록은 로그인이 필요합니다.');
        return;
      }
      const { error: insertError } = await supabase.from('businesses').insert({
        name,
        category,
        city,
        phone,
        website,
        description,
        owner_id: sessionData.session.user.id,
      });
      if (insertError) throw insertError;
      router.push('/directory');
    } catch (err) {
      setError(err.message || '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <div className="row-between">
        <h2 className="section-title">업체 등록</h2>
        <Link href="/directory" className="btn btn-outline">
          목록
        </Link>
      </div>
      <form className="card form-card" onSubmit={handleSubmit}>
        <label htmlFor="name">업체명</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <label htmlFor="category">업종</label>
        <input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="식당, 미용실, 보험 등"
        />
        <label htmlFor="city">지역</label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label htmlFor="phone">전화</label>
        <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label htmlFor="website">웹사이트</label>
        <input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <label htmlFor="description">소개</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error ? <div className="error-text">{error}</div> : null}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? '등록 중…' : '등록'}
        </button>
      </form>
    </div>
  );
}
