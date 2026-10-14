# Design

Visual specification for shared colors, typography, spacing, components, and responsive behavior.

Task-specific design direction takes precedence for the requested scope. Historical mockups and legacy screens are references; apply the user's later corrections. Keep shared theme tokens and component variants aligned with this guide.

## Visual direction

- Warm near-black surfaces, warm off-white text, and a muted rose accent. Dark mode is the reference appearance; the light palette uses warm paper surfaces and a deeper rose.
- Let content, artwork, typography, and spacing establish hierarchy. Use accent color for primary actions, selected controls, and active playback.
- Prefer open sections and quiet surfaces. Counters, informational sections, empty states, and ordinary media rows have no decorative frames or divider lines.
- Keep purposeful outlines on inputs, filter chips, outlined buttons and badges, and upload drop zones. Underline tabs retain their active indicator. Border removal is scoped to decorative framing.
- Refine shared components and variants for consistent color, type, spacing, radii, sizes, and states. Repeated page-level restyling belongs in a shared variant.

## Color palette

Use semantic tokens in UI code. Hex values belong in the shared theme. Pair filled surfaces with their corresponding foreground tokens rather than assuming white text.

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

Aliases: `card-foreground`, `popover-foreground`, `sidebar-accent-foreground`, `secondary-foreground`, and `accent-foreground` use `foreground`. `ring` and `sidebar-primary` use `primary`; `sidebar-primary-foreground` uses `primary-foreground`. `sidebar-border` uses `border` and `sidebar-ring` uses `ring`.

### Status colors

Each status has a fill, text on that fill, and text for a subtle tinted surface. Include an icon or label so color is not the only signal.

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

Subtle status badges use the status fill at 16% opacity in dark mode and 8% in light mode, with the status foreground text.

Chart colors: `chart-1 = primary`, `chart-2 = info`, `chart-3 = warning`, `chart-4 = #ff7ab8` in dark mode / `#b02a74` in light mode, and `chart-5 = success`. Use labels alongside chart and relationship colors.

## Typography

- Use Geist Variable for interface text and headings. Body weight is 400; controls use 500, section headings and item titles 600, and page headings 700.
- Use the normal sans-serif font for durations, track numbers, counts, playback statistics, dates, and file hashes. Use `font-variant-numeric: tabular-nums` when numbers need alignment. Reserve Geist Mono for code and literal keyboard notation.
- Use warm `foreground` for important text and `muted-foreground` for secondary information. Keep text readable; small secondary labels should not become an additional low-opacity layer.
- Headings use tight tracking. Tile titles and compact metadata can truncate with access to the full text; large headings wrap.
- Use the shared antialiased text treatment where supported.

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

Japanese is the default CJK glyph fallback. This does not assign a language to unknown text. Keep the document language aligned with the interface language and tag content titles separately using known metadata.

- `ja`: prioritize Noto Sans JP after Geist.
- `zh`: prioritize Noto Sans SC after Geist as the default glyph preference; the language tag alone does not prove a writing system.
- `zh-HK`, `zh-TW`, `zh-Hant`: prioritize Noto Sans TC after Geist.
- `ko`: prioritize Noto Sans KR after Geist.
- Use known item language first, then an established container language where the product supports that fallback. Leave unknown language unset. Do not infer the language of a person's name from a release or from appearance.

## Spacing and sizing

Use a 4px spacing rhythm with 8px, 12px, 16px, 24px, and 32px steps. Keep these values in shared tokens. Responsive and native layouts may adapt them to fit their platform.

| Token           | Value | Purpose                          |
| --------------- | ----- | -------------------------------- |
| `control-xs`    | 24px  | Smallest compact control         |
| `control-sm`    | 28px  | Small control                    |
| `control-md`    | 32px  | Standard desktop control         |
| `control-lg`    | 40px  | Large control and navigation row |
| `control-xl`    | 48px  | Largest control token            |
| `page-gutter`   | 24px  | Default page inset               |
| `grid-gap`      | 16px  | Tile and grid gap                |
| `section-gap`   | 32px  | Space between sections           |
| `card-pad`      | 16px  | Default card inset               |
| `sidebar-width` | 256px | Expanded desktop navigation      |
| `player-height` | 80px  | Baseline desktop media bar       |

Use shared control size variants; these tokens are the common scale, not a requirement to rewrite every existing component's responsive sizing. Touch targets should be at least 44px even when the visible icon control is smaller. Expanded panels and wrapped controls can exceed baseline heights.

### Radii

| Token                                   | Value | Typical use                           |
| --------------------------------------- | ----- | ------------------------------------- |
| `radius-xs`                             | 4px   | Small labels and focus areas          |
| `radius-sm`, `radius-md`                | 6px   | Compact controls                      |
| `radius-lg`                             | 8px   | Standard controls and navigation rows |
| `radius-xl`, `radius-2xl`, `radius-3xl` | 12px  | Artwork tiles and cards               |
| `radius-4xl`                            | 16px  | Large artwork and floating surfaces   |

Use a full circle for round portraits and transport buttons, and a pill for short filter labels. Multiline or stacked labels use a rounded rectangle that grows with its content.

## Elevation

Use elevation for artwork, popovers, and floating controls. Ordinary text sections remain flat. Keep these shadows in shared theme tokens.

| Token              | Dark                                           | Light                                        |
| ------------------ | ---------------------------------------------- | -------------------------------------------- |
| `ds-shadow-card`   | `0 1px 0 #ffffff0a inset, 0 0 0 1px #00000040` | `0 1px 2px #1b19160d, 0 0 0 1px #1b19160f`   |
| `ds-shadow-hover`  | `0 8px 24px #00000066, 0 0 0 1px #ffffff14`    | `0 8px 24px #1b19161f, 0 0 0 1px #1b191614`  |
| `ds-shadow-pop`    | `0 12px 32px #000000a6, 0 0 0 1px #ffffff14`   | `0 12px 32px #1b19162e, 0 0 0 1px #1b191614` |
| `ds-shadow-player` | `0 12px 40px #000000b3, 0 0 0 1px #ffffff14`   | `0 12px 40px #1b19162e, 0 0 0 1px #1b191614` |
| `ds-glow-primary`  | `0 0 0 1px #e8758b66, 0 0 24px #e8758b33`      | `0 0 0 1px #aa224966, 0 0 16px #aa224926`    |

Use the primary glow sparingly for active playback or the current item. Frosted floating surfaces must retain readable contrast over the content behind them.

## Components and states

- Reuse the repository's shared controls. For Coss/Base UI projects, refine the local wrappers and their variants. Use semantic HTML for simple layout and domain compositions. Native apps express the same visual intent through native controls.
- Primary buttons use `primary` and `primary-foreground`. Secondary, outline, and ghost variants serve less prominent actions. Round play/pause controls use a primary fill; other transport controls are quiet and turn primary when active.
- Inputs, selects, and comboboxes share sizing, outlines, labels, focus, and error treatments. Dark field surfaces use `card`. Filter chips retain a subtle outline; selected chips gain a primary outline.
- Active sidebar rows use `sidebar-accent`, the main foreground for the label, and primary for the icon. Underline tabs are text-only with a primary active indicator and no hover fill.
- Empty states use a muted standalone icon, a clear title, a brief explanation, and an action when relevant. Avoid a bordered box behind the icon.
- Keep explicit idle, hover, focus-visible, pressed/selected, disabled, loading, and error states. Loading placeholders follow the shape of their content.
- Use the existing product SVG mark, rendered in the foreground color on a transparent background. Preserve its shape and proportions; a decorative square is not part of this treatment. Other repositories retain their own product mark.
- Icons share the existing icon set, consistent stroke weight, and component size variants. Give icon-only actions accessible names and short tooltips when their meaning needs explanation.
- Successful add-to-queue and add-to-collection actions give concise toast feedback. Errors explain the failed action and offer a useful recovery where available.

## Media and collection layouts

Apply these patterns when the product contains media or collection screens; they do not require adding those features to another application.

- Square artwork for releases, round portraits for credited entities, and 16:9 artwork for video collections. Use 12px artwork corners and restrained elevation.
- Tiles have a semibold title, a muted attribution line, and optional compact metadata. Titles do not underline on hover. A standard square tile row starts from a 150px minimum tile width with 16px gaps; wide tiles start from 240px.
- Put release-type badges over the artwork. A plain Album needs no type badge. Below 140px container width, retain the badge icon and accessible label while hiding its visible text.
- Album and playlist tiles share the play button and active-playback treatment. Reveal artwork actions on hover and keyboard focus; provide usable touch access.
- Active playback uses a primary title, a small bars indicator, and a restrained artwork glow. Media rows use spacing and hover treatment rather than routine divider lines.
- Home preview sections show complete tiles in one row with a View all action. Full collection screens use responsive grids. Loading and pagination behavior remain product decisions.
- Floating media bars sit above scrolling content with a small edge gap, rounded corners, and surrounding shadow. Reserve bottom scroll space based on the actual bar height so final content and focused controls remain reachable.
- Keep quality badges concise; detailed codec and playback statistics belong in settings. Preserve the volume button's mute action and hover slider, with keyboard and touch access. Preserve existing mobile transport and device controls when changing their appearance.

## Responsive behavior and accessibility

- Adapt layouts to the content width. Collapse desktop sidebars into accessible mobile navigation, wrap toolbars, reduce grid columns, and prioritize essential metadata.
- Keep safe areas and persistent bars clear of page content. Long titles, stacked badges, and expanded controls must grow or wrap without clipping or horizontal page overflow.
- Preserve keyboard navigation, visible focus, accessible names, overlay focus handling, and meaningful HTML or native semantics. Context menus supplement discoverable actions.
- Use color plus text, icons, or shape for status and selection. Check contrast for text, outlined controls, and overlays in every theme the product exposes.
- Keep motion brief and purposeful. Respect reduced-motion preferences for hover lift, playback indicators, transitions, and ambient effects.
