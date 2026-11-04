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
    boot.classList.add("is-leaving");
    setTimeout(() => boot.classList.add("is-gone"), 280);
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
