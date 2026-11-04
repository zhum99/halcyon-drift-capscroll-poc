# Graphic Realism — Website Style Guide

Style guide for building **static websites (HTML + CSS + vanilla JS)** in a "Graphic Realism" aesthetic: harsh contrast, neutral bases, loud neon accents, industrial/branded graphic overlays.

**Influences (for context, not imitation):** The Designers Republic (wipEout-era), F1/MotoGP livery, Mirror's Edge, Otomo / Koji Morimoto / Ghost in the Shell, Aeon Flux. Do **not** copy logos, wordmarks, characters, or brand assets from any of these — invent all marks, names, and serials.

---

## 1. Core Principles (follow in this order)

1. **Neutral dominates, accent punctuates.** 70–80% of any viewport is off-white, grey, or near-black. Accents cover ≤10–15%.
2. **Flat colour only.** No gradients, no soft glows, no blurred drop shadows. Colour reads as printed decal or paint.
3. **Hard edges.** `border-radius: 0` by default. Hard offset shadows only.
4. **Graphic noise as texture.** Micro-text, serials, barcodes, hazard stripes, registration marks fill space instead of photos or illustrations.
5. **Type is the hero.** Huge, tight, uppercase headlines against tiny technical labels. Extreme scale contrast.
6. **Crisp, clinical motion.** Snappy steps and cuts, not floaty eases.

---

## 2. Design Tokens

Put these in `:root` in `styles/tokens.css`. Never hard-code colours elsewhere.

```css
:root {
  /* Neutrals (the base — use most) */
  --c-paper:   #EDEDE8;  /* off-white page */
  --c-bone:    #D9D9D2;  /* secondary surface */
  --c-steel:   #8A8C8E;  /* muted text, rules */
  --c-graphite:#2A2B2D;  /* dark surfaces */
  --c-void:    #0B0B0C;  /* near-black, text on light */

  /* Accents (pick ONE primary + ONE secondary per page) */
  --c-acid:    #C6FF00;  /* acid green */
  --c-volt:    #FF2D8A;  /* hot magenta */
  --c-signal:  #FF5A00;  /* safety orange */
  --c-cobalt:  #1F3DFF;  /* electric blue */
  --c-hazard:  #FFD400;  /* warning yellow */

  /* Role mapping — change these per page, not the raw values */
  --bg:        var(--c-paper);
  --fg:        var(--c-void);
  --muted:     var(--c-steel);
  --surface:   var(--c-bone);
  --accent:    var(--c-acid);
  --accent-2:  var(--c-volt);
  --on-accent: var(--c-void);

  /* Type */
  --font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --font-body:    "Inter", "Helvetica Neue", Arial, sans-serif;
  --font-mono:    "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;

  --fs-micro: 0.625rem;   /* 10px technical labels */
  --fs-small: 0.8125rem;
  --fs-body:  1rem;
  --fs-h3:    clamp(1.25rem, 2vw, 1.75rem);
  --fs-h2:    clamp(2rem, 5vw, 4rem);
  --fs-h1:    clamp(3rem, 11vw, 10rem);

  /* Spacing — 4px base, strict grid */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-6: 24px; --s-8: 32px; --s-12: 48px; --s-16: 64px; --s-24: 96px;

  /* Lines & shadows */
  --rule:        1px solid var(--fg);
  --rule-heavy:  4px solid var(--fg);
  --shadow-hard: 6px 6px 0 var(--fg);
  --radius: 0;

  /* Motion */
  --t-snap: 120ms;
  --t-cut:  steps(4, end);
  --ease:   cubic-bezier(0.2, 0, 0, 1);
}

/* Dark variant: invert neutrals, keep accents */
[data-theme="dark"], .theme-dark {
  --bg: var(--c-void);
  --fg: var(--c-paper);
  --surface: var(--c-graphite);
  --muted: var(--c-steel);
}
```

### Colour rules
- **Allowed accent pairs:** acid + volt, signal + cobalt, hazard + void, acid + cobalt. Max **two accents per page**.
- Accent text sits on `--c-void` or is the background *behind* void text. Never put accent text on paper (acid/hazard on off-white fails contrast).
- Large accent blocks are fine (a full-bleed acid band), but **one per viewport**.
- Body copy is always `--fg` on `--bg`. Minimum contrast 4.5:1.

---

## 3. Typography

- **Display (h1/h2):** uppercase, weight 800–900, `letter-spacing: -0.04em`, `line-height: 0.85`. Allowed to bleed off-canvas or be cropped by `overflow: hidden`.
- **Labels / meta:** mono, `--fs-micro`, uppercase, `letter-spacing: 0.12em`. Used for serials, coordinates, section codes.
- **Body:** sans, 16–18px, `line-height: 1.5`, max width `64ch`.
- Load fonts from Google Fonts with `display=swap`; always keep the system fallback stack.

```css
h1, h2 { font-family: var(--font-display); text-transform: uppercase;
         font-weight: 900; letter-spacing: -0.04em; line-height: 0.85; }
.label { font-family: var(--font-mono); font-size: var(--fs-micro);
         text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }
```

**Pattern:** every headline gets a technical label above it, e.g. `SEC.02 // SYS-ROUTING // REV 4.1`.

---

## 4. Layout

- 12-column grid, `gap: var(--s-4)`, outer gutter `16px` mobile / `32px` desktop.
- Asymmetry is good: content spanning cols 1–7 with labels pinned in col 11–12.
- Separate sections with `--rule` or `--rule-heavy`, not whitespace alone.
- Use visible **frame lines**: thin 1px borders around panels, corner tick marks.
- No horizontal scroll at 375px. Oversized type must be clipped by a container, not the page.

```css
.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--s-4); }
.panel { border: var(--rule); padding: var(--s-6); background: var(--bg); position: relative; }
.panel::before, .panel::after { /* corner ticks */
  content: ""; position: absolute; width: 10px; height: 10px; border: 2px solid var(--fg); }
.panel::before { top: -6px; left: -6px; border-right: 0; border-bottom: 0; }
.panel::after  { bottom: -6px; right: -6px; border-left: 0; border-top: 0; }
```

---

## 5. Components

### Buttons
Flat, square, uppercase mono label, hard shadow that collapses on press.
```css
.btn { font: 700 var(--fs-small)/1 var(--font-mono); text-transform: uppercase;
       letter-spacing: 0.1em; padding: var(--s-3) var(--s-6);
       background: var(--accent); color: var(--on-accent);
       border: 2px solid var(--fg); border-radius: 0; box-shadow: var(--shadow-hard);
       transition: transform var(--t-snap) var(--ease), box-shadow var(--t-snap) var(--ease); }
.btn:hover  { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 var(--fg); }
.btn:active { transform: translate(6px,6px); box-shadow: 0 0 0 var(--fg); }
.btn--ghost { background: transparent; color: var(--fg); }
.btn:focus-visible { outline: 3px solid var(--accent-2); outline-offset: 3px; }
```

### Livery band (motorsport stripe)
```css
.livery { height: 12px; background:
  linear-gradient(90deg, var(--accent) 0 60%, var(--fg) 60% 64%, var(--accent-2) 64% 100%); }
```
(Hard colour stops only — this is a stripe, not a gradient.)

### Hazard stripe
```css
.hazard { height: 16px; background: repeating-linear-gradient(
  -45deg, var(--c-hazard) 0 12px, var(--c-void) 12px 24px); }
```

### Decal / tag
```css
.tag { display: inline-block; font: 700 var(--fs-micro)/1 var(--font-mono);
       text-transform: uppercase; letter-spacing: 0.12em; padding: 4px 6px;
       background: var(--fg); color: var(--bg); }
.tag--accent { background: var(--accent); color: var(--on-accent); }
```

### Big number
Oversized index numerals (`01`, `02`) in outline or accent, used for steps/sections.
```css
.numeral { font: 900 var(--fs-h1)/0.8 var(--font-display);
           color: transparent; -webkit-text-stroke: 2px var(--fg); }
```

### Cards
Square, 1px border, label row at top (code + tag), hard shadow on hover only.

### Navigation
Top bar with full-width `--rule-heavy` underneath. Links are mono uppercase. Active link = accent block behind text. Include a fake system readout on the right (e.g. `NODE 07 · ONLINE`).

---

## 6. Graphic Noise Kit

Use sparingly to fill dead space — max 3–4 per viewport.
- **Serial strings:** `MK-0417/B`, `UNIT 7C-AX`, `REV.04.11`.
- **Coordinates / timestamps:** `34.0522N 118.2437W`, `T+00:04:17`.
- **Barcodes:** CSS `repeating-linear-gradient` of uneven black bars, or inline SVG.
- **Registration marks:** small ⊕ crosshairs in corners.
- **Micro-copy blocks:** 3–5 lines of mono `--fs-micro` text, aligned right.
- **Invented logos only.** Never use real brands, sponsor marks, or game/studio logos.

```css
.barcode { width: 120px; height: 32px; background: repeating-linear-gradient(90deg,
  var(--fg) 0 2px, transparent 2px 4px, var(--fg) 4px 5px, transparent 5px 8px,
  var(--fg) 8px 11px, transparent 11px 13px); }
```

---

## 7. Imagery

- Prefer no photography. If used: desaturate to greyscale (`filter: grayscale(1) contrast(1.2)`), then overlay one flat accent shape or tag.
- Duotone allowed: void + one accent, via `mix-blend-mode: multiply` over an accent block.
- SVG icons: 2px stroke, square caps/joins, no rounded icons.

---

## 8. Motion (vanilla JS + CSS)

- Durations 80–200ms. No bouncy springs.
- **Reveal:** elements clip in with `clip-path` from one side, staggered 40ms.
- **Glitch/cut:** for headlines on load, use `steps()` timing to flicker in.
- **Ticker:** a looping mono status strip (`translateX` marquee) is on-brand.
- Always respect `prefers-reduced-motion`.

```css
.reveal { clip-path: inset(0 100% 0 0); transition: clip-path 300ms var(--ease); }
.reveal.is-in { clip-path: inset(0 0 0 0); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .reveal { clip-path: none; }
}
```

```js
// scripts/reveal.js
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('is-in'), i * 40);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
```

```js
// scripts/clock.js — live system readout
const el = document.querySelector('[data-clock]');
if (el) setInterval(() => {
  el.textContent = 'T+' + new Date().toISOString().slice(11, 19);
}, 1000);
```

JS is enhancement only: every page must be readable and navigable with JS disabled.

---

## 9. File Structure

```
/
├── index.html
├── styles/
│   ├── tokens.css      # section 2 — only place colours live
│   ├── base.css        # reset, type, layout grid
│   ├── components.css  # buttons, cards, tags, stripes
│   └── noise.css       # barcodes, marks, micro-text
├── scripts/
│   ├── reveal.js
│   └── clock.js
└── assets/
    └── svg/            # invented logos, icons, marks
```
- No build step required. Plain `<link>` and `<script defer>`.
- No CSS frameworks. No runtime JS libraries unless asked.

---

## 10. Do / Don't

| Do | Don't |
|---|---|
| Off-white or near-black base | Pure #FFF / #000 everywhere |
| 1–2 neon accents, used sparingly | Rainbow palettes, 3+ accents |
| Flat fills, hard stops | Gradients, glows, blur shadows |
| Square corners, hard offset shadows | Rounded cards, soft shadows |
| Huge tight uppercase headlines | Medium-sized timid headings |
| Mono micro-labels everywhere | Decorative script fonts |
| Invented serials and logos | Real brand / game / studio marks |
| Snappy 80–200ms motion | Slow fades, parallax overload |

---

## 11. Agent Checklist (run before finishing)

- [ ] All colours come from tokens; ≤2 accents on the page.
- [ ] Neutral surfaces cover most of each viewport.
- [ ] No `border-radius` > 0, no blurred `box-shadow`, no smooth gradients.
- [ ] Every section has a mono label + display headline.
- [ ] Text contrast ≥ 4.5:1 (check accent-on-paper especially).
- [ ] Works at 375px width with no horizontal scroll.
- [ ] `prefers-reduced-motion` honoured; page works without JS.
- [ ] Visible `:focus-visible` styles on all interactive elements.
- [ ] No real-world logos, brand names, or copyrighted assets.
