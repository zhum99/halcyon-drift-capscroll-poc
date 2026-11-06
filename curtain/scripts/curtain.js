/* =========================================================
   CURTAIN SEQUENCE
   Scroll position (0 → 1 through .sequence) drives four stages:
   01 Signal · 02 Draw · 03 Flood · 04 Fall
   Behind the curtain sits a 3D wireframe solar system seen through
   a moving camera, so everything has real depth parallax.
   ========================================================= */

/* ---- Knobs ---- */
const DRIPS  = 14;     // lava blobs that fall off the curtain
const FOLDS  = 11;     // lumps along the curtain's leading edge
const SEED   = 11;     // change for a different arrangement
const SMOOTH = 0.22;   // scroll follow: higher = snappier (style guide wants crisp)
const LAVA_SPEED = 0.022; // ambient drift when you're not scrolling
const STARS  = 170;    // starfield points around the system
const MOUSE_TILT = 0.2;   // how far the mouse swings the camera (radians)
const MOUSE_SMOOTH = 0.06;

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
const { sin, cos, PI } = Math;
const TAU = PI * 2;

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

function place(el, x, y, rx, ry = rx) {
  el.style.transform = `translate(${x - 50}px, ${y - 50}px) scale(${rx / 50}, ${ry / 50})`;
}

/* =========================================================
   3D WIREFRAME SOLAR SYSTEM
   World units: the sun is ~0.6 across, the outer orbit is 6.
   Drawn into the ink layer SVG, so it shows white on volt and
   volt on the curtain. Everything goes through one camera, so
   near things slide past far things: that is the parallax.
   ========================================================= */
const NS = "http://www.w3.org/2000/svg";
const planetsSvg = document.getElementById("planets");
const mk = (tag, attrs = {}, parent = planetsSvg) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.append(e);
  return e;
};
const LINE = { fill: "none", stroke: "currentColor", "stroke-linecap": "square" };

/* Layers, back to front */
const starDots  = mk("path", { fill: "currentColor" });
const starCross = mk("path", { ...LINE, "stroke-width": 1 });
const gridPath  = mk("path", { ...LINE, "stroke-width": 1 });
const ORBIT_R = [1.55, 2.25, 3.0, 3.85, 4.8, 5.9];
const orbitPaths = ORBIT_R.map((_, i) =>
  mk("path", { ...LINE, "stroke-width": 1.5, ...(i % 2 ? { "stroke-dasharray": "2 6" } : {}) }));
const axisPath  = mk("path", { ...LINE, "stroke-width": 1 });
const bodyLayer = mk("g");

/* Unit-sphere wireframes: parallels + meridians as 3D polylines */
function sphereWire(lats, lons, seg) {
  const lines = [];
  lats.forEach(deg => {
    const ph = deg * PI / 180, r = cos(ph), y = sin(ph), pts = [];
    for (let k = 0; k <= seg; k++) { const a = k / seg * TAU; pts.push([r * cos(a), y, r * sin(a)]); }
    lines.push(pts);
  });
  for (let i = 0; i < lons; i++) {
    const th = i * PI / lons, pts = [];
    for (let k = 0; k <= seg; k++) { const a = k / seg * TAU; pts.push([cos(a) * cos(th), sin(a), cos(a) * sin(th)]); }
    lines.push(pts);
  }
  return lines;
}
const WIRE_HI = sphereWire([-60, -30, 0, 30, 60], 6, 36);
const WIRE_LO = sphereWire([-45, 0, 45], 3, 20);
const RING_PTS = Array.from({ length: 49 }, (_, k) => [cos(k / 48 * TAU), 0, sin(k / 48 * TAU)]);

/* Sun: wireframe globe (far side dashed) around a filled core */
const sun = { g: mk("g", {}, bodyLayer) };
sun.back  = mk("path", { ...LINE, "stroke-width": 1, "stroke-dasharray": "1 4" }, sun.g);
sun.core  = mk("circle", { fill: "currentColor" }, sun.g);
sun.front = mk("path", { ...LINE, "stroke-width": 1.5 }, sun.g);

/* Planets — styles cycle like the bubbles page: filled · wire · ringed · dashed */
const PLANETS = [
  { size: 0.16, kind: "fill",  label: "01" },
  { size: 0.24, kind: "wire",  moon: true },
  { size: 0.2,  kind: "fill",  ring: 2.1 },
  { size: 0.14, kind: "dash" },
  { size: 0.32, kind: "wire",  ring: 1.8, moon: true },
  { size: 0.18, kind: "fill",  label: "06" },
].map((pl, i) => {
  const g = mk("g", {}, bodyLayer);
  const o = {
    ...pl, g, orbit: ORBIT_R[i],
    phase: rand() * TAU, tilt: (rand() - 0.5) * 0.9, burst: 1.35 + rand() * 0.9,
    speed: 0.9 / Math.pow(ORBIT_R[i], 1.5), lift: (rand() - 0.5) * 1.6,
  };
  if (pl.ring) o.ringBack = mk("path", { ...LINE, "stroke-width": 1, "stroke-dasharray": "1 4" }, g);
  if (pl.kind === "wire") {
    o.back  = mk("path", { ...LINE, "stroke-width": 1, "stroke-dasharray": "1 4" }, g);
    o.front = mk("path", { ...LINE, "stroke-width": 1.5 }, g);
  } else {
    o.disc = mk("circle", pl.kind === "fill"
      ? { fill: "currentColor" }
      : { ...LINE, "stroke-width": 2, "stroke-dasharray": "3 5" }, g);
  }
  if (pl.ring) o.ringFront = mk("path", { ...LINE, "stroke-width": 2 }, g);
  if (pl.label) { o.text = mk("text", {}, g); o.text.textContent = pl.label; o.text.style.fill = "var(--mask-off)"; }
  if (pl.moon) o.moon = mk("circle", { fill: "currentColor" }, g);
  return o;
});

/* Starfield: a box of points around the system, kept clear of the orbits.
   ~1 in 7 is a ⊕-style cross, echoing the registration marks. */
const stars = [];
while (stars.length < STARS) {
  const x = (rand() - 0.5) * 36, y = (rand() - 0.5) * 18, z = (rand() - 0.5) * 36;
  if (Math.hypot(x, z) < 7.5 && Math.abs(y) < 3) continue;
  stars.push({ x, y, z, cross: rand() < 0.14, s: 0.6 + rand() * 1.2 });
}

/* ---- Camera + projection ---- */
const cam = { p: [0, 0, 0], f: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0], focal: 800, cx: 0, cy: 0 };
const NEAR = 0.25;
function setCamera(yaw, pitch, dist, target, focal, cx, cy) {
  const [tx, ty, tz] = target;
  const p = [tx + dist * cos(pitch) * sin(yaw), ty + dist * sin(pitch), tz + dist * cos(pitch) * cos(yaw)];
  let f = [tx - p[0], ty - p[1], tz - p[2]];
  const fl = Math.hypot(...f); f = f.map(v => v / fl);
  let r = [-f[2], 0, f[0]];                       // cross(f, worldUp)
  const rl = Math.hypot(...r) || 1; r = r.map(v => v / rl);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  Object.assign(cam, { p, f, r, u, focal, cx, cy });
}
/* World point → [screenX, screenY, depth, pixelsPerUnit], or null behind the camera */
function proj(x, y, z) {
  const dx = x - cam.p[0], dy = y - cam.p[1], dz = z - cam.p[2];
  const d = dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2];
  if (d < NEAR) return null;
  const s = cam.focal / d;
  return [cam.cx + (dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2]) * s,
          cam.cy - (dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2]) * s, d, s];
}
const fx = n => n.toFixed(1);

/* Polyline through 3D points → path data, breaking where it goes behind the camera */
function polyD(pts) {
  let d = "", pen = false;
  for (const [x, y, z] of pts) {
    const q = proj(x, y, z);
    if (!q) { pen = false; continue; }
    d += (pen ? "L" : "M") + fx(q[0]) + " " + fx(q[1]);
    pen = true;
  }
  return d;
}

/* Transform unit-space lines (spin about Y, tilt about Z, scale, move), project,
   and split segments into near side (solid) and far side (dashed). */
function wireD(lines, c, R, spin, tilt) {
  const cs = cos(spin), ss = sin(spin), ct = cos(tilt), st = sin(tilt);
  let front = "", back = "";
  for (const line of lines) {
    let prev = null, prevSide = null;
    for (const [ux, uy, uz] of line) {
      const ax = ux * cs - uz * ss, az = ux * ss + uz * cs;          // spin
      const nx = ax * ct - uy * st, ny = ax * st + uy * ct, nz = az;  // tilt
      const wx = c[0] + nx * R, wy = c[1] + ny * R, wz = c[2] + nz * R;
      const facing = nx * (cam.p[0] - wx) + ny * (cam.p[1] - wy) + nz * (cam.p[2] - wz) > 0;
      const q = proj(wx, wy, wz);
      if (q && prev) {
        const seg = "M" + fx(prev[0]) + " " + fx(prev[1]) + "L" + fx(q[0]) + " " + fx(q[1]);
        if (facing && prevSide) front += seg; else back += seg;
      }
      prev = q; prevSide = facing;
    }
  }
  return [front, back];
}

/* Ring around a body: split into the half in front of / behind the body centre */
function ringD(c, R, tilt) {
  const ct = cos(tilt), st = sin(tilt), cq = proj(...c);
  let front = "", back = "", prev = null;
  for (const [ux, , uz] of RING_PTS) {
    const x = c[0] + ux * R * ct, y = c[1] + ux * R * st, z = c[2] + uz * R;
    const q = proj(x, y, z);
    if (q && prev && cq) {
      const seg = "M" + fx(prev[0]) + " " + fx(prev[1]) + "L" + fx(q[0]) + " " + fx(q[1]);
      if (q[2] < cq[2]) front += seg; else back += seg;
    }
    prev = q;
  }
  return [front, back];
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

/* ---- Pointer parallax (mouse only; touch just uses scroll) ---- */
let mx = 0, my = 0, tmx = 0, tmy = 0;
if (!reduceMotion) {
  addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    tmx = e.clientX / innerWidth * 2 - 1;
    tmy = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { tmx = 0; tmy = 0; });
}

/* HUD layers drift at different depths: [selector, px per mouse unit x, y, px over the whole scroll] */
const DEPTHS = [
  [".win-label, .win-label-r, .reg", 4, 3, 0],
  [".readout",     8,   6, 0],
  [".title-block", -16, -10, -28],
  [".caps",        -10, -6, 0],
  [".stage-num",   26,  14, 0],
].flatMap(([sel, ax, ay, as]) => [...document.querySelectorAll(".window " + sel)].map(el => ({ el, ax, ay, as })));
const gooBlur = goo;

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
let bodyOrder = "";

function frame(now) {
  progress += (targetProgress() - progress) * (reduceMotion ? 1 : SMOOTH);
  mx += (tmx - mx) * MOUSE_SMOOTH; my += (tmy - my) * MOUSE_SMOOTH;
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

  /* ---- Camera: one move per stage ----
     Signal: far and oblique · Draw: swings round and closes in ·
     Flood: climbs overhead · Fall: dives to the orbital plane as the system bursts */
  const S4 = [0, 1/3, 2/3, 1];
  const k4 = vals => keyed(p, S4.map((s, i) => [s, vals[i]]));
  const narrow = W < 700;
  const yaw   = k4([-0.55, 0.5, 1.5, 2.6]) + t * 0.025 + mx * MOUSE_TILT;
  const pitch = clamp(k4([0.36, 0.55, 1.1, 0.16]) + my * MOUSE_TILT * 0.6, -0.4, 1.35);
  const dist  = k4([14, 10.5, 8.5, 7.5]) * (narrow ? 1.35 : 1);
  const focal = Math.min(W, H) * 1.05;
  const anchorX = W * (narrow ? k4([0.55, 0.5, 0.5, 0.5]) : k4([0.66, 0.6, 0.52, 0.5]));
  const anchorY = H * k4([0.5, 0.5, 0.48, 0.52]);
  setCamera(yaw, pitch, dist, [0, 0, 0], focal, anchorX, anchorY);
  const burst = fall;

  /* Starfield */
  let dots = "", crosses = "";
  for (const s of stars) {
    const q = proj(s.x, s.y, s.z);
    if (!q || q[0] < -20 || q[0] > W + 20 || q[1] < -20 || q[1] > H + 20) continue;
    if (s.cross) {
      const a = clamp(q[3] * 0.09 * s.s, 2.5, 9);
      crosses += `M${fx(q[0] - a)} ${fx(q[1])}h${fx(a * 2)}M${fx(q[0])} ${fx(q[1] - a)}v${fx(a * 2)}`;
    } else {
      const r = clamp(q[3] * 0.018 * s.s, 0.6, 3.2);
      dots += `M${fx(q[0] - r)} ${fx(q[1])}a${fx(r)} ${fx(r)} 0 1 0 ${fx(r * 2)} 0a${fx(r)} ${fx(r)} 0 1 0 ${fx(-r * 2)} 0`;
    }
  }
  starDots.setAttribute("d", dots);
  starCross.setAttribute("d", crosses);

  /* Polar grid on the orbital plane: radial spokes + vertical axis */
  const spread = lerp(1, 1.6, burst);
  let grid = "";
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU, r0 = 0.95, r1 = (i % 4 ? 6.4 : 7.4) * spread;
    grid += polyD([[cos(a) * r0, 0, sin(a) * r0], [cos(a) * r1, 0, sin(a) * r1]]);
  }
  gridPath.setAttribute("d", grid);
  gridPath.style.opacity = 1 - burst * 0.4;
  axisPath.setAttribute("d", polyD([[0, -2.6, 0], [0, -0.75, 0]]) + polyD([[0, 0.75, 0], [0, 2.6, 0]]) +
    [-2, -1.5, 1.5, 2].map(y => polyD([[-0.12, y, 0], [0.12, y, 0]])).join(""));
  axisPath.style.opacity = 1 - burst * 0.6;

  orbitPaths.forEach((el, i) => {
    const R = ORBIT_R[i] * lerp(1, PLANETS[i].burst, burst);
    el.setAttribute("d", polyD(Array.from({ length: 97 }, (_, k) => [cos(k / 96 * TAU) * R, 0, sin(k / 96 * TAU) * R])));
    el.style.opacity = 1 - burst * 0.3;
  });

  /* Sun: swells through Draw and Flood, collapses to a full stop on Fall */
  const sunR = k4([0.55, 0.75, 1.05, 0.22]);
  const [sf, sb] = wireD(WIRE_HI, [0, 0, 0], sunR, t * 0.15 + p * PI, 0.4);
  sun.front.setAttribute("d", sf); sun.back.setAttribute("d", sb);
  const sq = proj(0, 0, 0);
  if (sq) {
    sun.core.setAttribute("cx", sq[0]); sun.core.setAttribute("cy", sq[1]);
    sun.core.setAttribute("r", sunR * sq[3] * lerp(0.42, 1, burst));
  }
  const depths = [[sq ? sq[2] : 0, sun.g]];

  /* Planets */
  PLANETS.forEach(pl => {
    const ang = pl.phase + t * pl.speed * 0.25 + p * pl.speed * 5;
    const R = pl.orbit * lerp(1, pl.burst, burst);
    const c = [cos(ang) * R, pl.lift * burst, sin(ang) * R];
    const size = pl.size * lerp(1, 1.7, burst);
    const q = proj(...c);
    pl.g.style.display = q ? "" : "none";
    if (!q) return;
    depths.push([q[2], pl.g]);
    const rpx = size * q[3];
    if (pl.front) {
      const [f, b] = wireD(rpx > 18 ? WIRE_HI : WIRE_LO, c, size, t * 0.6 + ang, pl.tilt);
      pl.front.setAttribute("d", f); pl.back.setAttribute("d", b);
    } else {
      pl.disc.setAttribute("cx", q[0]); pl.disc.setAttribute("cy", q[1]); pl.disc.setAttribute("r", rpx);
    }
    if (pl.ring) {
      const [f, b] = ringD(c, size * pl.ring, pl.tilt);
      pl.ringFront.setAttribute("d", f); pl.ringBack.setAttribute("d", b);
    }
    if (pl.text) {
      pl.text.setAttribute("x", q[0]); pl.text.setAttribute("y", q[1]);
      pl.text.style.fontSize = Math.max(8, rpx * 0.75) + "px";
      pl.text.style.opacity = rpx > 11 ? 1 : 0;
    }
    if (pl.moon) {
      const ma = t * 0.9 + ang * 3, mr = size * 2.6;
      const mq = proj(c[0] + cos(ma) * mr, c[1] + sin(ma) * mr * 0.3, c[2] + sin(ma) * mr);
      if (mq) { pl.moon.setAttribute("cx", mq[0]); pl.moon.setAttribute("cy", mq[1]); pl.moon.setAttribute("r", Math.max(1.5, size * 0.28 * mq[3])); }
    }
  });

  /* Painter's order: farthest body first */
  depths.sort((a, b) => b[0] - a[0]);
  const order = depths.map(d => PLANETS.findIndex(pl => pl.g === d[1])).join();
  if (order !== bodyOrder) { bodyOrder = order; depths.forEach(([, g]) => bodyLayer.append(g)); }

  /* Flat layers drift at their own depths; the curtain sits nearest */
  DEPTHS.forEach(({ el, ax, ay, as }) => { el.style.translate = `${fx(mx * ax)}px ${fx(my * ay + p * as)}px`; });
  gooBlur.style.translate = `${fx(mx * -22)}px ${fx(my * -14)}px`;

  /* HUD — captions switch as hard cuts, not fades */
  const stage = Math.round(p * 3);
  if (stage !== currentStage) {
    currentStage = stage;
    caps.forEach((c, i) => c.classList.toggle("is-in", i === stage));
    stageNum.textContent = "0" + (stage + 1);
    seqCounter.textContent = `SEQ 0${stage + 1}/04`;
  }
  navProgress.style.transform = `scaleX(${p})`;
  const deg = v => String(Math.round((((v * 180 / PI) % 360) + 360) % 360)).padStart(3, "0");
  readout.innerHTML =
    `COVER ${String(Math.round(clamp(cover / 1.5) * 100)).padStart(3, "0")}%<br>` +
    `DESCENT ${String(Math.round(fall * 100)).padStart(3, "0")}%<br>` +
    `CAM ${deg(yaw)}° / ALT ${deg(pitch)}°<br>` +
    `RANGE ${dist.toFixed(2)} AU<br>` +
    `VISC 0.${81 + Math.round(sin(t) * 3)}`;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
