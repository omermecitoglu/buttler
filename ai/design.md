# Design Guidelines

> **UI Kit:** [`@omer-x/tailwind-ui-kit`](https://github.com/omermecitoglu/tailwind-ui-kit) (alpha)
> **Styling engine:** Tailwind CSS v4

---

## Setup

### CSS Entry Point

```css
/* src/app/globals.css */
@import "tailwindcss";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

The dark mode variant is **data-attribute driven** — toggle `data-theme="dark"` on `<body>` (or any ancestor) to activate dark styles across the entire subtree.

### Required Dependencies

```bash
npm install tailwindcss @omer-x/tailwind-ui-kit@alpha @base-ui/react clsx tailwind-merge
```

> [!IMPORTANT]
> `@omer-x/tailwind-ui-kit@alpha` has these **peer dependencies** that must be installed separately:
> `@base-ui/react ^1`, `@fortawesome/free-brands-svg-icons ^7`, `@fortawesome/free-solid-svg-icons ^7`, `@fortawesome/react-fontawesome ^3`, `clsx ^2`, `tailwind-merge ^3`, `react ^19`, `tailwindcss ^4`

---

## Color System & Component Architecture

### 1. Neutral Colors: Exclusively Tailwind `slate`
- Tailwind's `slate` scale (`slate-50` through `slate-950`) is the **single source of truth** for all neutral elements: backgrounds, card surfaces, borders, text, placeholders, and disabled states.
- Never use Tailwind's `gray`, `zinc`, `neutral`, or `stone` palettes, and avoid arbitrary grey hex values.
- Build clear visual depth and hierarchy using intentional `slate` steps (e.g. `bg-slate-950` page canvas, `bg-slate-900` elevated cards, `border-slate-800` borders, `text-slate-100` headings, `text-slate-400` muted labels).

### 2. Component Wrapping in `/components/ui/`
- `@omer-x/tailwind-ui-kit` provides structural sizing, layout, and interaction logic without built-in colors.
- Always wrap ui-kit primitives inside `src/components/ui/` (e.g. `Button`, `Input`, `Form`) and apply Tailwind styles directly onto them.
- Do not add custom color rules to `tailwind.config` or `globals.css`—apply classes directly on components.
- **No barrel exports**: Do not create `index.ts` re-export files in `components/ui`. Always use direct, explicit file imports (e.g. `import Button from "~/components/ui/button"`) to avoid bundler issues.
- **Default exports only**: Use single default exports (`export default Component;`) for UI components, avoiding dual named exports.

### 3. Purposeful Color Scales (Refactoring UI Principles)
- Base primary brand colors and semantic accents (success, warning, danger, info) on cohesive 100–900 scales.
- Prioritize visual hierarchy, perceptual color balance, and WCAG accessibility contrast across normal, hover, active, focus-visible, and disabled states.

---

## Theming

- Dark mode is toggled via `data-theme="dark"` on `<body>` (set at the root layout level).
- Use `dark:` prefix on Tailwind classes for dark-mode overrides anywhere in the tree.
- Do **not** use `prefers-color-scheme` media queries; always use the `data-theme` attribute.

---

## Utility: `cn()`

All components use a `cn()` helper (powered by `clsx` + `tailwind-merge`) to safely compose class names and handle conflicts.

```ts
import { cn } from "@omer-x/tailwind-ui-kit/utils";

// Merge conditional classes with safe Tailwind deduplication
cn("px-4 py-2", isActive && "bg-blue-500", className);
```

---

## Available Components

All components are imported from their named sub-path exports.

### `@omer-x/tailwind-ui-kit/button`

| Component | Description |
|---|---|
| `BaseButton` | Accessible, styleable button with ripple effect, loading state, and 4 sizes. Wraps `PulseButton`. |

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `"lg" \| "md" \| "sm" \| "xs"` | `"md"` | Controls height, padding, and font size |
| `pending` | `boolean` | `false` | Shows a spinning icon and disables interaction |
| `disabled` | `boolean` | — | Disables the button |
| `focusableWhenDisabled` | `boolean` | — | Keeps focus ring while disabled |
| `className` | `string` | — | Fully controls colors, borders, etc. |

> [!NOTE]
> `BaseButton` does **not** ship default colors — you must supply them via `className`. This keeps theming fully in your control. See example below.

**Example:**

```tsx
import { BaseButton } from "@omer-x/tailwind-ui-kit/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons/faSave";

const btnClass = cn([
  "bg-slate-200 text-slate-900 border border-slate-300",
  "hover:bg-slate-300",
  "focus-visible:outline-slate-500",
  "disabled:bg-slate-100 disabled:text-slate-400",
]);

<BaseButton size="md" className={btnClass}>Save</BaseButton>
<BaseButton size="sm" pending className={btnClass}>Saving…</BaseButton>
<BaseButton type="submit" size="lg" className={btnClass}>
  <FontAwesomeIcon icon={faSave} /> Submit
</BaseButton>
```

**Size reference:**

| Size | Height | Padding | Font |
|---|---|---|---|
| `lg` | `h-12` | `px-5` | `text-base` |
| `md` | `h-10` | `px-4` | `text-sm` |
| `sm` | `h-9` | `px-3` | `text-sm` |
| `xs` | `h-8` | `px-2.5` | `text-xs` |

---

### `@omer-x/tailwind-ui-kit/form`

| Component | Description |
|---|---|
| `BaseForm` | Server-action-driven form with built-in `useActionState`, dirty-field detection, and error routing. |
| `BaseFormField` | Zod-schema-aware field (label + input + client & server-side errors). |
| `BaseInput` | Standalone input with 4 sizes (no label/error — compose manually). |
| `BaseSwitch` | Accessible toggle switch with label. |

**`BaseForm` props:**

| Prop | Type | Description |
|---|---|---|
| `action` | `(state, formData) => Promise<Record<string, string>>` | Server action; return field-keyed error messages |
| `defaultValues` | `Record<string, unknown>` | Used when `onlyDirty` is enabled |
| `onlyDirty` | `boolean` | Only submits fields that changed from `defaultValues` |
| `messages` | `Record<string, string>` | Translation map for server error codes → human messages |
| `onStateChange` | `(state) => void` | Callback fired whenever action state changes |

**`BaseFormField` props:**

| Prop | Type | Description |
|---|---|---|
| `schema` | `ZodType` | Zod schema for the field — drives HTML constraints and error messages |
| `name` | `string` | Form field name |
| `label` | `string` | Optional label text |
| `clientSideErrors` | `Partial<Record<keyof ValidityState, string \| fn>>` | Custom client-side validation messages |
| `control` | `render prop` | Custom input renderer (replaces default `<input>`) |

**Example:**

```tsx
import { BaseForm, BaseFormField, BaseInput } from "@omer-x/tailwind-ui-kit/form";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

<BaseForm action={myServerAction}>
  <BaseFormField
    schema={schema.shape.email}
    name="email"
    label="Email address"
    control={<BaseInput size="md" className="border rounded-md w-full" />}
  />
</BaseForm>
```

---

### `@omer-x/tailwind-ui-kit/dialog`

| Component | Description |
|---|---|
| `AnimatedPopup` | Centered modal popup with scale + opacity enter/exit animations and nested-dialog stacking. |
| `DialogBackdrop` | Semi-transparent overlay backdrop (opacity-20 light / opacity-70 dark). |
| `DialogTitle` | Pre-styled `<h2>` for modal titles (`text-xl font-semibold`). |

> [!TIP]
> Use these primitives with `@base-ui/react/dialog` as the controller. `AnimatedPopup` and `DialogBackdrop` are render-prop based — pass them as `render` to Base UI's `Dialog.Popup` and `Dialog.Backdrop`.

---

### `@omer-x/tailwind-ui-kit/table`

| Component | Description |
|---|---|
| `Tdx` | A `<td>` that truncates long text safely using CSS table-layout tricks. |

**Example:**

```tsx
import { Tdx } from "@omer-x/tailwind-ui-kit/table";

<table>
  <tbody>
    <tr>
      <Tdx className="max-w-xs">Very long text that truncates cleanly</Tdx>
    </tr>
  </tbody>
</table>
```

---

### `@omer-x/tailwind-ui-kit/page`

| Component | Description |
|---|---|
| `Pagination` | Smart pagination bar with ellipsis logic, using render-prop buttons/links. |

**Props:**

| Prop | Type | Description |
|---|---|---|
| `totalItems` | `number` | Total record count |
| `itemsPerPage` | `number` | Records per page |
| `currentPage` | `number` | Active page (1-indexed) |
| `queryParams` | `Record<string, unknown>` | Existing query params to preserve in page links |
| `renderButton` | render prop | Style the disabled/active page buttons |
| `renderLink` | render prop | Style the navigable page links |

---

### `@omer-x/tailwind-ui-kit/layout`

| Component | Description |
|---|---|
| `Container` | `<div className="container mx-auto px-3">` wrapper. |

---

## App Shell Layout

The root layout (`src/app/layout.tsx`) establishes the two-pane shell:

```
┌──────────────────────────────────────────────────┐
│  Sidebar (w-60)   │  Header (h-16)               │
│  ├─ Logo (h-16)   ├──────────────────────────────│
│  ├─ Nav items     │  <main> (flex-1, scrollable) │
│  └─ Avatar (h-16) │                              │
└──────────────────────────────────────────────────┘
```

- Dark mode is activated by default via `data-theme="dark"` on `<body>`.
- Sidebar and header are placeholder shells — fill in with real nav/avatar components in subsequent phases.
