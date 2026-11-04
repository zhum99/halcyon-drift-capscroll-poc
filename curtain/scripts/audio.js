/* =========================================================
   AMBIENT AUDIO — YouTube feed
   Browsers block sound until the visitor interacts with the page
   (a click, tap or key press — scrolling doesn't count). So the
   track starts on the FIRST interaction anywhere, and the nav
   "Sound" button toggles it after that.
   Note: YouTube embeds don't work from file:// — serve the folder
   (e.g. `python3 -m http.server`) and open http://localhost:8000/curtain/
   ========================================================= */
(() => {
  const VIDEO_ID = "dZ2NQ-xQINI";   // swap for any embeddable YouTube video id
  const VOLUME = 60;                // 0–100

  const panel = document.getElementById("audio");
  const btn = document.getElementById("soundBtn");
  const closeBtn = document.getElementById("audioClose");
  const note = document.getElementById("audioNote");

  let player = null, ready = false, on = false, userChose = false;

  function render() {
    btn.textContent = on ? "Sound on" : "Sound off";
    btn.setAttribute("aria-pressed", String(on));
    panel.classList.toggle("is-open", on);
  }

  function sync() {
    render();
    if (!ready) return;
    if (on) { player.unMute(); player.setVolume(VOLUME); player.playVideo(); }
    else { player.pauseVideo(); }
  }

  function setSound(value) { on = value; sync(); }

  if (location.protocol === "file:") {
    note.textContent = "Audio needs a local server — see README.";
  } else {
    window.onYouTubeIframeAPIReady = () => {
      player = new YT.Player("yt", {
        width: 200, height: 200, videoId: VIDEO_ID,
        playerVars: { controls: 1, loop: 1, playlist: VIDEO_ID, playsinline: 1, rel: 0, origin: location.origin },
        events: { onReady: () => { ready = true; sync(); } },
      });
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.append(s);
  }

  btn.addEventListener("click", () => { userChose = true; setSound(!on); });
  closeBtn.addEventListener("click", () => { userChose = true; setSound(false); });

  // First interaction anywhere turns sound on (unless they used the button)
  const firstTouch = (e) => {
    removeEventListener("pointerdown", firstTouch);
    removeEventListener("keydown", firstTouch);
    if (userChose || btn.contains(e.target) || panel.contains(e.target)) return;
    setSound(true);
  };
  addEventListener("pointerdown", firstTouch);
  addEventListener("keydown", firstTouch);

  render();
})();
