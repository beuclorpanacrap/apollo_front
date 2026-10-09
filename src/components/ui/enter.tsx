import type { CSSProperties, ReactNode } from 'react';
import { Platform } from 'react-native';

type EnterProps = {
  children: ReactNode;
  /** `rise` (default): 8px up + fade, 280ms. `fade`: opacity only. `pop`: slight scale for dialogs/menus. */
  kind?: 'fade' | 'rise' | 'pop';
  /** Stagger in ms. */
  delay?: number;
  /** Fill the parent's flex space (for wrapping a `flex: 1` child). */
  grow?: boolean;
  style?: CSSProperties;
};

/**
 * One-shot entrance animation (see `.ap-enter*` in global.css). A real element rather than an RN
 * View so the CSS class can attach; it mimics a View (flex column, min-width 0). Remount it with a
 * `key` to replay (tab changes). Native renders the children untouched. Reduced motion → no motion.
 */
export function Enter({ children, kind = 'rise', delay = 0, grow, style }: EnterProps) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <div
      className={`ap-enter ap-enter-${kind}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        flex: grow ? '1 1 0%' : undefined,
        animationDelay: delay ? `${delay}ms` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
