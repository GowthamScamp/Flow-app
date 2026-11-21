/* ==========================================================================
   Film player.
   Enhances a plain <video controls> (which is what visitors without JS get)
   with a minimal custom control bar: play/pause, a scrubber with a time
   tooltip, mute, captions on/off and fullscreen. Controls hide while the film
   plays and come back on mouse move or focus.
   Keys while the player has focus: Space/K play-pause, ←/→ 5 s, M, C, F.
   Nothing ever autoplays; the video file loads only when played.
   ========================================================================== */

const ICONS = {
  play: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M6 3.8v12.4L16 10z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5.5 4h3v12h-3zM11.5 4h3v12h-3z" fill="currentColor"/></svg>',
  bigPlay: '<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><path d="M9 5.5v17L23 14z" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor"/><path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor"/><path d="m13 7.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  cc: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.6 8.4a2 2 0 1 0 0 3.2M14.1 8.4a2 2 0 1 0 0 3.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const IDLE_AFTER = 2400;

const fmt = (s) => {
  if (!Number.isFinite(s)) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

function button(className, label, html, pressed) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.setAttribute("aria-label", label);
  if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed));
  b.innerHTML = html;
  return b;
}

export function createPlayer(root) {
  const video = root.querySelector("video");
  video.removeAttribute("controls");
  // The video itself is not a tab stop; the controls are.
  video.tabIndex = -1;

  const big = button("player__big", "Play the film", ICONS.bigPlay);
  const bar = document.createElement("div");
  bar.className = "player__bar";
  const playBtn = button("pbtn", "Play", ICONS.play);
  const time = document.createElement("span");
  time.className = "player__time";
  time.textContent = "0:00 / 1:00";
  const scrub = document.createElement("div");
  scrub.className = "scrub";
  const range = document.createElement("input");
  Object.assign(range, { type: "range", min: "0", max: "1000", step: "1", value: "0" });
  range.setAttribute("aria-label", "Seek");
  const scrubTip = document.createElement("span");
  scrubTip.className = "scrub__tip";
  scrubTip.setAttribute("aria-hidden", "true");
  scrub.append(range, scrubTip);
  const muteBtn = button("pbtn", "Mute", ICONS.sound, false);
  const ccBtn = button("pbtn", "Captions", ICONS.cc, true);
  const fullBtn = button("pbtn", "Full screen", ICONS.full);
  bar.append(playBtn, time, scrub, muteBtn, ccBtn, fullBtn);
  root.append(big, bar);

  const duration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 60);
  const track = () => video.textTracks?.[0];
  let captionsOn = true;

  // ---- Playback -----------------------------------------------------------------
  const play = () => {
    root.classList.add("has-started");
    const promise = video.play();
    promise?.catch(() => { /* blocked or interrupted: controls stay visible */ });
  };
  const pause = () => video.pause();
  const toggle = () => (video.paused ? play() : pause());

  video.addEventListener("play", () => {
    playBtn.innerHTML = ICONS.pause;
    playBtn.setAttribute("aria-label", "Pause");
    root.classList.add("is-playing");
    wake();
  });
  video.addEventListener("pause", () => {
    playBtn.innerHTML = ICONS.play;
    playBtn.setAttribute("aria-label", "Play");
    root.classList.remove("is-playing", "is-idle");
  });
  video.addEventListener("ended", () => root.classList.remove("is-idle"));
  video.addEventListener("loadedmetadata", () => {
    const t = track();
    if (t) t.mode = captionsOn ? "showing" : "hidden";
    sync();
  });
  video.addEventListener("timeupdate", sync);

  function sync() {
    const pct = (video.currentTime / duration()) * 100;
    range.value = String(Math.round(pct * 10));
    range.style.setProperty("--pct", `${pct}%`);
    range.setAttribute("aria-valuetext", `${fmt(video.currentTime)} of ${fmt(duration())}`);
    time.textContent = `${fmt(video.currentTime)} / ${fmt(duration())}`;
  }

  big.addEventListener("click", () => {
    play();
    playBtn.focus({ preventScroll: true });
  });
  playBtn.addEventListener("click", toggle);
  video.addEventListener("click", toggle);

  range.addEventListener("input", () => {
    video.currentTime = (Number(range.value) / 1000) * duration();
    sync();
  });
  scrub.addEventListener("pointermove", (e) => {
    const r = range.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    scrubTip.textContent = fmt(ratio * duration());
    scrubTip.style.left = `${ratio * 100}%`;
  });

  const setMuted = (m) => {
    video.muted = m;
    muteBtn.innerHTML = m ? ICONS.muted : ICONS.sound;
    muteBtn.setAttribute("aria-pressed", String(m));
  };
  muteBtn.addEventListener("click", () => setMuted(!video.muted));

  const setCaptions = (on) => {
    captionsOn = on;
    const t = track();
    if (t) t.mode = on ? "showing" : "hidden";
    ccBtn.setAttribute("aria-pressed", String(on));
  };
  ccBtn.addEventListener("click", () => setCaptions(!captionsOn));

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
    else video.webkitEnterFullscreen?.(); // iOS Safari
  };
  fullBtn.addEventListener("click", toggleFullscreen);

  // ---- Auto-hiding controls ------------------------------------------------------------
  let idleTimer = 0;
  function wake() {
    root.classList.remove("is-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!video.paused && !root.contains(document.activeElement)) root.classList.add("is-idle");
    }, IDLE_AFTER);
  }
  root.addEventListener("pointermove", wake);
  root.addEventListener("focusin", wake);

  // ---- Keyboard ------------------------------------------------------------------------
  root.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const onButton = e.target instanceof HTMLButtonElement;
    switch (e.key) {
      case " ":
        if (onButton) return; // a focused button already handles Space
        e.preventDefault();
        toggle();
        break;
      case "k":
      case "K":
        e.preventDefault();
        toggle();
        break;
      case "ArrowLeft":
      case "ArrowRight":
        e.preventDefault();
        root.classList.add("has-started");
        video.currentTime = Math.min(duration(), Math.max(0, video.currentTime + (e.key === "ArrowRight" ? 5 : -5)));
        sync();
        break;
      case "m":
      case "M":
        setMuted(!video.muted);
        break;
      case "c":
      case "C":
        setCaptions(!captionsOn);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      default:
        return;
    }
    wake();
  });

  return { play, pause, root };
}
