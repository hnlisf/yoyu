'use client';

import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Toast } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/Switch';
import { FAB } from '@/components/ui/FAB';
import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';

/**
 * Temporary UI Kit demo page for Ada's automated testing.
 * Mounted at /[locale]/ui-kit-demo — exercises every UI component.
 */
export default function UIKitDemoPage() {
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [swOn, setSwOn] = useState(true);
  const [swOff, setSwOff] = useState(false);
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);

  const iconNames = [
    'bubble', 'fish', 'water', 'trophy', 'feed', 'add', 'edit', 'health',
    'home', 'species', 'reminder', 'stats', 'profile', 'settings', 'back',
  ];

  return (
    <div className="space-y-6 p-4" data-testid="ui-kit-root">
      <h1 className="text-2xl font-light text-text-primary">UI Kit Demo</h1>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">Buttons</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary">Primary Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button onMouseEnter={() => {}} data-testid="btn-hover">Hover me</Button>
        </div>
      </section>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">GlassCard</h2>
        <GlassCard className="p-4">
          <p className="text-sm text-text-primary">Glass card content with backdrop-blur</p>
        </GlassCard>
        <GlassCard hover className="p-4 mt-2">
          <p className="text-sm text-text-primary">Hover glass card (translateY -3px on hover)</p>
        </GlassCard>
      </section>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">Tags / PillTag</h2>
        <div className="flex gap-2 flex-wrap">
          <Tag variant="primary">primary</Tag>
          <Tag variant="success">success</Tag>
          <Tag variant="warning">warning</Tag>
          <Tag variant="warning">warning-2</Tag>
          <Tag variant="gold">gold</Tag>
          <Tag variant="neutral">neutral</Tag>
          <Tag variant="orange">orange</Tag>
        </div>
      </section>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">Input</h2>
        <div className="space-y-2">
          <Input placeholder="focus state" />
          <Input placeholder="disabled" disabled />
          <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="controlled" />
        </div>
      </section>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">ProgressBar</h2>
        <ProgressBar value={0} />
        <div className="mt-2" />
        <ProgressBar value={50} />
        <div className="mt-2" />
        <ProgressBar value={100} />
        <div className="mt-2" />
        <ProgressBar value={75} variant="health" />
      </section>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">Modal / BottomSheet / Toast</h2>
        <div className="flex gap-2">
          <Button onClick={() => setModal(true)}>Open Modal</Button>
          <Button onClick={() => setSheet(true)}>Open BottomSheet</Button>
          <Button onClick={() => setToast('Hello from toast')}>Show Toast</Button>
        </div>
        <Modal open={modal} onClose={() => setModal(false)} title="Modal title">
          <p className="text-sm text-text-primary">Modal body</p>
        </Modal>
        <BottomSheet open={sheet} onClose={() => setSheet(false)}>
          <p className="text-sm text-text-primary">BottomSheet body</p>
        </BottomSheet>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </section>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">Switch</h2>
        <div className="flex items-center gap-3">
          <Switch checked={swOn} onChange={setSwOn} label="On" />
          <Switch checked={swOff} onChange={setSwOff} label="Off" />
        </div>
      </section>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">FAB</h2>
        <p className="text-xs text-text-secondary">Fixed bottom-right (see overlay)</p>
        <FAB onClick={() => alert('FAB clicked')} />
      </section>

      <section>
        <h2 className="text-sm text-text-secondary mb-2">Icons (15 SVG)</h2>
        <div className="flex flex-wrap gap-3">
          {iconNames.map((n) => (
            <span key={n} className="flex flex-col items-center gap-1 text-[10px] text-text-secondary">
              <Icon name={n as any} size={22} />
              <span>{n}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
