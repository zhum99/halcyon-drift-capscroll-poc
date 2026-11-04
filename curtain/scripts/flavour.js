/* =========================================================
   FLAVOUR TEXT — the line under the title hard-cuts between
   Chinese and Cyrillic. Edit or add pairs in LINES.
   ========================================================= */
(() => {
  const el = document.getElementById("flavour");
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const LINES = [
    { lang: "zh-Hans", cls: "fl-zh", text: "宁静漂流 // 幕布序列 07" },   // "Halcyon drift // curtain sequence 07"
    { lang: "ru",      cls: "fl-ru", text: "Тихий дрейф // Занавес 07" }, // "Quiet drift // curtain 07"
    { lang: "zh-Hans", cls: "fl-zh", text: "信号已获取 // 请勿接触" },     // "Signal acquired // do not touch"
    { lang: "ru",      cls: "fl-ru", text: "Сигнал потерян // Не вступать в контакт" }, // "Signal lost // do not engage"
  ];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % LINES.length;
    const { lang, cls, text } = LINES[i];
    el.lang = lang;
    el.className = "flavour " + cls;
    el.textContent = text;
  }, 2600);
})();
