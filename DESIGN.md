---
version: 1.0.0
name: RIPNEL Design System
description: "ERP operational design system for Creaciones Ripnel. Built around operational clarity, compact density, and a violet accent (#b07ae4) on neutral surfaces. The system prioritizes function over decoration — dense rows, direct actions, and fast scanning over decorative whitespace or marketing aesthetics."
---

## Overview

RIPNEL's design system is built for **operational ERP work** — inventory management, sales registration, stock transfers, and administrative workflows. Every decision prioritizes scan speed, density, and clarity over decoration.

**Key Characteristics:**
- **Violet accent** (`#b07ae4`) — single chromatic accent for focus, selection, and primary actions
- **Neutral surfaces** — functional grays and whites that don't compete with data
- **Poppins typography** — friendly but professional, with clear hierarchy
- **Compact density** — ERP rows are dense, not card-heavy
- **Operational tokens** — `ops-*` system for surfaces, fields, and borders
- **Light + dark themes** — violet/slate/stone for light, graphite for dark

---

## Identity

| Token | Value | Use |
|-------|-------|-----|
| Brand | Creaciones Ripnel | Sidebar, headers |
| Accent | `#b07ae4` | Primary actions, focus, selection |
| Accent Hover | `#9a63d3` | Hovered accent elements |
| Accent Soft | `#f7effd` | Soft accent backgrounds |
| Font | Poppins | All typography (sans-serif) |

---

## Color System

### Brand & Accent

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `primary` | `#b07ae4` | `#8e5db7` | Primary accent, focus rings, CTAs |
| `primary-hover` | `#9a63d3` | `#7b4ea3` | Hovered accent |
| `accent-soft` | `#f7effd` | `rgb(142 93 183 / 0.22)` | Soft accent backgrounds |

### Surface Ladder

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `ops-page-background` | `#ffffff` / gradient | `#171717` | Page background |
| `ops-surface` | `#ffffff` | `#1f1f1f` | Cards, panels |
| `ops-surface-muted` | `#faf7fd` | `#252525` | Muted surfaces |
| `ops-surface-soft` | `#ffffff` (0.76 opacity) | `#1f1f1f` (0.84 opacity) | Overlays |
| `ops-field` | `#f8fafc` | `#252525` | Input backgrounds |

### Text

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `ops-text` | `#171717` | `#fafafa` | Primary text |
| `ops-text-muted` | `#72687f` | `#b4b4b4` | Secondary text, labels |

### Borders

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `ops-border-strong` | `#e5e1ea` | `#2e2e2e` | Default borders |
| `ops-border-soft` | `#d8d0e2` | `#484848` | Subtle borders |

### Semantic

| Token | Light Value | Dark Value | Use |
|-------|-------------|------------|-----|
| Success | `#ecfdf5` bg, `#047857` text | rgb(16 185 129 / 0.18) bg, `#a7f3d0` text | Completed, positive |
| Warning | `#fffbeb` bg, `#b45309` text | rgb(245 158 11 / 0.18) bg, `#fcd34d` text | Attention, pending |
| Danger | `#fff1f2` bg, `#be123c` text | rgb(244 63 94 / 0.18) bg, `#fda4af` text | Error, destructive |
| Neutral | `#faf7fd` bg, `#72687f` text | `#252525` bg, `#b4b4b4` text | Inactive, default |

---

## Typography

### Font Family

**Poppins** — geometric sans-serif with friendly, professional character
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Used for all text — no separate display/text cuts

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|-------|------|--------|-------------|----------------|-----|
| `display-xl` | 2rem / 32px | 700 | 1.1 | -0.02em | Hero titles |
| `display-lg` | 1.75rem / 28px | 700 | 1.15 | -0.01em | Page h1 |
| `headline` | 1.5rem / 24px | 600 | 1.2 | 0 | Section titles |
| `title` | 1.25rem / 20px | 600 | 1.25 | 0 | Card titles |
| `body-lg` | 1rem / 16px | 400 | 1.5 | 0 | Lead paragraphs |
| `body` | 0.875rem / 14px | 400 | 1.5 | 0 | Default body |
| `body-sm` | 0.8125rem / 13px | 400 | 1.4 | 0 | Secondary text |
| `caption` | 0.75rem / 12px | 400 | 1.4 | 0 | Labels, metadata |
| `eyebrow` | 0.6875rem / 11px | 600 | 1.3 | 0.12em | Section eyebrows, uppercase |

### Principles

- **Eyebrow uses uppercase + positive tracking** — marks taxonomy vs content
- **Headers use semibold (600)** — clear hierarchy without being heavy
- **Body stays regular (400)** — easy scanning at small sizes
- **Compact line-heights on headings** — tighter vertical rhythm
- **Body line-height 1.5** — comfortable reading for dense data

---

## Spacing System

Base unit: 4px

| Token | Value | Use |
|-------|-------|-----|
| `ops-page-py` | 1.5rem / 24px | Page vertical padding |
| `ops-stack-gap` | 1rem / 16px | Vertical gaps between sections |
| `ops-panel-padding` | 1.25rem / 20px | Panel/card padding |
| `ops-row-py` | 1rem / 16px | Row vertical padding |
| `ops-row-gap` | 0.75rem / 12px | Gap between row items |
| `ops-metric-py` | 0.625rem / 10px | Metric pill vertical padding |
| `ops-metric-px` | 0.875rem / 14px | Metric pill horizontal padding |
| `ops-secondary-text-size` | 0.8125rem / 13px | Secondary text size |

---

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | 0.375rem / 6px | Small elements |
| `md` | 0.625rem / 10px | Buttons, inputs, chips |
| `lg` | 0.75rem / 12px | Cards, panels |
| `xl` | 1rem / 16px | Large panels |
| `2xl` | 1.25rem / 20px | Overlays |
| `full` | 9999px | Avatars, pills |

---

## Components

### Shared Catalog Taxonomy

- **`components/ui`**: primitives and shared operational patterns. This is the canonical layer for new work.
- **`components/admin`**: semantic wrappers over shared UI primitives for CRUD/admin flows; not a separate visual system.
- **`components/feedback`**: loading, empty, forbidden, error, and generic inline system status.
- **`components/ui/purchase-system`**: POS-specific compositions. Reuse them for POS flows, not as global defaults for unrelated modules.

### Canonical Families

- **Status**: `OpsStatusBadge` is canonical. `OpsInlineBadge` remains as a compact deprecated alias.
- **Metrics**: prefer `OpsMetricInlineGroup` / `OpsMetricInline` para métricas planas, `OpsMetricCard` para KPIs con contexto y `OpsMetricRow` para desglose. `OpsMetricPill`, `OpsMetricStripItem` y `OpsSummaryBand` son legacy.
- **Actions**: prefer shared `Button` / `AdminActionButton` for direct actions and `OpsActionLink` for lightweight CTAs. `OpsCardActionLink` is a compatibility wrapper for existing card footers.
- **Attention**: prefer `OpsAttentionRow` inline and `OpsActionBanner` for higher-importance module alerts. `OpsPendingRow` is a compact deprecated wrapper.
- **Selection**: prefer `OpsSelectMenu`, `OpsMultiSelectMenu`, and `SearchablePicker`. `FilterDropdown` and `AdminSelect` should visually converge to the same shared control base.
- **Progress**: prefer `SalesWizardRail` for multistep operational flows. `Stepper` remains for compact form progress. `PosHeader` should not be treated as the canonical progress component.

### Panel patterns

Reusable CSS class constants for info panels. Source of truth: `components/ui/ops-control-styles.ts`.

| Constant | Visual | Use |
|---|---|---|
| `INFO_BOX` | `rounded-lg` border, `bg-[var(--ops-surface)]`, compact padding | Standard info panel, customer cards, exchange lines |
| `INFO_BOX_MUTED` | Same but `bg-[var(--ops-surface-muted)]` | Secondary info panels, cash context boxes |
| `INFO_BOX_XL` | `rounded-xl` variant of `INFO_BOX` | Dialog sections, summary shortcuts |
| `SURFACE_MUTED_BG` | Semitransparent muted background | Section backgrounds, discount estimates |
| `ACCENT_HIGHLIGHT_PANEL` | `rounded-lg`, border accent 24%, bg accent-soft 78% | Total panels, key metric highlights |
| `ACCENT_LABEL_TEXT` | Text color accent 78% over `ops-text` | Labels inside `ACCENT_HIGHLIGHT_PANEL` |

Do not duplicate these as inline Tailwind strings. Import from `ops-control-styles.ts`.

### Panel section component

`OpsPanelSection` is the canonical component for titled info panels. It wraps `INFO_BOX` with standard section padding (`--ops-panel-padding`), an integrated title with optional icon, and an optional aside action. Source: `components/ui/ops-panel-section.tsx`.

```tsx
import { OpsPanelSection } from "@/components/ui/ops-panel-section"

<OpsPanelSection title="Totales" icon={<ReceiptText />} aside={<Button />}>
  <OpsMetricRow label="Subtotal" value={...} />
</OpsPanelSection>

<OpsPanelSection title="Anulacion" tone="danger">
  <p>...</p>
</OpsPanelSection>
```

| Prop | Type | Default | Use |
|------|------|---------|-----|
| `title` | `string` | required | Section heading (h2) |
| `icon` | `ReactNode` | — | Icon left of title, uses `text-[var(--ripnel-accent)]` |
| `aside` | `ReactNode` | — | Action pinned to the right of the title row |
| `tone` | `"default" \| "danger"` | `"default"` | Semantic tone for the panel border/background |
| `className` | `string` | — | Additional classes on the `<article>` |

Rules:
- The title and icon live **inside** the panel border, not outside.
- Icon color uses `text-[var(--ripnel-accent)]` or `text-[var(--ripnel-accent-hover)]` for accent context.
- `tone="danger"` swaps border to `--ops-tone-danger-border` and background to `--ops-tone-danger-bg`.
- Panels stack vertically with `space-y-4` or `space-y-5` between them.
- Do not recreate `SectionCard` locally in module pages.

### Dialog footer pattern

All `OpsDialog` instances must use the canonical footer wrapper:

```tsx
footer={
  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button variant="outline" ...>Cancelar</Button>
    <Button variant="accent" ...>Confirmar</Button>
  </div>
}
```

- Cancel/back: `variant="outline"` on the left
- Primary action: `variant="accent"` on the right
- Destructive: `variant="destructive"` on the right
- 3-button variants: use `sm:justify-between` with ghost action on left

### Usage Matrix

| Need | Use | Do not use in new code | Replacement | Notes |
|------|-----|------------------------|-------------|-------|
| Simple table/list filter | `FilterDropdown` | Manual selects or `AdminSelect` for filters | `FilterDropdown` | Valid semantic wrapper over the shared control base |
| Operational form select | `OpsSelectMenu` | `FilterDropdown` outside filtering contexts | `OpsSelectMenu` | For forms and simple operational choices |
| Typeahead/search picker | `SearchablePicker` | `CompactPicker*` directly in modules | `SearchablePicker` | `CompactPicker*` is an internal UI primitive |
| POS selector without search | POS wrapper + `OpsSelectMenu` | `CompactPicker*` directly | Domain wrapper or `OpsSelectMenu` | Use for document type and similar POS-specific choices |
| Visual status badge | `OpsStatusBadge` | `OpsInlineBadge` | `OpsStatusBadge` | Future business states should prefer domain badge wrappers |
| Lightweight CTA | `OpsActionLink` | `OpsCardActionLink` | `OpsActionLink` | Keep legacy wrapper only for temporary compatibility |
| Inline text metric | `OpsMetricInlineGroup` / `OpsMetricInline` | Hand-made inline rows | `OpsMetricInlineGroup` | Minimal icon + label: value, sin contenedor. Usar como métrica canónica |
| Compact metric (legacy) | — | `OpsMetricPill` / `OpsMetricStripItem` | `OpsMetricInline` | Migrar a OpsMetricInline |
| KPI with context | `OpsMetricCard` | `OpsSummaryBand` as a new pattern | `OpsMetricCard` | Compose several cards when multiple KPIs are needed |
| Numeric breakdown | `OpsMetricRow` | Repeated hand-made rows | `OpsMetricRow` | Totals, subtotals, payment methods |
| Inline system feedback | `InlineStatusCard` | Actionable banners for simple errors | `InlineStatusCard` | Errors, warnings, and info inside an existing screen |
| Actionable module alert | `OpsActionBanner` | `InlineStatusCard` with improvised CTA | `OpsActionBanner` | Strong operational state for a module |
| Pending/attention list item | `OpsAttentionRow` | `OpsPendingRow` | `OpsAttentionRow` | `OpsPendingRow` is legacy compatibility |
| Full-page status | `StatusPage` wrappers | Hand-made 403/404/500 pages | `LoadingPage`, `ForbiddenPage`, `ErrorPage`, etc. | Do not create `OpsStatusPage` unless the existing base stops fitting |
| Sales wizard | `SalesWizardRail` | Progress UI inside `PosHeader` | `SalesWizardRail` | Keep sales-specific until there is real usage outside POS |
| CRUD form shell | `AdminFormPageShell` | Hand-made CRUD page layouts | `AdminFormPageShell` | Valid wrapper built from `OpsPageShell` + `PosHeader` |
| Titled section panel | `OpsPanelSection` | Hand-made `<section>`+`<h2>`+`<article>` triplets | `OpsPanelSection` | Title, icon, and aside inside the panel border. Do not recreate `SectionCard` locally |

### Buttons

#### `button-primary`
- Background: `primary` (#b07ae4)
- Text: white
- Typography: `body`, weight 500
- Padding: 8px 14px
- Border-radius: `md` (10px)
- Hover: background shifts to `primary-hover`

#### `button-secondary`
- Background: `ops-surface`
- Text: `ops-text`
- Border: 1px solid `ops-border-strong`
- Typography: `body`, weight 500
- Padding: 8px 14px
- Border-radius: `md`

#### `button-ghost`
- Background: transparent
- Text: `ops-text-muted`
- Hover: background `ops-surface-muted`

#### `button-icon`
- Background: transparent
- Size: 32px × 32px or 40px × 40px
- Icon-only with tooltip
- Border-radius: `md` or `full`

### Inputs & Fields

#### `sales-field`
- Background: `ops-field`
- Border: 1px solid `ops-border-strong`
- Text: `ops-text`
- Placeholder: `ops-text-muted` at 92% opacity
- Border-radius: `md`
- Focus: border-color `primary`, box-shadow `0 0 0 3px accent-soft`

#### `sales-field-interactive`
- Extends `sales-field` with hover states
- Hover: border-color accent at 34%, background accent-soft at 40%

### Chips & Badges

#### `sales-chip`
- Inline-flex, gap 0.375rem
- Border: 1px solid `ops-border-strong`
- Background: `ops-surface-muted`
- Text: `ops-text`
- Padding: variable by context
- Border-radius: `md`

#### `sales-chip-accent`
- Border-color: accent at 24%
- Background: `accent-soft`
- Text: `accent-hover`

#### `sales-chip-success`
- Background: semantic success light / dark adapted
- Text: semantic success text light / dark adapted

#### `sales-chip-warning`
- Background: semantic warning light / dark adapted
- Text: semantic warning text light / dark adapted

#### `sales-chip-danger`
- Background: semantic danger light / dark adapted
- Text: semantic danger text light / dark adapted

#### `sales-chip-neutral`
- Background: `ops-surface-muted`
- Text: `ops-text-muted`

### Cards & Panels

#### `ops-surface`
- Background: `ops-surface`
- Border: 1px solid `ops-border-strong`
- Border-radius: `lg`
- Padding: `ops-panel-padding`

#### `ops-surface-muted`
- Background: `ops-surface-muted`
- Border: 1px solid `ops-border-soft`
- Border-radius: `lg`

#### `ops-empty-state`
- Border: 1px dashed `ops-border-soft`
- Background: `ops-surface-muted` at 72%
- Text: `ops-text-muted`

#### `ops-empty-state-compact`
- Border: 1px dashed `ops-border-soft`
- Background: `ops-surface-muted` at 72%
- Text: `ops-text-muted`

### Metrics & Pills

#### `ops-metric-pill`
- Border: 1px solid `ops-border-strong`
- Background: `ops-surface`
- Text: `ops-text`
- Padding: `ops-metric-py` × `ops-metric-px`
- Border-radius: `md`

### Overlays

#### `ops-overlay-backdrop`
- Background: page-background at 28% + rgb(2 6 23) at 72%
- Backdrop-filter: blur(6px)

#### `ops-overlay-panel`
- Background: `ops-surface` at 96%
- Border: 1px solid `ops-border-strong` at 88%
- Box-shadow: `0 20px 44px rgb(2 6 23 / 24%)`
- Border-radius: `xl`

#### `ops-picker-popover`
- Background: `ops-surface`
- Border: 1px solid `ops-border-strong` at 88%
- Box-shadow: `0 18px 48px rgb(15 23 42 / 12%)`
- Border-radius: `lg`

### Progress & Wizard

#### `sales-wizard-shell`
- Flex column, gap 0.875rem

#### `sales-wizard-node`
- Size: 44px × 44px (2.75rem)
- Border-radius: full
- Border: 1px solid `ops-border-strong`
- Background: `ops-surface`
- States: `active` (accent border + accent-soft bg), `complete` (accent bg, white text)

#### `sales-wizard-connector`
- Height: 1px
- Width: clamp(1.8rem, 5vw, 3.8rem)
- Background: `ops-border-strong` at 88%
- Complete state: accent at 38%

### Pickers & Selectors

#### `ops-picker-option`
- Cursor: pointer
- Hover: background `ops-surface-muted`
- Selected: background `accent-soft`, text `accent-hover`

#### `ops-progress-button`
- Border: 1px solid `ops-border-strong`
- Background: `ops-surface`
- Text: `ops-text-muted`
- Active: accent border + accent-soft bg + accent text

---

## Theme Variants

### Light Themes

#### Violet (default)
```css
--ops-page-background: radial-gradient(circle at top, #ede9fe 0%, #f5f3ff 35%, #f8fafc 70%, #eef2ff 100%);
--ops-surface: rgb(255 255 255 / 0.92);
--theme-sidebar-primary: #4f46e5;
```

#### Slate
```css
--ops-page-background: linear-gradient(180deg, #f5f5f4 0%, #e7e5e4 100%);
--ops-surface: rgb(250 250 249 / 0.96);
--theme-sidebar-primary: #57534e;
```

#### Stone
```css
--ops-page-background: #ffffff;
--ops-surface: #ffffff;
--theme-sidebar-primary: #b07ae4;
```

### Dark Theme (Graphite)

```css
--background: #171717;
--foreground: #fafafa;
--card: #1f1f1f;
--muted: #252525;
--accent: #252525;
--border: #2e2e2e;
--primary: #8e5db7;
--ripnel-accent: #8e5db7;
--ripnel-accent-hover: #7b4ea3;
--ripnel-accent-soft: rgb(142 93 183 / 0.22);
```

---

## Do's and Don'ts

### Do

- **Use `ops-*` tokens** for all surface, border, and text colors
- **Keep rows dense** — ERP lists prioritize scan speed over whitespace
- **Use accent sparingly** — focus, selection, primary action only
- **Maintain theme consistency** — both light and dark must be fully supported
- **Use semantic colors correctly** — success for completed, warning for attention, danger for errors
- **Prefer chips over cards** for categorical labels
- **Use `sales-field` for all interactive inputs** with proper focus states
- **Reference `docs/frontend-page-standard.md`** for page composition

### Don't

- **Don't use accent as background** — use `accent-soft` for soft backgrounds
- **Don't create card-heavy layouts** — prefer tables and dense rows
- **Don't use decorative gradients** — RIPNEL is functional, not marketing
- **Don't mix semantic colors** — one semantic color per state
- **Don't skip focus states** — all interactive elements must show focus ring
- **Don't use `border-radius-full`** for buttons, inputs, o contenedores de tabla — usar `rounded-lg` (md=10px). `rounded-full` solo para avatares, pills decorativas y chips de tipo/estado.
- **Don't use `rounded-*` en contenedores de tabla** — las tablas usan `border-y` (solo borde superior e inferior, sin esquinas redondeadas). El estandar canonico esta en `customers-page.tsx`.
- **Don't create dashboards with many cards** — prefer compact tables

---

### Table Pattern

```css
/* Las tablas del sistema siguen el patron canonico de customers-page.tsx: */
/* - border-y (sin rounded) en el contenedor de tabla */
/* - <table> semantico con border-collapse */
/* - thead con bg-[var(--ops-surface-muted)] */
/* - th: text-xs font-semibold uppercase tracking-[0.16em] */
/* - td: px-4 py-[var(--ops-row-py)] */
/* - tr: transition hover:bg-[var(--ops-surface-muted)] */
/* - Filas usan token --ops-row-py (NO hardcodear py-3) */
```

---

## Referenced Standards

These documents complement this design system:

- **`docs/frontend-page-standard.md`** — Page composition, header structure, table patterns, pagination
- **`docs/frontend-ui-ux-operativo.md`** — Operational UI criteria, density guidelines, anti-patterns

---

## Implementation

Source of truth for tokens and values:
- `apps/frontend/app/globals.css` — All CSS custom properties
- `apps/frontend/components/ui/*` — Reusable UI components
- `apps/frontend/components/modules/*` — Page-level components

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-04 | Initial RIPNEL design system based on Linear's structure |
