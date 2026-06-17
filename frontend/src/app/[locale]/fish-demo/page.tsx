'use client';
// TEMP demo page for Ada's FishGrow v4.1 test — shows all 5 fish variants + UI Kit
import { FishAvatar, FISH_VARIANTS, slugToVariant } from '@/components/fish';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Toast } from '@/components/ui/Toast';
import { FAB } from '@/components/ui/FAB';
import { Icon, IconName } from '@/components/ui/Icon';

const ICON_NAMES: IconName[] = [
  'feed','water','treat','health','fish','fishCount','bubble',
  'growth','mood','trophy','add','back','edit','close','check'
];
import { useState } from 'react';

export default function FishDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [inputVal, setInputVal] = useState('');

  return (
    <div className="min-h-screen bg-deep-sea p-4 pb-32">
      <h1 className="text-2xl font-light text-text-primary mb-4">Fish SVG Test Page</h1>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">5 Fish Variants (large)</h2>
        <GlassCard className="p-4">
          <div className="grid grid-cols-5 gap-2">
            {FISH_VARIANTS.map((v) => (
              <div key={v} className="text-center">
                <FishAvatar variant={v} size={80} />
                <p className="text-xs text-text-secondary mt-1">{v}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">Multi-instance test (gradient ID isolation)</h2>
        <GlassCard className="p-4">
          <div className="flex gap-2 items-end">
            {[1,2,3,4].map(i => <FishAvatar key={i} variant="guppy" size={60} />)}
            {[1,2,3,4].map(i => <FishAvatar key={i} variant="betta" size={60} />)}
          </div>
          <p className="text-xs text-text-secondary mt-2">4 guppies + 4 bettas — gradients should not collide</p>
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">Stage scaling (fry/juvenile/subadult/adult)</h2>
        <GlassCard className="p-4">
          <div className="grid grid-cols-4 gap-4">
            {(['fry', 'juvenile', 'subadult', 'adult'] as const).map(stage => (
              <div key={stage} className="text-center">
                <FishAvatar variant="goldfish" stage={stage} size={80} />
                <p className="text-xs text-text-secondary mt-1">{stage}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">UI Kit — Buttons</h2>
        <GlassCard className="p-4 flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button disabled>Disabled</Button>
            <Button>中文按钮</Button>
            <Button>English Button</Button>
          </div>
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">UI Kit — Tags</h2>
        <GlassCard className="p-4 flex gap-2 flex-wrap">
          <Tag variant="primary">primary</Tag>
          <Tag variant="success">success</Tag>
          <Tag variant="warning">warning</Tag>
          <Tag variant="orange">orange</Tag>
          <Tag variant="gold">gold</Tag>
          <Tag variant="neutral">neutral</Tag>
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">UI Kit — ProgressBar</h2>
        <GlassCard className="p-4 flex flex-col gap-3">
          <ProgressBar value={0} />
          <ProgressBar value={50} />
          <ProgressBar value={100} />
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">UI Kit — Input</h2>
        <GlassCard className="p-4 flex flex-col gap-3">
          <Input placeholder="Focused input" autoFocus />
          <Input placeholder="Disabled input" disabled />
          <Input placeholder="With value" value={inputVal} onChange={e => setInputVal(e.target.value)} />
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">UI Kit — Switch</h2>
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <Switch checked={switchOn} onChange={setSwitchOn} />
            <span className="text-text-secondary">{switchOn ? 'ON' : 'OFF'}</span>
          </div>
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">UI Kit — Modal / BottomSheet / Toast</h2>
        <GlassCard className="p-4 flex gap-2 flex-wrap">
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Button onClick={() => setSheetOpen(true)}>Open BottomSheet</Button>
          <Button onClick={() => { setToastVisible(true); setTimeout(() => setToastVisible(false), 3000); }}>
            Show Toast
          </Button>
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">UI Kit — Icons (15 SVG)</h2>
        <GlassCard className="p-4">
          <div className="grid grid-cols-5 gap-3">
            {ICON_NAMES.map(n => (
              <div key={n} className="text-center">
                <Icon name={n} size={24} className="text-accent mx-auto" />
                <p className="text-[10px] text-text-secondary mt-1">{n}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mb-8">
        <h2 className="text-lg text-text-secondary mb-3">FAB</h2>
        <GlassCard className="p-4 flex justify-center">
          <FAB onClick={() => alert('FAB clicked!')} />
        </GlassCard>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Test Modal">
        <p className="text-text-secondary">This is a modal. Press ESC or click outside to close.</p>
      </Modal>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Test Sheet">
        <p className="text-text-secondary">Bottom sheet content goes here.</p>
      </BottomSheet>

      {toastVisible && <Toast message="Hello from Toast!" onClose={() => setToastVisible(false)} />}
    </div>
  );
}
