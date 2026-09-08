'use client';

import { useMemo, useState } from 'react';

const TABS = [
  { id: 'account', label: '계정' },
  { id: 'business', label: '비즈니스' },
  { id: 'contact', label: '문의' },
];

export default function MyPageTabs({ account, business, contact, defaultTab = 'account' }) {
  const initial = TABS.some((t) => t.id === defaultTab) ? defaultTab : 'account';
  const [tab, setTab] = useState(initial);

  const panels = useMemo(
    () => ({
      account,
      business,
      contact,
    }),
    [account, business, contact]
  );

  return (
    <div className="mypage-tabs">
      <div className="mypage-tablist-wrap">
        <div className="mypage-tablist" role="tablist" aria-label="마이페이지 섹션">
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`mypage-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`mypage-panel-${item.id}`}
                className={`mypage-tab${selected ? ' is-active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <label className="mypage-tab-select-wrap">
          <span className="sr-only">마이페이지 섹션</span>
          <select
            className="mypage-tab-select"
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            aria-label="마이페이지 섹션"
          >
            {TABS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {TABS.map((item) => {
        const selected = tab === item.id;
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={`mypage-panel-${item.id}`}
            aria-labelledby={`mypage-tab-${item.id}`}
            hidden={!selected}
            className="mypage-tabpanel"
          >
            {panels[item.id]}
          </div>
        );
      })}
    </div>
  );
}
