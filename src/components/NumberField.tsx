import { useEffect, useRef, useState } from 'react';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  id?: string;
  'aria-label': string;
  disabled?: boolean;
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * A number input that can be empty while it is being edited.
 *
 * Binding a number straight to the field turns a cleared box into "0"
 * immediately, so replacing 85 with 120 means deleting a 0 the field put back.
 * This keeps the visitor's own text until they leave the field, while still
 * reporting a clamped number on every keystroke so the budget stays live.
 */
export function NumberField({ value, onChange, min, max, step = 1, disabled, className, ...rest }: Props) {
  const [draft, setDraft] = useState(String(value));
  const editing = useRef(false);

  // Adopt changes made elsewhere, such as restoring the suggested costs.
  useEffect(() => {
    if (!editing.current && Number(draft) !== value) setDraft(String(value));
  }, [value, draft]);

  return (
    <input
      {...rest}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={className}
      value={draft}
      onFocus={() => { editing.current = true; }}
      onChange={event => {
        const next = event.target.value;
        setDraft(next);
        if (next.trim() === '') { onChange(min); return; }
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max));
      }}
      onBlur={() => {
        editing.current = false;
        const parsed = Number(draft);
        const settled = draft.trim() === '' || !Number.isFinite(parsed) ? min : clamp(parsed, min, max);
        setDraft(String(settled));
        onChange(settled);
      }}
    />
  );
}
