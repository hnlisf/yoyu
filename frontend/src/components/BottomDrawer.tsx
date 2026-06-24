'use client';

import React, { useState } from 'react';

/**
 * v6.0 BottomDrawer — expandable drawer with 3 tabs.
 * - Collapsed: only shows tab bar with 3 labels
 * - Expanded: shows tab content up to 40vh
 */
interface BottomDrawerProps {
  tabs: Array<{
    key: string;
    label: string;
    content: React.ReactNode;
  }>;
  defaultExpanded?: boolean;
  className?: string;
}

export function BottomDrawer({
  tabs,
  defaultExpanded = false,
  className = '',
}: BottomDrawerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? '');

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Tab bar */}
      <div
        className="flex items-center border-t border-glass-border bg-glass/30 backdrop-blur-sm cursor-pointer shrink-0"
        onClick={() => setExpanded(!expanded)}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 py-2.5 text-xs font-light tracking-wide transition-colors
              ${activeTab === tab.key && expanded
                ? 'text-accent border-t-2 border-accent -mt-px'
                : 'text-text-secondary hover:text-text-primary'
              }`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(tab.key);
              if (!expanded) setExpanded(true);
            }}
          >
            {tab.label}
          </button>
        ))}
        {/* Expand indicator */}
        <span
          className="text-text-secondary text-xs px-3 transition-transform duration-300"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </div>

      {/* Drawer content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out bg-glass/10 backdrop-blur-sm"
        style={{
          maxHeight: expanded ? '40vh' : '0',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: '40vh' }}>
          {tabs.find((t) => t.key === activeTab)?.content}
        </div>
      </div>
    </div>
  );
}
