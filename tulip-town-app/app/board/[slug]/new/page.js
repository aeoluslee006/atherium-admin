'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCategory } from '../../../../lib/categories';
import { supabase } from '../../../../lib/supabaseClient';

const CITIES = ['Holland', 'Grand Rapids', 'Zeeland', 'Hudsonville', 'Other'];

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const category = getCategory(params.slug);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [city, setCity] = useState('Holland');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('글을 쓰려면 로그인이 필요합니다.');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, banned_reason, suspended_until')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();
      if (profile?.is_banned) {
        setError(profile.banned_reason || '이용이 제한된 계정입니다.');
        return;
      }
      if (profile?.suspended_until && new Date(profile.suspended_until).getTime() > Date.now()) {
        setError(`계정이 ${new Date(profile.suspended_until).toLocaleString('ko-KR')}까지 정지되었습니다.`);
        return;
      }
      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({
          title,
          body,
          city,
          category_slug: params.slug,
          author_id: sessionData.session.user.id,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      router.push(`/post/${data.id}`);
    } catch (err) {
      setError(err.message || '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (!category) {
    return (
      <div className="container">
        <div className="card empty-state">존재하지 않는 게시판입니다.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row-between">
        <h2 className="section-title">
          {category.nameKo} 글쓰기
        </h2>
        <Link href={`/board/${params.slug}`} className="btn btn-outline">
          목록
        </Link>
      </div>
      <form className="card form-card" onSubmit={handleSubmit}>
        <label htmlFor="title">제목</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label htmlFor="city">지역</label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label htmlFor="body">내용</label>
        <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} required />
        {error ? <div className="error-text">{error}</div> : null}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? '등록 중…' : '등록'}
        </button>
      </form>
    </div>
  );
}
