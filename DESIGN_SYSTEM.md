# Design system (buttons and actions)

A single, consistent button system. Do not hand-roll action buttons with inline
Tailwind classes; use the shared components so size, spacing, focus, and color
stay uniform across the marketing site and the admin panel.

## Buttons

Use `Button` (for actions/forms) and `ButtonLink` (for navigation) from
`@/components/ui/button`. Never style a raw `<button>` for a primary action.

Variants:

- `primary` (default): navy fill, white text. The main action.
- `secondary`: navy outline on white. Secondary actions.
- `ghost`: text only, subtle hover. Low-emphasis actions.
- `danger`: red fill, white text. Destructive actions (delete, remove, force delete).

Sizes: `sm` (h-9), `md` (h-11, default), `lg` (h-12). Buttons that sit next to each
other should share a size (usually `sm` inside tables and cards).

Rules:

- A delete or other destructive action is always `variant="danger"` (red). Never a
  gray or neutral delete.
- Confirm a destructive action with `ConfirmSubmit` (`@/components/admin/confirm-submit`),
  which renders a red `danger` Button and asks for confirmation. Do not pass custom
  classes to it.
- Action buttons grouped in a row use the same size.

## Color tokens

- Navy: the brand base (`navy-50/100/500/600/700/900`).
- Gold: accents only (`gold-50/100/500/800`).
- Red: destructive only. Emerald: success. Amber: warning. Slate/neutral: text and borders.

## Copy

Write like a person, not a generator. No em or en dashes (use a comma, colon,
parentheses, or split the sentence). Avoid filler ("in today's fast-paced world",
"unlock", "leverage", "seamless", "robust"). Short, concrete, specific.

## Tables, alerts, filters

- Data tables: use `Table` + `THead`/`Th`/`TBody`/`TR`/`Td`/`TableEmpty` from
  `@/components/ui/table`. Do not hand-roll `<table>` with a navy header. The
  container scrolls on small screens; empty tables render `TableEmpty`.
- Status banners: use `Alert` from `@/components/ui/alert` with `tone` of
  `info | success | warning | error | neutral`. Do not hand-roll colored boxes.
- List filters and tabs: use `FilterPill` from `@/components/ui/filter-pill`.
- Inputs: use `Input`, `Select`, `Textarea`, `Field` from
  `@/components/ui/form-fields` (height `h-11`), never raw `<input>`.
- Empty states: use `EmptyState` from `@/components/shared/page-shell`.

## Typography scale

One scale, used everywhere. Do not invent sizes per page.

- Page title (`PageHeader` h1): `text-2xl md:text-3xl font-semibold text-navy-900`.
- Section title (`SectionCard`/`h2`): `text-lg font-semibold text-navy-900`.
- Card / sub-section title: `text-base font-semibold text-navy-900`.
- Body: `text-sm leading-6 text-slate-600` (admin) / `text-base` (marketing prose).
- Meta / hint: `text-xs text-slate-400` or `text-xs uppercase tracking-wide text-slate-500` for labels.
- Stat number (`StatCard`): `text-2xl font-semibold`.
- Never use `text-4xl`/`text-5xl` inside the app shell; those are marketing-hero only.

## Spacing scale

Stick to the 4px Tailwind steps and these defaults:

- Page sections: `space-y-8` between major blocks.
- Within a card / section: `space-y-4` (groups), `space-y-2` (label + control).
- Grid gaps: `gap-3` (tight tiles), `gap-4` (cards), `gap-6` (page columns).
- Card padding: `p-4` (tiles), `p-5 md:p-6` (section cards).
- Button rows: `gap-2`.

## Layout / page shell

- Every admin/portal route opens with `PageHeader` (title + one-line description),
  then `space-y-8` blocks. Use `RouteShell` for stub routes.
- KPI rows: `StatGrid` + `StatCard` (`@/components/ui/stat-card`). Do not hand-roll
  "big number + label" tiles.
- Titled content blocks: `SectionCard` (title, optional description, optional header
  action). Plain containers: `Card` (`@/components/ui/card`).

## Dialogs and confirmation

- Modal: `Dialog` (`@/components/ui/dialog`), controlled by `open`/`onClose`.
- Destructive confirmation: `ConfirmDialog` (`@/components/ui/dialog`) renders a red
  trigger and a modal confirm, then submits a server action. Prefer it over
  `window.confirm`. `ConfirmSubmit` (inline confirm) remains valid for simple table
  rows where a modal is overkill.

## Badges / status chips

- Use `Badge` (`@/components/ui/badge`). Pass a known `status` for auto color, or a
  `tone`. Never hand-roll a colored pill. Status color follows the color rule
  (emerald success, amber warning, red failure/destructive, slate neutral).

## Timeline / progress

- Step trails (academy progress, payment history, status trail): `Timeline`
  (`@/components/ui/timeline`) with item `state` of `done | current | upcoming`.
- Percent progress: `ProgressBar` (`@/components/ui/timeline`).

## Pagination

- Long server-rendered lists use `Pagination` (`@/components/ui/pagination`) with a
  `hrefForPage` builder. It hides itself for a single page.

## Loading / skeleton

- Route-level loading: a `loading.tsx` rendering `PageSkeleton`
  (`@/components/ui/skeleton`). Inline placeholders use `Skeleton`.

## Status notification pattern

- Prefer server feedback: a server action revalidates and the page shows an `Alert`
  driven by a `?status=...` search param (e.g. "Saved", "Sent"). Reserve client
  toasts for ephemeral, client-only feedback. Do not stack multiple banners; one
  `Alert` at the top of the affected block.

## Destructive action pattern

- Red `danger` Button or `ConfirmDialog`/`ConfirmSubmit`. Always confirmed, always
  red, never the only affordance without a label. Irreversible actions name the
  consequence in the confirm copy ("This permanently deletes ...").
