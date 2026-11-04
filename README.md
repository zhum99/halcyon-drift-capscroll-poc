# Halcyon Drift — captive scroll studies

Two static, single-page proofs of concept for a captive (sticky) scroll sequence. No build step.

| Folder | What it is |
|---|---|
| [`bubbles/`](bubbles/) | White abstract bubbles on neon red: scatter → orbit → halftone matrix → one body → release. Single self-contained HTML file. |
| [`curtain/`](curtain/) | A paper-white lava-lamp curtain draws across a volt window, floods it, then falls away. Follows [`graphic-realism-style-guide.md`](graphic-realism-style-guide.md); includes an ambient YouTube audio feed. |

## Run it

The bubbles page works by double-clicking `bubbles/index.html`.

The curtain page's **audio needs a local server** (YouTube embeds refuse to play from `file://`):

```bash
cd halcyon-drift-capscroll-poc
python3 -m http.server 8000
# open http://localhost:8000/
```

Sound starts on your first click/tap/key press (browsers block sound before that), and the **Sound** button in the nav toggles it.

## Tweak it

- **Curtain colours / type / spacing:** `curtain/styles/tokens.css` (the only place colours live).
- **Curtain motion:** knobs at the top of `curtain/scripts/curtain.js`; the `cover` / `lean` / `fall` keyframes in `frame()` choreograph the four stages.
- **Audio track:** `VIDEO_ID` at the top of `curtain/scripts/audio.js`.
- **Bubbles:** CSS variables at the top of `<style>` and knobs at the top of `<script>` in `bubbles/index.html`.

Audio: “Deep Progressive Techno #11” by Dub Element, embedded via YouTube.
Fan-made style exercise. Not affiliated with any studio. All marks invented.
