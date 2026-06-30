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
