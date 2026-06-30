'use client';

import React, { useEffect, useState } from 'react';
import { api, FishTank } from '@/lib/api';
import { CapacityBar } from '@/components/ui/CapacityBar';

const USER_ID = 'demo-user';

interface TankSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tankId: string) => void;
  /** Optional: filter out tanks that are already full */
  excludeFull?: boolean;
}

/**
 * v9.0 REQ-1: Tank selector bottom drawer for add-fish flow.
 * Lists all user's tanks with capacity progress bars.
 * Full tanks are greyed out and disabled.
 */
export function TankSelector({ isOpen, onClose, onSelect, excludeFull = true }: TankSelectorProps) {
  const [tanks, setTanks] = useState<FishTank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api<FishTank[]>(`/api/fish-tanks?userId=${USER_ID}`);
        if (!cancelled) setTanks(data);
      } catch {
        // tolerate
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-light text-text-primary">选择目标鱼缸</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
        </div>

        {loading ? (
          <p className="text-text-secondary text-sm font-light text-center py-8">加载中...</p>
        ) : tanks.length === 0 ? (
          <p className="text-text-secondary text-sm font-light text-center py-8">暂无鱼缸，请先创建</p>
        ) : (
          <div className="space-y-2">
            {tanks.map((tank) => {
              const capacity = tank.size === 'small' ? 6 : tank.size === 'medium' ? 12 : 30;
              const fishCount = tank.fish?.length ?? 0;
              const isFull = fishCount >= capacity;

              return (
                <button
                  key={tank.id}
                  disabled={isFull && excludeFull}
                  onClick={() => { onSelect(tank.id); onClose(); }}
                  className={`w-full text-left p-4 rounded-2xl border transition flex items-center gap-3
                    ${isFull && excludeFull
                      ? 'opacity-40 cursor-not-allowed border-glass-border'
                      : 'border-glass-border hover:border-brand-primary hover:bg-glass cursor-pointer'
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate">{tank.name}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {tank.size === 'small' ? '小型缸' : tank.size === 'medium' ? '中型缸' : '大型缸'}
                    </p>
                  </div>
                  <div className="w-36">
                    <CapacityBar size={tank.size} current={fishCount} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
