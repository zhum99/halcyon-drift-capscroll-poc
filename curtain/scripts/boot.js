/* =========================================================
   BOOT TERMINAL
   Types out a short DOS-style boot log, then shows [ ENTER ].
   Pressing it launches the page (and starts the audio — the
   click/keypress is what browsers need before allowing sound).
   ========================================================= */
(() => {
  const boot = document.getElementById("boot");
  const log = document.getElementById("bootLog");
  const gate = document.getElementById("bootGate");
  const enterBtn = document.getElementById("bootEnter");
  const mutedBtn = document.getElementById("bootMuted");
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Skip the terminal for previews (?p=0.5) — see curtain.js
  if (new URLSearchParams(location.search).has("p")) { launch(false, true); return; }

  // Always start at the top of the sequence
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  scrollTo(0, 0);
  document.body.style.overflow = "hidden";

  // [text, status] — status is printed in acid after the dots
  const LINES = [
    ["HALCYON-DOS V4.11   (C) 2026 HD SYSTEMS", ""],
    ["", ""],
    ["MEMORY TEST ............ 640K", "OK"],
    ["LOADING VOLT.DRV ........", "OK"],
    ["LOADING CURTAIN.SYS .....", "OK"],
    ["MOUNTING WIN-07 .........", "OK"],
    ["AUDIO FEED CH.07 ........", "STANDBY"],
    ["系统自检 ................", "正常", "zh"],          // system self-test ... normal
    ["ЗАГРУЗКА ЯДРА ...........", "ГОТОВО", "ru"],      // loading core ... ready
    ["", ""],
  ];
  const PROMPT = "C:\\HALCYON> RUN DRIFT.EXE";

  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const lineHTML = ([text, status, lang]) => {
    const body = esc(text) + (status ? ` <span class="ok">${status}</span>` : "");
    if (lang === "zh") return `<span class="fl-zh" lang="zh-Hans">${body}</span>`;
    if (lang === "ru") return `<span class="fl-ru" lang="ru">${body}</span>`;
    return body;
  };
  const cursor = '<span class="cursor"></span>';

  function showGate() {
    gate.classList.add("is-ready");
    enterBtn.focus({ preventScroll: true });
  }

  if (reduceMotion) {
    log.innerHTML = LINES.map(lineHTML).join("\n") + "\n" + esc(PROMPT) + cursor;
    showGate();
  } else {
    // Print each boot line as a hard cut, then type the prompt character by character
    let i = 0, done = "";
    const nextLine = () => {
      if (i < LINES.length) {
        done += lineHTML(LINES[i++]) + "\n";
        log.innerHTML = done + cursor;
        setTimeout(nextLine, 90 + Math.random() * 110);
      } else typePrompt(0);
    };
    const typePrompt = (n) => {
      log.innerHTML = done + esc(PROMPT.slice(0, n)) + cursor;
      if (n < PROMPT.length) setTimeout(() => typePrompt(n + 1), 28);
      else setTimeout(showGate, 220);
    };
    setTimeout(nextLine, 300);
  }

  function launch(withSound, instant = false) {
    if (root.classList.contains("launched")) return;
    root.classList.add("launched");
    document.body.style.overflow = "";
    if (withSound && window.HDAudio) window.HDAudio.start();
    if (instant || reduceMotion) { boot.classList.add("is-gone"); return; }
    planetReveal();
  }

  /* Expanding-planet transition: a circular hole grows out of the [ ENTER ]
     box and swallows the terminal (like the "one body" stage on the bubbles
     page), while a handful of satellites burst outward. */
  function planetReveal() {
    const box = enterBtn.getBoundingClientRect();
    const ox = box.left + box.width / 2, oy = box.top + box.height / 2;
    const maxR = Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy)) + 4;
    gate.style.visibility = "hidden";

    const layer = document.createElement("div");
    layer.className = "boot-planets";
    document.body.append(layer);
    const sats = Array.from({ length: 11 }, (_, i) => {
      const d = document.createElement("i");
      if (i % 3 === 1) d.className = "o";     // some outlined, like the bubbles page
      layer.append(d);
      return { d, a: (i / 11) * Math.PI * 2 + Math.random() * 0.5, sp: 0.55 + Math.random() * 0.9, r: 5 + Math.random() * 26 };
    });

    const DUR = 950, start = performance.now();
    const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const step = (now) => {
      const k = Math.min(1, (now - start) / DUR), e = ease(k);
      const r = e * maxR;
      // Mask: transparent inside the circle (page shows through), opaque outside
      const m = `radial-gradient(circle at ${ox}px ${oy}px, transparent ${r}px, black ${r + 1}px)`;
      boot.style.webkitMaskImage = m;
      boot.style.maskImage = m;
      sats.forEach(s => {
        const dist = e * maxR * s.sp * 1.25;
        const x = ox + Math.cos(s.a) * dist, y = oy + Math.sin(s.a) * dist * 0.9;
        s.d.style.transform = `translate(${x - 50}px, ${y - 50}px) scale(${(s.r * (0.4 + e)) / 50})`;
      });
      if (k < 1) requestAnimationFrame(step);
      else { boot.classList.add("is-gone"); layer.remove(); }
    };
    requestAnimationFrame(step);
  }

  enterBtn.addEventListener("click", () => launch(true));
  mutedBtn.addEventListener("click", () => launch(false));
  // Enter / Space anywhere launches once the gate is showing
  addEventListener("keydown", (e) => {
    if (!gate.classList.contains("is-ready") || root.classList.contains("launched")) return;
    if (e.key === "Enter" || e.key === " ") {
      if (e.target === mutedBtn) return;     // let that button do its own thing
      e.preventDefault();
      launch(true);
    }
  });
})();
