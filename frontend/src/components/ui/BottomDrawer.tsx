'use client';

import { useState, ReactNode } from 'react';

export interface DrawerTab {
  label: string;
  content: ReactNode;
}

interface BottomDrawerProps {
  tabs: DrawerTab[];
  defaultTab?: number;
}

/**
 * BottomDrawer — collapsible bottom sheet with tab bar.
 * Collapsed: shows tab bar with labels only.
 * Expanded: max 40vh, shows content for selected tab.
 * Smooth CSS transition for expand/collapse via max-height.
 */
export function BottomDrawer({ tabs, defaultTab = 0 }: BottomDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div
      className={`relative glass-card rounded-t-2xl rounded-b-none transition-all duration-300 ease-out ${
        expanded ? 'overflow-y-auto' : 'overflow-hidden'
      }`}
      style={{ maxHeight: expanded ? '40vh' : 'auto' }}
    >
      {/* Drag handle / header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-col items-center pt-2 pb-1 focus:outline-none"
        aria-label={expanded ? 'Collapse drawer' : 'Expand drawer'}
      >
        <span className="w-8 h-1 rounded-full bg-glass-border" />
      </button>

      {/* Tab bar — always visible */}
      <div className="flex gap-0 px-3 pb-2">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(idx);
              if (!expanded) setExpanded(true);
            }}
            className={`flex-1 text-center py-2 text-xs font-light transition-colors border-b-2 ${
              activeTab === idx
                ? 'text-accent border-accent'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Expanded content */}
      <div
        className={`transition-all duration-300 ease-out ${
          expanded ? 'opacity-100 max-h-[32vh] overflow-y-auto' : 'opacity-0 max-h-0 overflow-hidden'
        }`}
      >
        <div className="px-4 pb-6 pt-2">
          {tabs[activeTab]?.content}
        </div>
      </div>
    </div>
  );
}
