# FishGrow v4 Frontend Refactor — Notes

> Branch: `feature/v4-frontend-refactor`
> Base: `main` @ f5281be
> Date: 2026-06-17
> Scope: Complete frontend refactor per architecture v1 (Tomas)

---

## 1. What changed

### 1.1 Design system (Stage 1)

**Tailwind config** (`tailwind.config.js`):

- Replaced v3 `water-*` / `sand-*` / `coral-*` palette with v4 deep-sea + liquid-glass tokens:
  - Backgrounds: `deep #0a1f2e`, `card #0f2a3d`
  - Glass: `glass` (rgba 0.08) + `glass-border` (rgba 0.15)
  - Accents: `accent #7dd3fc`, `accent-aux #38bdf8`, `accent-orange #fb923c`, `accent-gold #fde68a`
  - Text: `text-primary #e0f2fe`, `text-secondary #94a3b8`
  - States: `warning #fbbf24`, `success #4ade80`
- Unified font stack: `'-apple-system', 'Inter', 'PingFang SC', 'Noto Sans SC', 'Noto Sans JP', system-ui, sans-serif`
- Added `fontWeight.light = 300` (for design-spec headings)
- Added `bg-deep-sea` / `bg-deep-sea-soft` radial/linear gradients
- Added `boxShadow.glow-accent|success|orange|gold` for glowing progress bars and badges
- Added animations: `swim` (10s), `swim-fast` (6s), `float` (4s), `bubble` (6s) + keyframes

**Globals** (`src/app/[locale]/globals.css`):

- CSS variable declarations for `--bg-deep`, `--glass-bg`, `--accent`, etc.
- `@layer components` utility classes:
  - `.glass-card` — backdrop-blur 20px, 1px glass border, rounded-2xl
  - `.glass-card-hover` — translateY -3px + accent border on hover
  - `.btn-primary|secondary|accent|ghost` — 4 button variants
  - `.tag-primary|success|warning|orange|gold|neutral` — 6 tag variants
  - `.progress-glow|progress-glow-health` — gradient progress bars with box-shadow
  - `.switch-track / .switch-thumb` — toggle switch
  - `.bottom-sheet / .bottom-sheet-handle` — slide-up panel
  - `.bg-deep-sea` — page background
  - `.page-enter / .page-exit-*` — route transition animation

**UI Kit** (`src/components/ui/`):

- `GlassCard.tsx` — base glass card with optional hover effect
- `Button.tsx` — primary/secondary/accent/ghost variants, accepts `as` and `disabled`
- `Tag.tsx` — 6 semantic variants for status labels
- `ProgressBar.tsx` — glowing gradient bar (accepts `tone="accent"|"health"`)
- `BottomSheet.tsx` — fixed bottom panel with handle
- `Toast.tsx` — small in-page notification (used with `uiStore`)
- `Input.tsx` — glass input with focus ring
- `Switch.tsx` — toggle (controlled + uncontrolled)
- `Modal.tsx` — backdrop-blur modal
- `FAB.tsx` — floating action button (bottom-right)

### 1.2 Fish SVG components (Stage 2)

**Files** (`src/components/fish/`):

- `GoldFishSVG.tsx` — round head + 2-layer round tail, orange gradient
- `GuppyFishSVG.tsx` — streamlined body + multi-layer fan tail, **tail-root gradient bridge preserved** (blue-green → purple → orange-red)
- `TetraFishSVG.tsx` — small compact body + triangular tail, neon gradient with rainbow side-stripe
- `BettaFishSVG.tsx` — short stocky body + thread-like flowing tail, **tail-root gradient bridge preserved** (blue-purple → pink-purple → transparent)
- `AngelFishSVG.tsx` — triangular profile + silver body + gold stripes + long filament fins
- `types.ts` — `FishVariant` type + `slugToVariant()` mapping helper
- `FishAvatar.tsx` — wrapper with `useId()` gradient ID namespacing
- `index.ts` — barrel export

**Critical preservation**: Guppy and Betta both keep the **3-stop tail-root gradient** per spec; gradient IDs are namespaced via `useId()` to prevent collisions when multiple fish render on one page.

### 1.3 5 core pages (Stage 3)

| Page | File | Key elements |
|------|------|--------------|
| `/tanks` (Home) | `src/app/[locale]/tanks/page.tsx` | Tank grid + create FAB + new-tank bottom sheet, uses `tankStore` |
| `/tanks/[id]` (Tank Detail) | `src/app/[locale]/tanks/[id]/page.tsx` | Fish display, status panel, action buttons, water quality cards, species chips |
| `/growth/[fishId]` (Fish Growth) | `src/app/[locale]/growth/[fishId]/page.tsx` | Profile card, **native SVG line+area chart** (no chart lib), metrics grid, feed history |
| `/stats` (Stats) | `src/app/[locale]/stats/page.tsx` | 6 data cards, **native SVG bar chart** (weekly), achievement badges |
| `/profile` (Profile) | `src/app/[locale]/profile/page.tsx` | Avatar + Lv. badge, 3 stats, favorites, settings list |

**Mock data layer** (`src/lib/api/mock.ts`): Backend doesn't yet expose `/api/fish/:id/growth-history`, `/api/stats/summary`, `/api/stats/weekly`, `/api/achievements`. The frontend falls back to deterministic mock data so all 5 pages render end-to-end. Once backend ships these endpoints, the callsites in `lib/api.ts` can be uncommented (or the mock layer can be replaced entirely).

### 1.4 Routing + state (Stage 4)

- **Routing**: `/[locale]/page.tsx` now redirects to `/tanks` (was `/tank`); legacy `tank/page.tsx` deleted.
- **Stores** (`src/lib/stores/`):
  - `tankStore.ts` — tanks list, current tank, fish lists, CRUD/feed/water-change/treat actions
  - `fishStore.ts` — per-fish detail + growth history (per-fish cache keyed by id)
  - `uiStore.ts` — toasts (push/dismiss) + active bottom-sheet key
- **i18n** (`src/messages/{zh,en,ja}.json`): added `nav.*`, `tankDetail.*`, `growth.*`, `stats.*`, `profile.*`, `tanks.home.*` namespaces.
- **NavBar** (`src/components/nav/NavBar.tsx`): 5-tab bottom navigation; active tab shows 2px accent underline.

---

## 2. Verification

- `npx tsc --noEmit` — clean, no errors
- `npm run build` — clean; 9 routes generated (5 core + reminders + species + weather + not-found)
- `npm run dev` on :3001 — serves all 5 pages without console errors

---

## 3. Known limitations

1. **Mock data**: Growth history, stats summary, weekly stats, and achievements are mocked. The 4 backend endpoints from the architecture spec (Tomas, §7.2) need to ship before mocks can be removed.
2. **SWR not yet integrated**: The spec recommends SWR for caching. Pages currently use a mix of `useEffect + useState` and the Zustand cache. This is functional but a follow-up could swap the bare fetches for `useSWR` for automatic revalidation.
3. **Route transition animation**: `.page-enter` / `.page-exit-active` classes are defined but not wired to Next.js's App Router transition events (Next 14 doesn't expose a transition API like the Pages Router did). The classes are available for future use.
4. **i18n key coverage**: `tankDetail`, `growth`, `stats`, `profile` namespaces have a working baseline. More granular keys (e.g. tooltip text, error messages) can be added as UX matures.
5. **Header vs NavBar**: The legacy `Header` is still rendered above the page; `NavBar` is fixed at the bottom. They coexist for now — Header is the locale switcher, NavBar is the primary nav.

---

## 4. Follow-up suggestions

1. **Backend endpoints**: Implement the 4 missing endpoints; remove `lib/api/mock.ts`.
2. **SWR integration**: Replace ad-hoc `useEffect` fetches with `useSWR` for consistency and revalidation.
3. **Visual polish**: Add micro-interactions (ripple on button press, card flip on tank click).
4. **Accessibility**: Audit focus rings on `.btn`, `.switch-track`, `.tag`; ensure all interactive elements have `aria-*`.
5. **Tests**: Add Vitest + @testing-library for UI Kit components; Playwright for end-to-end page flow.
6. **E2E route transitions**: Use a future Next.js transition API or a small custom router wrapper to wire `.page-enter*` classes.

---

*Author: Linus (developer profile) · Task: t_7ec5aa6b · Branch: `feature/v4-frontend-refactor` · Commits: c34b0a2, 49ba643, 328e94b, b239875*
