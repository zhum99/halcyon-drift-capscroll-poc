// Live system readout (style guide §8)
const clockEl = document.querySelector("[data-clock]");
if (clockEl) {
  const tick = () => { clockEl.textContent = "T+" + new Date().toISOString().slice(11, 19); };
  tick();
  setInterval(tick, 1000);
}
