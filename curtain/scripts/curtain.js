/* =========================================================
   CURTAIN SEQUENCE
   Scroll position (0 → 1 through .sequence) drives four stages:
   01 Signal · 02 Draw · 03 Flood · 04 Fall
   ========================================================= */

/* ---- Knobs ---- */
const DRIPS  = 14;     // lava blobs that fall off the curtain
const FOLDS  = 11;     // lumps along the curtain's leading edge
const SEED   = 11;     // change for a different arrangement
const SMOOTH = 0.22;   // scroll follow: higher = snappier (style guide wants crisp)
const LAVA_SPEED = 0.022; // ambient drift when you're not scrolling

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - t, 4);            // fast-out, no float
const smooth = t => t * t * (3 - 2 * t);
const { sin, cos } = Math;

/* ---- Ticker ---- */
// Flavour items alternate Chinese / Cyrillic, with neutral serials between
const TICKER = [
  ["zh-Hans", "幕布正在拉开"],          // curtain drawing open
  ["ru",      "Занавес опускается"],    // curtain descending
  ["",        "UNIT 7C-AX"],
  ["zh-Hans", "黏度 0.81"],              // viscosity 0.81
  ["ru",      "Вязкость 0.81"],         // viscosity 0.81
  ["",        "REV.04.11"],
  ["zh-Hans", "物质正在下沉"],          // mass descending
  ["ru",      "Масса снижается"],       // mass descending
  ["",        "34.0522N 118.2437W"],
  ["zh-Hans", "请勿接触"],              // do not touch
  ["ru",      "Не вступать в контакт"], // do not engage
  ["",        "NODE 07 · ONLINE"],
];
const words = TICKER.map(([lang, t]) => {
  const cls = lang === "ru" ? "fl-ru" : lang ? "fl-zh" : "";
  return `<span${lang ? ` lang="${lang}" class="${cls}"` : ""}>⊕ ${t}</span>`;
}).join("");
document.getElementById("ticker").innerHTML = words + words;

/* ---- Build the mask shapes ---- */
const goo = document.getElementById("goo");
const windowEl = document.querySelector(".window");
function shape(cls = "b") { const d = document.createElement("div"); d.className = cls; goo.append(d); return d; }
const curtain = shape("curtain");
const folds = Array.from({ length: FOLDS }, () => shape());
const lumps = Array.from({ length: 8 }, () => shape());
const drips = Array.from({ length: DRIPS }, () => ({ el: shape(), s: [rand(), rand(), rand(), rand()] }));

/* ---- Planet system (the bubbles-page motif) ----
   Lives in the ink layer, so it shows white on volt and volt on the curtain. */
const NS = "http://www.w3.org/2000/svg";
const planetsSvg = document.getElementById("planets");
const svgEl = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  planetsSvg.append(e);
  return e;
};
const orbit  = svgEl("circle",  { fill: "none", stroke: "currentColor", "stroke-width": 1.5, "stroke-dasharray": "2 6" });
const planet = svgEl("circle",  { fill: "currentColor" });
const ring   = svgEl("ellipse", { fill: "none", stroke: "currentColor", "stroke-width": 2 });
const SATS = 12;
const sats = Array.from({ length: SATS }, (_, i) => {
  const type = i % 4;                       // 0 filled · 1 outline · 2 filled + number · 3 dashed
  const filled = type === 0 || type === 2;
  const c = svgEl("circle", {
    fill: filled ? "currentColor" : "none", stroke: "currentColor",
    "stroke-width": filled ? 0 : 2, ...(type === 3 ? { "stroke-dasharray": "3 5" } : {}),
  });
  const label = type === 2 ? svgEl("text", {}) : null;
  if (label) label.style.fill = "var(--mask-off)";
  if (label) label.textContent = String(i * 3 + 1).padStart(2, "0");
  return { c, label, s: [rand(), rand(), rand()] };
});

function place(el, x, y, rx, ry = rx) {
  el.style.transform = `translate(${x - 50}px, ${y - 50}px) scale(${rx / 50}, ${ry / 50})`;
}

/* Keyframes with a hold at each stage */
function keyed(p, stops) {
  if (p <= stops[0][0]) return stops[0][1];
  for (let k = 0; k < stops.length - 1; k++) {
    const [a, va] = stops[k], [b, vb] = stops[k + 1];
    if (p <= b) return lerp(va, vb, ease(clamp(((p - a) / (b - a) - 0.15) / 0.7)));
  }
  return stops[stops.length - 1][1];
}

/* Sizes are relative to the window panel, not the whole screen */
let W, H, VMIN;
function resize() {
  W = windowEl.clientWidth; H = windowEl.clientHeight; VMIN = Math.min(W, H) / 100;
  curtain.style.width = W * 3 + "px";
  curtain.style.height = H * 3.2 + "px";
  goo.style.filter = `blur(${Math.max(10, VMIN * 2.2)}px)`;
}
resize();
addEventListener("resize", resize);

/* ---- HUD refs ---- */
const section = document.getElementById("sequence");
const caps = [...document.querySelectorAll(".cap")];
const navProgress = document.getElementById("navProgress");
const seqCounter = document.getElementById("seqCounter");
const stageNum = document.getElementById("stageNum");
const readout = document.getElementById("readout");
// Preview helper: add ?p=0.5 to the URL to freeze the sequence at that point
const forced = new URLSearchParams(location.search).get("p");
const targetProgress = () => forced !== null ? clamp(+forced) : clamp(-section.getBoundingClientRect().top / (section.offsetHeight - innerHeight));
let progress = targetProgress();
let currentStage = -1;

function frame(now) {
  progress += (targetProgress() - progress) * (reduceMotion ? 1 : SMOOTH);
  const p = progress;
  const t = reduceMotion ? 0 : now / 1000;

  /* Stage choreography */
  const cover = keyed(p, [[0, 0.16], [1/3, 0.55], [2/3, 1.5], [1, 1.5]]);
  const lean  = keyed(p, [[0, 0.08], [1/3, 0.22], [2/3, 0.3], [1, 0.45]]) * W;
  const fall  = keyed(p, [[0, 0], [2/3, 0], [1, 1]]);
  const dx = -fall * W * 0.55, dy = fall * H * 1.75;
  const edgeAt = y => W * (1 - cover) - lean * ((y - dy) / H) + dx;

  const top = -0.6 * H + dy;
  curtain.style.transform = `translate(${edgeAt(top)}px, ${top}px) skewX(${-Math.atan(lean / H)}rad)`;

  folds.forEach((el, i) => {
    const y = -0.6 * H + i * (1.8 * H / (FOLDS - 1)) + dy;
    const r = VMIN * (9 + 4 * sin(t * 0.45 + i * 2.1));
    place(el, edgeAt(y) + sin(t * 0.6 + i * 1.3) * VMIN * 4, y, r * 0.9, r * 1.2);
  });

  lumps.forEach((el, j) => {
    const x = edgeAt(top) + VMIN * 12 + j * (W * 1.3 / lumps.length);
    const r = VMIN * (8 + 3 * sin(t * 0.4 + j));
    place(el, x, top + sin(t * 0.5 + j * 1.7) * VMIN * 3, r);
  });

  const live = (0.45 + p * 1.8) * DRIPS;
  drips.forEach((d, i) => {
    const [a, b, c, o] = d.s;
    const u = (((o + t * LAVA_SPEED * (0.6 + b) + p * 1.4) % 1) + 1) % 1;
    const y0 = H * (0.04 + 0.62 * a);
    const Rm = VMIN * (3.5 + 7 * c);
    const x0 = lerp(edgeAt(y0), W + Rm * 0.3, fall);
    const x = lerp(x0, -Rm * 3, u) + sin(t * 0.8 + i) * VMIN * 1.2;
    const y = lerp(y0, y0 + H * (0.3 + 0.45 * c), u * u) + cos(t * 0.7 + i * 1.9) * VMIN * 1.2;
    const r = Rm * smooth(clamp(u / 0.12)) * clamp(live - i) * (0.85 + 0.15 * sin(t * 1.1 + i * 3));
    place(d.el, x, y, r * (1 - 0.12 * u), r * (1 + 0.3 * u));
  });

  /* Planets: orbit near the curtain edge, swell through Draw and Flood,
     then collapse to a full stop as the satellites burst outward on Fall */
  const S4 = [0, 1/3, 2/3, 1];
  const k4 = vals => keyed(p, S4.map((s, i) => [s, vals[i]]));
  const pcx = W * k4([0.7, 0.66, 0.62, 0.5]);
  const pcy = H * k4([0.44, 0.5, 0.5, 0.5]);
  const pr  = VMIN * k4([5, 9, 15, 1.4]);
  const orbitR = VMIN * k4([20, 28, 36, 36]);
  const burst = fall;                              // 0 → 1 on the last stage
  planet.setAttribute("cx", pcx); planet.setAttribute("cy", pcy); planet.setAttribute("r", pr);
  ring.setAttribute("cx", pcx); ring.setAttribute("cy", pcy);
  ring.setAttribute("rx", pr * 2.1); ring.setAttribute("ry", pr * 0.45);
  ring.setAttribute("transform", `rotate(-18 ${pcx} ${pcy})`);
  ring.style.opacity = 1 - burst;
  orbit.setAttribute("cx", pcx); orbit.setAttribute("cy", pcy); orbit.setAttribute("r", orbitR);
  orbit.style.opacity = 1 - burst;
  const diag = Math.hypot(W, H);
  sats.forEach(({ c, label, s: [, b, sz] }, i) => {
    const ang = (i / SATS) * Math.PI * 2 + t * 0.12 + p * Math.PI * 2;
    const R = lerp(orbitR, diag * (0.35 + 0.35 * b), burst);
    const r = VMIN * (1.2 + 2 * sz) * k4([1, 1.3, 1.5, 3.5]);
    const x = pcx + Math.cos(ang) * R, y = pcy + Math.sin(ang) * R * 0.92;
    c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", r);
    if (label) {
      label.setAttribute("x", x); label.setAttribute("y", y);
      label.style.fontSize = Math.max(8, r * 0.7) + "px";
      label.style.opacity = r > 14 ? 1 : 0;
    }
  });

  /* HUD — captions switch as hard cuts, not fades */
  const stage = Math.round(p * 3);
  if (stage !== currentStage) {
    currentStage = stage;
    caps.forEach((c, i) => c.classList.toggle("is-in", i === stage));
    stageNum.textContent = "0" + (stage + 1);
    seqCounter.textContent = `SEQ 0${stage + 1}/04`;
  }
  navProgress.style.transform = `scaleX(${p})`;
  readout.innerHTML =
    `COVER ${String(Math.round(clamp(cover / 1.5) * 100)).padStart(3, "0")}%<br>` +
    `DESCENT ${String(Math.round(fall * 100)).padStart(3, "0")}%<br>` +
    `VISC 0.${81 + Math.round(sin(t) * 3)}`;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
