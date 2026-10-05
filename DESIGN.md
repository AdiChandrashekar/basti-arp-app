# Design

Read this before changing how the app looks. The tokens live in `src/app.css`
(`:root` at the top, and the "Liquid glass layer" at the bottom).

**References** (design-languages catalogue v1.0): accessible mobile app for field
staff, with a light **Liquid Glass** surface layer added on 2026-10-05.

## Rules
- **Audience:** ARPs who are not tech-savvy, often outdoors in sunlight. Legibility beats style.
- **Colour:** keep the existing palette.
  - **Brand:** navy `#1b2d4f`.
  - **Status:** good `#147a3a`, warn `#8f5300` text / `#e59a00` edges, bad `#b42318`, accent blue `#1f63c7`.
  - **Status cues:** colour always comes with an icon or a word.
- **Glass goes on controls only:** the top bar (navy glass), the floating capsule tab bar, the month stepper, filter chips, bottom sheets, the sheet backdrop and notes. These get blur + saturate, a white 1px edge and an inset top highlight.
- **Content cards are near-opaque** (`rgba(255,255,255,.86)`) with a glass edge and highlight, but **no backdrop blur**: many blurred cards make scrolling janky on budget Android phones.
- **Background:** a soft fixed ambient wash in the app's own blue, green and amber, so the glass has something to refract.
- **Shapes:** concentric radii. Sheets are 30, cards 22, list items/tiles 18, buttons 16, controls inside cards 12–14. Capsules for the tab bar, stepper and chips.
- **Status edges stay solid** (card top borders, tile and school-card left borders).
- **Type:** system UI + Noto Sans Devanagari, 17px base, numbers 24–48px bold.
- **Tap targets:** 48px or more.
- **Motion:** a short springy press (0.2s). Everything is off under `prefers-reduced-motion`.
- **Fallbacks:** surfaces become solid when the browser lacks `backdrop-filter` or under `prefers-reduced-transparency`.

## Change log
- 2026-10-05: added the Liquid Glass surface layer; colours unchanged.
