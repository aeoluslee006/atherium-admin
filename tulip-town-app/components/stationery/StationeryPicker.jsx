'use client';

import { STATIONERY_OPTIONS } from '../../lib/stationery';

/**
 * @param {{ value: string, onChange: (id: string) => void, disabled?: boolean }} props
 */
export default function StationeryPicker({ value, onChange, disabled }) {
  return (
    <fieldset className="stationery-fieldset" disabled={disabled}>
      <legend>
        편지지 <span className="required-mark">필수</span>
      </legend>
      <p className="hint-text stationery-hint">
        모서리 삽화가 또렷하게 보이는 편지지를 골라 주세요. 홈/글 상세에 그대로 보입니다.
      </p>
      <div className="stationery-options" role="radiogroup" aria-label="편지지">
        {STATIONERY_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={`stationery-option${selected ? ' is-selected' : ''}`}
              style={{
                backgroundImage: `url('${option.file}')`,
                backgroundSize: 'contain',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <input
                type="radio"
                name="stationery"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                required
              />
              <span className="stationery-option-name">{option.name}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
