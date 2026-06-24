'use client';

import React from 'react';
import { BottomDrawer } from './BottomDrawer';

/**
 * v6.0 TankLayout — 60%/40% split layout.
 * - Top: fish swimming area (flex: 1, min 60vh)
 * - Bottom: expandable drawer (max 40vh) with 3 tabs
 *
 * Responsive:
 *   mobile  (<640px): 65% / 35%
 *   tablet  (640-1024px): 60% / 40%
 *   desktop (>1024px): 60% / 40%
 */
interface TankLayoutProps {
  /** Fish swim area content (TankStage / FishSwimPhysics) */
  fishArea: React.ReactNode;
  /** Tab contents for the bottom drawer */
  tabs: Array<{
    key: string;
    label: string;
    content: React.ReactNode;
  }>;
  className?: string;
}

export function TankLayout({ fishArea, tabs, className = '' }: TankLayoutProps) {
  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ minHeight: '100vh' }}
    >
      {/* Fish area — takes remaining space */}
      <div
        className="shrink-0"
        style={{
          height: 'clamp(60vh, 65vh, 65vh)',
          minHeight: '60vh',
        }}
      >
        {fishArea}
      </div>

      {/* Bottom drawer */}
      <BottomDrawer tabs={tabs} className="flex-shrink-0" />

      {/* Responsive adjustments via CSS custom properties + media queries */}
      <style jsx>{`
        @media (min-width: 640px) and (max-width: 1024px) {
          div:first-child {
            height: clamp(55vh, 60vh, 65vh) !important;
          }
        }
        @media (min-width: 1024px) {
          div:first-child {
            height: clamp(55vh, 60vh, 65vh) !important;
          }
        }
        @media (max-width: 639px) {
          div:first-child {
            height: clamp(60vh, 65vh, 70vh) !important;
          }
        }
      `}</style>
    </div>
  );
}
