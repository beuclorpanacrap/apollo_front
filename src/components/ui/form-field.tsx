import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, type AppTheme } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useTheme } from '@/hooks/use-theme';

/**
 * Form primitives for the clinician portal (web). One pattern everywhere: label above, optional help,
 * inline error (`role="alert"`, linked with `aria-describedby`/`aria-invalid`), `borderStrong` outlines
 * (≥ 3:1), accessible placeholder token, 46px minimum height, and no native "required" tooltips
 * (we use `aria-required` and show our own errors).
 *
 * The controls are real <input>/<textarea>/<select> elements so password managers, autofill, IME and
 * native date pickers keep working. Base look is inline from theme tokens; hover / focus / invalid /
 * disabled states live in `.ap-field` (global.css) and follow the theme through CSS variables.
 */

type IconName = ComponentProps<typeof Ionicons>['name'];

export type FieldMeta = {
  label: string;
  help?: string;
  error?: string | null;
  /** Shown as "Optional"; everything else is treated as required (announced via aria-required). */
  optional?: boolean;
  /** Visually hide the label but keep it for assistive tech (e.g. a search box). */
  hideLabel?: boolean;
  id?: string;
};

type A11y = {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
  'aria-required'?: true;
};

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function controlStyle(theme: AppTheme, fontSize = 15): CSSProperties {
  return {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 46,
    margin: 0,
    padding: '10px 14px',
    borderRadius: 12,
    border: `1.5px solid ${theme.borderStrong}`,
    background: theme.backgroundElement,
    color: theme.text,
    fontFamily: Fonts.sans.regular,
    fontSize,
    lineHeight: '22px',
    WebkitAppearance: 'none',
    appearance: 'none',
  };
}

/** Wraps a control with its label, help text and error, and hands the control its aria wiring. */
export function FormField({
  label,
  help,
  error,
  optional,
  hideLabel,
  id: idProp,
  counter,
  children,
}: FieldMeta & { counter?: { count: number; max: number }; children: (a11y: A11y) => ReactNode }) {
  const theme = useTheme();
  const auto = useId();
  const id = idProp ?? `field-${auto.replace(/:/g, '')}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ');

  const a11y: A11y = {
    id,
    ...(error ? { 'aria-invalid': true as const } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(!optional ? { 'aria-required': true as const } : {}),
  };

  const nearLimit = counter ? counter.count >= counter.max * 0.9 : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <label
        htmlFor={id}
        style={
          hideLabel
            ? visuallyHidden
            : {
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                fontFamily: Fonts.sans.semiBold,
                fontWeight: 600,
                fontSize: 14,
                lineHeight: '20px',
                color: theme.text,
              }
        }
      >
        {label}
        {optional && !hideLabel ? (
          <span style={{ fontWeight: 500, fontSize: 13, color: theme.textMuted }}>Optional</span>
        ) : null}
      </label>

      {children(a11y)}

      {help ? (
        <div id={helpId} style={{ fontFamily: Fonts.sans.regular, fontSize: 13, lineHeight: '18px', color: theme.textMuted }}>
          {help}
        </div>
      ) : null}
      {error ? (
        <div
          id={errorId}
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            fontFamily: Fonts.sans.medium,
            fontWeight: 500,
            fontSize: 13,
            lineHeight: '18px',
            color: theme.dangerText,
          }}
        >
          <View style={{ marginTop: 1 }}>
            <Ionicons name="alert-circle" size={15} color={theme.dangerText} />
          </View>
          <span>{error}</span>
        </div>
      ) : null}
      {counter ? (
        <div
          style={{
            alignSelf: 'flex-end',
            fontFamily: Fonts.sans.regular,
            fontSize: 12,
            lineHeight: '16px',
            color: nearLimit ? theme.dangerText : theme.textMuted,
          }}
        >
          {counter.count.toLocaleString()} / {counter.max.toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}

type TextFieldProps = FieldMeta & {
  value: string;
  onChangeText: (value: string) => void;
  name?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'search' | 'url';
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  spellCheck?: boolean;
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'search' | 'send';
  leadingIcon?: IconName;
  /** Unit or hint shown inside the field, right-aligned (e.g. "mg/dL"). */
  suffix?: string;
  /** Shows a clear (×) button while there is text (search boxes). */
  onClear?: () => void;
  /** Show "n / max" once the text reaches `counterFrom` characters (needs `maxLength`). */
  counterFrom?: number;
  /** Password fields: adds a show/hide toggle (`aria-pressed`). */
  revealable?: boolean;
  onBlur?: () => void;
  onEnter?: () => void;
  inputRef?: Ref<HTMLInputElement>;
};

export function TextField({
  value,
  onChangeText,
  name,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
  disabled,
  readOnly,
  autoFocus,
  spellCheck,
  enterKeyHint,
  leadingIcon,
  suffix,
  onClear,
  counterFrom,
  revealable,
  onBlur,
  onEnter,
  inputRef,
  ...meta
}: TextFieldProps) {
  const theme = useTheme();
  const { isPhone } = useBreakpoint();
  const [revealed, setRevealed] = useState(false);
  const clearable = !!onClear && value.length > 0;
  const showToggle = !!revealable && type === 'password';

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onEnter) {
      event.preventDefault();
      onEnter();
    }
  };

  return (
    <FormField {...meta} counter={counterFrom != null && maxLength && value.length >= counterFrom ? { count: value.length, max: maxLength } : undefined}>
      {(a11y) => (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {leadingIcon ? (
            <View style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}>
              <Ionicons name={leadingIcon} size={18} color={theme.textMuted} />
            </View>
          ) : null}
          <input
            {...a11y}
            ref={inputRef}
            className="ap-field"
            name={name}
            type={showToggle && revealed ? 'text' : type}
            value={value}
            inputMode={inputMode}
            autoComplete={autoComplete}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            spellCheck={spellCheck}
            enterKeyHint={enterKeyHint}
            onChange={(event) => onChangeText(event.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            style={{
              ...controlStyle(theme, isPhone ? 16 : 15),
              paddingLeft: leadingIcon ? 42 : 14,
              paddingRight: clearable || showToggle ? 48 : suffix ? 14 + suffix.length * 8 + 8 : 14,
            }}
          />
          {suffix ? (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                right: 14,
                pointerEvents: 'none',
                fontFamily: Fonts.sans.medium,
                fontWeight: 500,
                fontSize: 14,
                color: theme.textMuted,
              }}
            >
              {suffix}
            </span>
          ) : null}
          {showToggle ? (
            <button
              type="button"
              className="ap-reset ap-focus"
              aria-label={revealed ? 'Hide password' : 'Show password'}
              aria-pressed={revealed}
              disabled={disabled}
              onClick={() => setRevealed((value) => !value)}
              style={{
                position: 'absolute',
                right: 6,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
              }}
            >
              <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
            </button>
          ) : null}
          {clearable ? (
            <button
              type="button"
              className="ap-focus"
              aria-label="Clear search"
              onClick={onClear}
              style={{
                position: 'absolute',
                right: 6,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 0,
                borderRadius: 17,
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </button>
          ) : null}
        </div>
      )}
    </FormField>
  );
}

type TextAreaProps = FieldMeta & {
  value: string;
  onChangeText: (value: string) => void;
  name?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  /** Rows before it starts growing (default 4) and where it stops and scrolls (default 10). */
  minRows?: number;
  maxRows?: number;
  showCounter?: boolean;
  onBlur?: () => void;
  inputRef?: Ref<HTMLTextAreaElement>;
};

const LINE = 22;
const VERTICAL_PADDING = 20 + 3; // padding + border

export function TextArea({
  value,
  onChangeText,
  name,
  placeholder,
  maxLength,
  disabled,
  minRows = 4,
  maxRows = 10,
  showCounter,
  onBlur,
  inputRef,
  ...meta
}: TextAreaProps) {
  const theme = useTheme();
  const { isPhone } = useBreakpoint();
  const local = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow between minRows and maxRows; beyond that it scrolls.
  useLayoutEffect(() => {
    const el = local.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = maxRows * LINE + VERTICAL_PADDING;
    const wanted = Math.max(el.scrollHeight + 3, minRows * LINE + VERTICAL_PADDING);
    el.style.height = `${Math.min(wanted, max)}px`;
    el.style.overflowY = wanted > max ? 'auto' : 'hidden';
  }, [value, minRows, maxRows]);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    local.current = node;
    if (typeof inputRef === 'function') inputRef(node);
    else if (inputRef) (inputRef as { current: HTMLTextAreaElement | null }).current = node;
  };

  return (
    <FormField {...meta} counter={showCounter && maxLength ? { count: value.length, max: maxLength } : undefined}>
      {(a11y) => (
        <textarea
          {...a11y}
          ref={setRefs}
          className="ap-field"
          name={name}
          value={value}
          rows={minRows}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          onChange={(event) => onChangeText(event.target.value)}
          onBlur={onBlur}
          style={{ ...controlStyle(theme, isPhone ? 16 : 15), resize: 'none', display: 'block', overflowY: 'hidden' }}
        />
      )}
    </FormField>
  );
}

type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectFieldProps = FieldMeta & {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  name?: string;
  disabled?: boolean;
  /** Renders a disabled empty first option such as "Choose a role". */
  placeholderOption?: string;
  onBlur?: () => void;
};

/** A real <select> (native menus, keyboard type-ahead, mobile pickers) dressed in the same tokens. */
export function SelectField({ value, onValueChange, options, name, disabled, placeholderOption, onBlur, ...meta }: SelectFieldProps) {
  const theme = useTheme();
  const { isPhone } = useBreakpoint();
  return (
    <FormField {...meta}>
      {(a11y) => (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            {...a11y}
            className="ap-field ap-focus"
            name={name}
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
            onBlur={onBlur}
            style={{ ...controlStyle(theme, isPhone ? 16 : 15), paddingRight: 44, cursor: 'pointer', textOverflow: 'ellipsis' }}
          >
            {placeholderOption ? (
              <option value="" disabled>
                {placeholderOption}
              </option>
            ) : null}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <View style={{ position: 'absolute', right: 14, pointerEvents: 'none' }}>
            <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
          </View>
        </div>
      )}
    </FormField>
  );
}

type DateFieldProps = FieldMeta & {
  value: string;
  onValueChange: (value: string) => void;
  /** `date` → yyyy-mm-dd · `datetime-local` → yyyy-mm-ddThh:mm */
  kind?: 'date' | 'datetime-local';
  name?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  onBlur?: () => void;
};

/** Native date / datetime-local input (OS-quality pickers, locale aware) in portal styling. */
export function DateField({ value, onValueChange, kind = 'date', name, min, max, disabled, onBlur, ...meta }: DateFieldProps) {
  const theme = useTheme();
  const { isPhone } = useBreakpoint();
  return (
    <FormField {...meta}>
      {(a11y) => (
        <input
          {...a11y}
          className="ap-field"
          type={kind}
          name={name}
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onBlur}
          style={{ ...controlStyle(theme, isPhone ? 16 : 15), fontVariantNumeric: 'tabular-nums' }}
        />
      )}
    </FormField>
  );
}

/** Plain text label that reads like the field labels (for read-only groups next to fields). */
export function FieldLabelText({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={{ fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 14, lineHeight: 20, color: theme.text }}>
      {children}
    </Text>
  );
}

type RadioOption = { value: string; label: string; description?: string };

/**
 * Radio group rendered as selectable cards. Real `<input type="radio">` elements (visually hidden) sit
 * inside each label, so arrow-key navigation, grouping and screen-reader semantics are the browser's own;
 * `:focus-within` draws the focus ring on the card (global.css `.ap-radio-card`).
 */
export function RadioCards({
  legend,
  name,
  value,
  onValueChange,
  options,
  disabled,
  error,
  columns = 2,
}: {
  legend: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly RadioOption[];
  disabled?: boolean;
  error?: string | null;
  columns?: 1 | 2;
}) {
  const theme = useTheme();
  const id = useId().replace(/:/g, '');
  const errorId = `${id}-error`;
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <legend
        style={{ padding: 0, marginBottom: 6, fontFamily: Fonts.sans.semiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', color: theme.text }}
      >
        {legend}
      </legend>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 10 }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className="ap-radio-card"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                minHeight: 52,
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: 12,
                border: `1.5px solid ${selected ? theme.focusRing : theme.borderStrong}`,
                background: selected ? theme.pillGreenBg : theme.backgroundElement,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.65 : 1,
              }}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onValueChange(option.value)}
                className="ap-visually-hidden"
              />
              <span aria-hidden style={{ marginTop: 1, display: 'inline-flex' }}>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? theme.accentText : theme.textMuted} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontFamily: Fonts.sans.semiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', color: theme.text }}>{option.label}</span>
                {option.description ? (
                  <span style={{ fontFamily: Fonts.sans.regular, fontSize: 13, lineHeight: '18px', color: theme.textMuted }}>{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <div id={errorId} role="alert" style={{ display: 'flex', gap: 6, fontFamily: Fonts.sans.medium, fontWeight: 500, fontSize: 13, lineHeight: '18px', color: theme.dangerText }}>
          <Ionicons name="alert-circle" size={15} color={theme.dangerText} />
          <span>{error}</span>
        </div>
      ) : null}
    </fieldset>
  );
}
