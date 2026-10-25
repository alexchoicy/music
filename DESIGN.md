# Design

Visual specification for shared colors, typography, spacing, components, and responsive behavior.

## How to use this guide

- Task-specific design direction from the user takes precedence for the requested scope.
- Keep shared theme tokens and component variants aligned with this guide. Repeated page-level restyling belongs in a shared variant, not in individual pages.
- This guide is shared across products. Each product keeps its own product mark, and the media and collection patterns apply only where a product already has those screens; they are not a reason to add them.

## Breakpoints

Tailwind defaults. "Compact" means below `md`; "wide" means `lg` and up.

| Name    | Min width | Layout                                                        |
| ------- | --------- | ------------------------------------------------------------- |
| compact | 0         | Single column, mobile navigation, wrapped toolbars |
| `md`    | 768px     | Expanded sidebar; two columns where useful         |
| `lg`    | 1024px    | Full toolbars, wide sizes                          |
| `xl`    | 1280px    | Wider grids; no new layout modes                   |

UI review covers at least compact (390px) and wide (1280px) widths, plus `md` when a layout changes between them.

## Visual direction

- Warm near-black surfaces, warm off-white text, and a muted rose accent. Dark mode is the reference appearance. The light palette uses warm paper surfaces and a deeper rose.
- Hierarchy comes from content, artwork, typography, and spacing. Use `primary` (the rose) only for primary actions, selected controls, and active playback. The `accent` token is a hover surface, not the brand accent.
- Prefer open sections and quiet surfaces. Counters, informational sections, empty states, and ordinary media rows have no decorative frames or divider lines.
- Keep purposeful outlines: inputs, filter chips, outlined buttons and badges, and upload drop zones. Underline tabs keep their active indicator. Only decorative framing is removed.
- Refine shared components and their variants for consistent color, type, spacing, radii, sizes, and states.

## Color palette

Use semantic tokens in UI code. Hex values belong in the shared theme. Pair every filled surface with its matching foreground token; do not assume white text.

| Token                | Dark        | Light       | Purpose                         |
| -------------------- | ----------- | ----------- | ------------------------------- |
| `background`         | `#0d0c0b`   | `#f5f3ee`   | Page canvas                     |
| `foreground`         | `#f3f0ea`   | `#1b1916`   | Main text and icons             |
| `card`               | `#151413`   | `#fffdf9`   | Raised content surface          |
| `popover`            | `#1d1b19`   | `#ffffff`   | Menus and overlays              |
| `sidebar`            | `#100f0e`   | `#efece5`   | Navigation surface              |
| `sidebar-foreground` | `#bdb9b1`   | `#4b473f`   | Navigation text                 |
| `sidebar-accent`     | `#201e1c`   | `#e3dfd6`   | Navigation hover and active row |
| `primary`            | `#e8758b`   | `#aa2249`   | Primary action and selection    |
| `primary-foreground` | `#240811`   | `#ffffff`   | Text and icons on primary fill  |
| `secondary`          | `#24221f`   | `#e9e5dc`   | Secondary filled control        |
| `muted`              | `#1a1918`   | `#edeae2`   | Quiet surface and placeholder   |
| `muted-foreground`   | `#a7a39b`   | `#5d5950`   | Supporting text                 |
| `accent`             | `#26231f`   | `#e6e2d8`   | General hover surface           |
| `border`             | `#2b2925`   | `#dcd7cb`   | Subtle outline                  |
| `input`              | `#716d66`   | `#7a756b`   | Stronger field outline          |
| `scrim`              | `#000000cc` | `#1b1916a6` | Backdrop over content           |
| `art-fade`           | `#0d0c0bf0` | `#f5f3eef0` | Artwork fade into the canvas    |

Aliases:

- `card-foreground`, `popover-foreground`, `sidebar-accent-foreground`, `secondary-foreground`, `accent-foreground` → `foreground`
- `ring`, `sidebar-primary` → `primary`
- `sidebar-primary-foreground` → `primary-foreground`
- `sidebar-border` → `border`
- `sidebar-ring` → `ring`

### Status colors

Each status has a fill, a text color for that fill (`on-*`), and a text color for a subtle tinted surface (`*-foreground`). Always pair status color with an icon or label so color is not the only signal.

| Token                    | Dark      | Light     |
| ------------------------ | --------- | --------- |
| `destructive`            | `#d6303a` | `#c92a2a` |
| `on-destructive`         | `#ffffff` | `#ffffff` |
| `destructive-foreground` | `#ff9b9b` | `#841919` |
| `success`                | `#2cc7b8` | `#0b7c7a` |
| `on-success`             | `#06140f` | `#ffffff` |
| `success-foreground`     | `#4fdccf` | `#084e4d` |
| `warning`                | `#e8a41c` | `#a35c00` |
| `on-warning`             | `#1a1000` | `#ffffff` |
| `warning-foreground`     | `#f3b84a` | `#683a00` |
| `info`                   | `#4aa3ff` | `#1b62c4` |
| `on-info`                | `#04121f` | `#ffffff` |
| `info-foreground`        | `#8ac4ff` | `#134682` |

Subtle status badges: status fill at 16% opacity (dark) or 8% opacity (light), with the `*-foreground` text color.

### Chart colors

| Token     | Value                                |
| --------- | ------------------------------------ |
| `chart-1` | `primary`                            |
| `chart-2` | `info`                               |
| `chart-3` | `warning`                            |
| `chart-4` | `#ff7ab8` (dark) / `#b02a74` (light) |
| `chart-5` | `success`                            |

Always label chart and relationship colors.

## Typography

- Interface text and headings use Geist Variable. Weights: body 400, controls 500, section headings and item titles 600, page headings 700.
- Numbers (durations, track numbers, counts, playback statistics, dates, file hashes) use the normal sans-serif font. Add `font-variant-numeric: tabular-nums` when numbers need to align in columns.
- Geist Mono is reserved for code and literal keyboard notation.
- Important text uses `foreground`; secondary information uses `muted-foreground`. Do not stack extra opacity on muted text; small secondary labels must stay readable.
- Headings use tight tracking. Tile titles and compact metadata may truncate as long as the full text remains accessible. Large headings wrap.
- Apply `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` at the root.

| Role                                      | Size                     | Treatment                                   |
| ----------------------------------------- | ------------------------ | ------------------------------------------- |
| Eyebrow, field label, supporting metadata | 12px                     | Muted; medium weight for labels             |
| Tile title, desktop control text          | 14px                     | Medium or semibold                          |
| Body, touch control text                  | 16px                     | Regular or medium                           |
| Section heading                           | 20px                     | Semibold, tight tracking                    |
| List page heading                         | 30px compact / 36px wide | Bold, tight tracking                        |
| Detail hero heading                       | 30px compact / 48px wide | Bold, wraps; about 52px line height at 48px |

### Language and glyphs

Default sans-serif stack:

```css
"Geist Variable", "Noto Sans JP Variable", "Noto Sans SC Variable",
"Noto Sans TC Variable", "Noto Sans KR Variable", system-ui, sans-serif
```

Japanese is the default CJK glyph fallback. That is a rendering default, not a language assignment: it does not tag unknown text as Japanese.

Language-specific fallbacks after Geist:

| Language tag                | Preferred CJK font | Note                                                                    |
| --------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `ja`                        | Noto Sans JP       |                                                                         |
| `zh`                        | Noto Sans SC       | Default glyph preference; the tag alone does not prove a writing system |
| `zh-HK`, `zh-TW`, `zh-Hant` | Noto Sans TC       |                                                                         |
| `ko`                        | Noto Sans KR       |                                                                         |

Language tagging rules:

- Keep the document language aligned with the interface language. Tag content titles separately from known metadata.
- Use the item's known language first, then an established container language where the product supports that fallback.
- Leave unknown language unset. Never infer the language of a person's name from a release or from how it looks.

## Spacing and sizing

Use a 4px rhythm with 8px, 12px, 16px, 24px, and 32px steps, through the framework's spacing scale (Tailwind utilities on the web). Do not add tokens that only rename steps of that scale. Responsive and native layouts may adapt these values to fit their platform.

| Use                        | Value |
| -------------------------- | ----- |
| Smallest compact control   | 24px  |
| Small control              | 28px  |
| Standard desktop control   | 32px  |
| Large control, nav row     | 40px  |
| Largest control            | 48px  |
| Page inset                 | 24px  |
| Tile and grid gap          | 16px  |
| Space between sections     | 32px  |
| Card inset                 | 16px  |
| Expanded desktop sidebar   | 256px |
| Baseline desktop media bar | 80px  |

- Use the shared control size variants for control heights. These values are the common scale, not a mandate to rewrite every component's existing responsive sizing.
- Touch targets are at least 44px, even when the visible icon control is smaller.
- Expanded panels and wrapped controls may exceed baseline heights.

### Radii

| Token                                   | Value | Typical use                           |
| --------------------------------------- | ----- | ------------------------------------- |
| `radius-xs`                             | 4px   | Small labels and focus areas          |
| `radius-sm`, `radius-md`                | 6px   | Compact controls                      |
| `radius-lg`                             | 8px   | Standard controls and navigation rows |
| `radius-xl`, `radius-2xl`, `radius-3xl` | 12px  | Artwork tiles and cards               |
| `radius-4xl`                            | 16px  | Large artwork and floating surfaces   |

Round portraits and transport buttons are full circles. Short filter labels are pills. Multiline or stacked labels use a rounded rectangle that grows with the content.

The scale is deliberately clamped: `xl`, `2xl`, and `3xl` all resolve to 12px so Tailwind `rounded-*` utilities stay within the intended range without per-call overrides.

## Elevation

Use elevation for artwork, popovers, and floating controls. Ordinary text sections stay flat. Keep these shadows in shared theme tokens.

| Token              | Dark                                           | Light                                        |
| ------------------ | ---------------------------------------------- | -------------------------------------------- |
| `ds-shadow-card`   | `0 1px 0 #ffffff0a inset, 0 0 0 1px #00000040` | `0 1px 2px #1b19160d, 0 0 0 1px #1b19160f`   |
| `ds-shadow-hover`  | `0 8px 24px #00000066, 0 0 0 1px #ffffff14`    | `0 8px 24px #1b19161f, 0 0 0 1px #1b191614`  |
| `ds-shadow-pop`    | `0 12px 32px #000000a6, 0 0 0 1px #ffffff14`   | `0 12px 32px #1b19162e, 0 0 0 1px #1b191614` |
| `ds-shadow-player` | `0 12px 40px #000000b3, 0 0 0 1px #ffffff14`   | `0 12px 40px #1b19162e, 0 0 0 1px #1b191614` |
| `ds-glow-primary`  | `0 0 0 1px #e8758b66, 0 0 24px #e8758b33`      | `0 0 0 1px #aa224966, 0 0 16px #aa224926`    |

Use `ds-glow-primary` sparingly: active playback or the current item only. Frosted floating surfaces must keep readable contrast over whatever scrolls behind them.

### Layering

Stacking order, lowest to highest:

1. Page content
2. Sticky headers and toolbars
3. Floating media bar
4. Overlays: popovers, menus, tooltips, scrim, and dialogs
5. Toasts

Overlays share one layer and stack in the order they open, so a menu opened from a dialog sits above that dialog. Keep the shared components' z-index values. Inside a component, use small local values only to order its own parts.

## Motion

- Hover and press feedback: 150ms. Enter and exit of menus, popovers, and toasts: 200ms. Larger layout transitions: 300ms maximum.
- Use ease-out for entering, ease-in for leaving. No bounce or overshoot.
- Under `prefers-reduced-motion: reduce`, drop hover lift, playback bar animation, and ambient effects; keep opacity fades at most.

## Components and states

### General

- Reuse the repository's shared controls. In Coss/Base UI projects, refine the local wrappers and their variants rather than restyling call sites. Use semantic HTML for simple layout and domain compositions. Native apps express the same intent through native controls.
- Keep explicit idle, hover, focus-visible, pressed/selected, disabled, loading, and error states. Loading placeholders follow the shape of their content.
- Focus ring: 2px `ring`, shown on `:focus-visible` only, with a 2px offset by default. Use an inset ring where an outer ring would be clipped or overlap neighbors, such as rows in lists and scroll areas or full-bleed canvases. Never remove it without an equivalent visible replacement.
- Icons share the existing icon set, a consistent stroke weight, and the component size variants. Icon-only actions need an accessible name and a short tooltip when the meaning is not obvious.
- The product mark is the existing SVG, rendered in `foreground` on a transparent background. Preserve its shape and proportions; do not add a decorative square behind it.

### Buttons and transport

- Primary buttons use `primary` with `primary-foreground`. Secondary, outline, and ghost variants serve less prominent actions.
- Round play/pause controls use a primary fill. Other transport controls are quiet and turn primary when active.

### Fields and chips

- Inputs, selects, and comboboxes share sizing, outlines, labels, focus, and error treatment. Field surfaces use `card` in both themes. Field focus is a `ring`-colored outline with a soft ring halo.
- Filter chips keep a subtle outline; selected chips gain a primary outline.

### Navigation

- Active sidebar rows use `sidebar-accent` as the surface, `foreground` for the label, and `primary` for the icon.
- Underline tabs are text-only with a primary active indicator and no hover fill.

### Feedback

- Empty states: a muted standalone icon, a clear title, a brief explanation, and an action when one is relevant. No bordered box behind the icon.
- Successful add-to-queue and add-to-collection actions show a concise toast. Errors name the failed action and offer a recovery where one exists.

## Media and collection layouts

Applies to products that already have media or collection screens.

### Artwork and tiles

- Square artwork for releases, round portraits for credited entities, 16:9 artwork for video collections. Artwork corners are 12px with restrained elevation.
- Tiles have a semibold title, a muted attribution line, and optional compact metadata. Titles do not underline on hover.
- Square tile rows start from a 150px minimum tile width with 16px gaps; wide tiles start from 240px.
- Release-type badges sit over the artwork. A plain Album needs no badge. Below 140px container width, keep the badge icon and accessible label but hide the visible text.
- Album and playlist tiles share the play button and active-playback treatment. Reveal artwork actions on hover and keyboard focus, and provide usable touch access.

### Playback

- Active playback uses a primary-colored title, a small bars indicator, and a restrained artwork glow.
- Media rows use spacing and hover treatment, not routine divider lines.
- Floating media bars sit above scrolling content with a small edge gap, rounded corners, and a surrounding shadow. Reserve bottom scroll space based on the actual bar height so final content and focused controls stay reachable.
- Keep quality badges concise; detailed codec and playback statistics belong in settings.
- Preserve the volume button's mute action and hover slider, with keyboard and touch access. Preserve existing mobile transport and device controls when restyling them.

### Collections

- Home preview sections show complete tiles in a single row with a View all action.
- Full collection screens use responsive grids. Loading and pagination behavior are product decisions.

## Responsive behavior and accessibility

- Adapt layouts to the available width: collapse desktop sidebars into accessible mobile navigation, wrap toolbars, reduce grid columns, and prioritize essential metadata.
- Keep page content clear of safe areas and persistent bars. Long titles, stacked badges, and expanded controls must grow or wrap without clipping or horizontal page overflow.
- Preserve keyboard navigation, visible focus, accessible names, overlay focus handling, and meaningful HTML or native semantics. Context menus supplement discoverable actions; they never replace them.
- Signal status and selection with color plus text, icon, or shape. Check contrast for text, outlined controls, and overlays in every theme the product exposes.
