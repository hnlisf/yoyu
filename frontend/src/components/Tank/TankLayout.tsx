'use client';

import { ReactNode } from 'react';

interface TankLayoutProps {
  children: ReactNode;    // fish tank content (main stage)
  drawerSlot: ReactNode;  // bottom drawer content
}

/**
 * TankLayout — flex column layout for the tank detail page.
 * Responsive: mobile 65/35, tablet 60/40, desktop 60/40.
 * The fish tank area (children) takes flex: 1 with a min-height anchored
 * to viewport percentage, and the drawer caps at 40vh.
 */
export function TankLayout({ children, drawerSlot }: TankLayoutProps) {
  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
      {/* Fish tank area — stretches to fill space */}
      <div className="flex-1 flex flex-col min-h-[60vh] sm:min-h-[60vh] md:min-h-[60vh]">
        {children}
      </div>

      {/* Bottom drawer — max 40vh, flex-shrink-0 so it doesn't get squeezed */}
      <div className="flex-shrink-0" style={{ maxHeight: '40vh' }}>
        {drawerSlot}
      </div>
    </div>
  );
}
