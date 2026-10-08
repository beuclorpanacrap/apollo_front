import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { Fonts } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useTheme } from '@/hooks/use-theme';

const LENGTH = 6;

type PinInputProps = {
  /** Exactly six entries, each `''` or a single digit. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Called whenever the person edits a digit (the parent clears its error). */
  onEdit?: () => void;
  /** Enter with all six digits present. There is deliberately no auto-submit on the 6th digit. */
  onSubmit: () => void;
  /** While validating / vault open: boxes keep focus and caret (unlike `disabled`) but ignore edits. */
  readOnly: boolean;
  invalid: boolean;
  /** id of the visible label element (the group is labelled by it). */
  labelId: string;
  describedBy?: string;
  /** Increment to move focus to the first box (after a wrong PIN, or when the vault closes). */
  focusRequest: number;
};

/**
 * Six single-digit boxes. Behaviour is unchanged from the original dashboard: typing advances, a multi-digit
 * value (autofill, IME) or a paste spreads across the boxes, Backspace on an empty box steps back,
 * Arrow keys move. Added: group semantics, Enter to submit, `readOnly` instead of `disabled` while
 * validating (so focus is never dropped), the focus-halo ring and a layout that fits 360px wide screens.
 */
export function PinInput({ value, onChange, onEdit, onSubmit, readOnly, invalid, labelId, describedBy, focusRequest }: PinInputProps) {
  const theme = useTheme();
  const { width } = useBreakpoint();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus after React has committed — focusing inside the same event as the state change hit a disabled input.
  useEffect(() => {
    if (focusRequest > 0) refs.current[0]?.focus();
  }, [focusRequest]);

  const put = (raw: string, index: number) => {
    if (readOnly) return;
    const clean = raw.replace(/\D/g, '').slice(0, LENGTH);
    onEdit?.();
    const next = [...value];
    if (!clean) next[index] = '';
    else [...clean].forEach((digit, offset) => {
      if (index + offset < LENGTH) next[index + offset] = digit;
    });
    onChange(next);
    if (clean) refs.current[Math.min(index + clean.length, LENGTH - 1)]?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (value.join('').length === LENGTH) onSubmit();
      return;
    }
    if (readOnly) return;
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      event.preventDefault();
      onChange(value.map((digit, i) => (i === index - 1 ? '' : digit)));
      refs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const phone = width < 600;
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-busy={readOnly || undefined}
      style={{ display: 'flex', gap: phone ? 8 : 12, width: '100%', maxWidth: 560 }}
    >
      {value.map((digit, index) => (
        <input
          key={index}
          id={`pin-${index}`}
          ref={(node) => {
            refs.current[index] = node;
          }}
          className="ap-field"
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          value={digit}
          readOnly={readOnly}
          onFocus={(event) => event.target.select()}
          onChange={(event) => put(event.target.value, index)}
          onPaste={(event) => {
            event.preventDefault();
            put(event.clipboardData.getData('text'), 0);
          }}
          onKeyDown={(event) => onKeyDown(event, index)}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            maxWidth: 84,
            height: phone ? 56 : 68,
            boxSizing: 'border-box',
            padding: 0,
            textAlign: 'center',
            fontFamily: Fonts.sans.semiBold,
            fontWeight: 600,
            fontSize: phone ? 24 : 28,
            fontVariantNumeric: 'tabular-nums',
            color: theme.text,
            borderRadius: phone ? 12 : 14,
            border: `1.5px solid ${theme.borderStrong}`,
            background: digit ? theme.pillGreenBg : theme.backgroundElement,
            cursor: readOnly ? 'default' : 'text',
          }}
        />
      ))}
    </div>
  );
}
