import { View } from 'react-native';

import { PortalShell } from '@/components/portal/portal-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { Radii, Space } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { webProps, webStyle } from '@/utils/web-props';

/**
 * What the portal shows while auth resolves: the header (brand only) plus skeleton blocks that match the
 * hero and card heights, so real content arrives without layout shift. `aria-busy` marks <main>.
 */
export function PortalLoading({ title, active = 'dashboard' }: { title: string; active?: 'dashboard' | 'profile' }) {
  const { isPhone, width } = useBreakpoint();
  const wide = width >= 900;
  return (
    <PortalShell active={active} title={title} loading>
      <View {...webProps({ 'aria-label': 'Loading', role: 'status' })} style={{ gap: Space[6] }}>
        <Skeleton height={isPhone ? 190 : 176} radius={isPhone ? Radii.xl : Radii.xxl} />
        <View style={[{ gap: Space[6] }, wide ? webStyle({ flexDirection: 'row', alignItems: 'flex-start' }) : null]}>
          <View style={{ flex: wide ? 1.45 : undefined, gap: Space[4] }}>
            <Skeleton height={wide ? 460 : 400} radius={Radii.xl} />
          </View>
          <View style={{ flex: wide ? 1 : undefined, gap: Space[4] }}>
            <Skeleton height={wide ? 460 : 260} radius={Radii.xl} />
          </View>
        </View>
      </View>
    </PortalShell>
  );
}
