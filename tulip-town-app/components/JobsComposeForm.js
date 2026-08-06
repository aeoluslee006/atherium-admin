'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import JobLogoField from './JobLogoField';
import MarketBodyEditor from './MarketBodyEditor';
import {
  JOB_HIRE_BODY_TEMPLATE,
  JOB_ROLE_TAGS,
  JOB_TAGS,
  isValidJobTag,
} from '../lib/jobTags';

function plainTextFromHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ChicagoChinaRen-style jobs compose form: label-left rows, rich body, tag cloud.
 */
export default function JobsComposeForm({
  cities = [],
  saving = false,
  error = '',
  listHref = '/board/jobs',
  onSubmit,
}) {
  const [subcategory, setSubcategory] = useState('hire');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(JOB_HIRE_BODY_TEMPLATE);
  const [city, setCity] = useState(cities[0] || 'Holland');
  const [companyName, setCompanyName] = useState('');
  const [payText, setPayText] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [addressText, setAddressText] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [jobRoles, setJobRoles] = useState([]);
  const [hidePhone, setHidePhone] = useState(false);
  const [localError, setLocalError] = useState('');
  const templateSeeded = useRef(true);

  const selectedRoleSet = useMemo(() => new Set(jobRoles), [jobRoles]);

  function handleTypeChange(slug) {
    setSubcategory(slug);
    if (
      slug === 'hire' &&
      (!plainTextFromHtml(body) || body === JOB_HIRE_BODY_TEMPLATE || templateSeeded.current)
    ) {
      setBody(JOB_HIRE_BODY_TEMPLATE);
      templateSeeded.current = true;
    } else if (slug !== 'hire' && body === JOB_HIRE_BODY_TEMPLATE) {
      setBody('');
      templateSeeded.current = false;
    }
  }

  function toggleRole(slug) {
    setJobRoles((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    if (!isValidJobTag(subcategory)) {
      setLocalError('구분(구인/구직/알바)을 선택해 주세요.');
      return;
    }
    if (!title.trim()) {
      setLocalError('제목을 입력해 주세요.');
      return;
    }
    if (subcategory === 'hire' && !companyName.trim()) {
      setLocalError('구인 글에는 회사/상호명을 입력해 주세요.');
      return;
    }
    if (!plainTextFromHtml(body) && !/<img\s/i.test(body)) {
      setLocalError('내용을 입력하거나 사진을 넣어 주세요.');
      return;
    }

    const phone = hidePhone ? '' : contactPhone.trim();
    await onSubmit?.({
      subcategory,
      title: title.trim(),
      body,
      city,
      companyName: companyName.trim(),
      payText: payText.trim(),
      companyLogo: companyLogo || '',
      addressText: addressText.trim(),
      contactName: contactName.trim(),
      contactPhone: phone,
      contactEmail: contactEmail.trim(),
      jobRoles: jobRoles.join(','),
      hidePhone,
    });
  }

  const displayError = localError || error;

  return (
    <div className="jobs-compose-page">
      <div className="row-between jobs-compose-top">
        <h2 className="section-title">구인구직 글쓰기</h2>
        <Link href={listHref} className="btn btn-outline">
          목록
        </Link>
      </div>

      <form className="jobs-compose" onSubmit={handleSubmit}>
        <div className="jobs-compose-row">
          <div className="jobs-compose-label">
            유형 <span className="required-mark">필수</span>
          </div>
          <div className="jobs-compose-field">
            <div className="jobs-compose-radios" role="radiogroup" aria-label="유형">
              {JOB_TAGS.map((tag) => {
                const selected = subcategory === tag.slug;
                return (
                  <label
                    key={tag.slug}
                    className={`jobs-compose-radio${selected ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="job-type"
                      value={tag.slug}
                      checked={selected}
                      onChange={() => handleTypeChange(tag.slug)}
                    />
                    <span>{tag.nameKo}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="jobs-compose-row">
          <div className="jobs-compose-label">
            제목 <span className="required-mark">필수</span>
          </div>
          <div className="jobs-compose-field">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 서버/홀 스태프 모집 · Full-time"
              maxLength={120}
              required
            />
            <p className="field-help">제목은 목록에 그대로 보이니 직책·근무지를 함께 적어 주세요.</p>
          </div>
        </div>

        <div className="jobs-compose-row">
          <div className="jobs-compose-label">
            회사명 {subcategory === 'hire' ? <span className="required-mark">필수</span> : null}
          </div>
          <div className="jobs-compose-field">
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="예: Holland Bakery"
              required={subcategory === 'hire'}
            />
            <div className="jobs-compose-logo-block">
              <span className="jobs-compose-sublabel">회사 로고 (선택 · 1장)</span>
              <JobLogoField value={companyLogo} onChange={setCompanyLogo} disabled={saving} />
            </div>
          </div>
        </div>

        <div className="jobs-compose-row">
          <div className="jobs-compose-label">급여/조건</div>
          <div className="jobs-compose-field">
            <input
              value={payText}
              onChange={(e) => setPayText(e.target.value)}
              placeholder="예: $15+/hr · 팁 별도 · 주 5일"
            />
          </div>
        </div>

        <div className="jobs-compose-row jobs-compose-row--top">
          <div className="jobs-compose-label">
            내용 <span className="required-mark">필수</span>
          </div>
          <div className="jobs-compose-field">
            <MarketBodyEditor
              value={body}
              onChange={(html) => {
                templateSeeded.current = false;
                setBody(html);
              }}
              disabled={saving}
              ariaLabel="구인 광고 본문"
              showUploadButton
              helpText="사진은 버튼으로 넣거나, 본문에 붙여넣기(Ctrl+V)·드래그로 넣을 수 있습니다."
            />
          </div>
        </div>

        <div className="jobs-compose-row">
          <div className="jobs-compose-label">지역 / 주소</div>
          <div className="jobs-compose-field">
            <div className="jobs-compose-grid">
              <div>
                <span className="jobs-compose-sublabel">지역</span>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="jobs-compose-sublabel">상세 주소 (선택)</span>
                <input
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="예: 123 Main St, Holland, MI"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="jobs-compose-row jobs-compose-row--top">
          <div className="jobs-compose-label">연락처</div>
          <div className="jobs-compose-field">
            <div className="jobs-compose-grid jobs-compose-grid--3">
              <div>
                <span className="jobs-compose-sublabel">담당자</span>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="이름"
                />
              </div>
              <div>
                <span className="jobs-compose-sublabel">전화</span>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="예: 616-555-0100"
                />
              </div>
              <div>
                <span className="jobs-compose-sublabel">이메일</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="선택"
                />
              </div>
            </div>
            <p className="field-help">여러 번호는 쉼표로 구분해 주세요.</p>
          </div>
        </div>

        <div className="jobs-compose-row jobs-compose-row--top">
          <div className="jobs-compose-label">직종 태그</div>
          <div className="jobs-compose-field">
            <div className="jobs-role-cloud" role="group" aria-label="직종 태그">
              {JOB_ROLE_TAGS.map((tag) => {
                const on = selectedRoleSet.has(tag.slug);
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    className={`jobs-role-chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleRole(tag.slug)}
                    disabled={saving}
                  >
                    {tag.nameKo}
                  </button>
                );
              })}
            </div>
            <p className="field-help">해당되는 태그를 눌러 선택하세요. (여러 개 가능)</p>
          </div>
        </div>

        <div className="jobs-compose-row">
          <div className="jobs-compose-label">옵션</div>
          <div className="jobs-compose-field">
            <label className="jobs-compose-check">
              <input
                type="checkbox"
                checked={hidePhone}
                onChange={(e) => setHidePhone(e.target.checked)}
              />
              <span>전화번호를 공개하지 않기</span>
            </label>
          </div>
        </div>

        {displayError ? <div className="error-text jobs-compose-error">{displayError}</div> : null}

        <div className="jobs-compose-actions">
          <button className="btn jobs-compose-submit" type="submit" disabled={saving}>
            {saving ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
