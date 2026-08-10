'use client';

import { STATIONERY_THEMES } from '../lib/stationery';

export default function StationeryPicker({ value, onChange, disabled }) {
  return (
    <fieldset className="stationery-fieldset" disabled={disabled}>
      <legend>
        편지지 <span className="required-mark">필수</span>
      </legend>
      <p className="hint-text stationery-hint">좋은글에 어울리는 편지지를 골라 주세요.</p>
      <div className="stationery-options" role="radiogroup" aria-label="편지지">
        {STATIONERY_THEMES.map((theme) => {
          const selected = value === theme.id;
          return (
            <label
              key={theme.id}
              className={`stationery-option letter-paper letter-paper--${theme.id}${
                selected ? ' is-selected' : ''
              }`}
            >
              <input
                type="radio"
                name="stationery"
                value={theme.id}
                checked={selected}
                onChange={() => onChange(theme.id)}
                required
              />
              <span className="stationery-option-name">{theme.nameKo}</span>
              <span className="stationery-option-lines" aria-hidden="true" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
