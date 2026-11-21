/* ==========================================================================
   Flow site — boot.
   Everything here enhances a page that already works without JavaScript:
   config rendering, OS detection, theme, nav, scroll reveals, the ground
   colour, the Modes story, and lazy-loading the demos.
   ========================================================================== */

import { SITE } from "./config.js";
import { listTodos, primaryUrl, renderFiles, renderReleases, renderFooterLinks } from "./downloads.js";
import { createPlayer } from "./demos/player.js";

const root = document.documentElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

boot();

function boot() {
  applyConfig();
  warnTodos();
  detectOS();
  initTheme();
  // Split headlines into word masks *before* .booted hides them, so nothing
  // flashes between the two steps.
  $$('[data-words="scroll"]').forEach(splitWords);
  root.classList.add("booted");
  initNav();
  initGround();
  initReveals();
  initTiltFallback();
  initModes();
  initDemos();
  initFilm();
  initCopyButtons();
}

/* ---- Config ---------------------------------------------------------------- */

function applyConfig() {
  $$('[data-config-text="version"]').forEach((el) => (el.textContent = SITE.version));
  for (const os of ["windows", "ubuntu"]) {
    const list = $(`[data-files="${os}"]`);
    if (list) list.innerHTML = renderFiles(SITE, os);
    // Hero buttons download directly once a real URL exists; until then they
    // lead to the Download section, where the "Coming soon" state is explained.
    $$(`[data-os-button="${os}"]`).forEach((a) => (a.href = primaryUrl(SITE, os) ?? "#download"));
  }
  const releases = $("[data-releases]");
  if (releases) releases.innerHTML = renderReleases(SITE);
  const footer = $("[data-footer-links]");
  if (footer) footer.innerHTML = renderFooterLinks(SITE);
  $$("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
}

function warnTodos() {
  const todos = listTodos(SITE);
  if (todos.length) {
    console.warn(
      `Flow site: ${todos.length} placeholder(s) left in assets/js/config.js\n  • ${todos.join("\n  • ")}`
    );
  }
}

/* ---- OS detection -------------------------------------------------------------
   userAgentData first, then the user agent string. Windows and Linux/Ubuntu
   get their own button; everything else (macOS, iOS, Android, ChromeOS,
   unknown) sees both buttons plus a quiet note. */

function detectOS() {
  const hint = (navigator.userAgentData?.platform || "").toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  const source = hint || ua;
  let os = "other";
  if (/android|iphone|ipad|ipod|mac|cros|chrome ?os|chromium ?os/.test(source) || /android/.test(ua)) os = "other";
  else if (/win/.test(source)) os = "windows";
  else if (/linux|ubuntu|x11/.test(source)) os = "ubuntu";

  root.dataset.os = os;
  if (os === "other") {
    $("[data-os-note]")?.removeAttribute("hidden");
  } else {
    $(`[data-platform="${os}"]`)?.classList.add("is-detected");
  }
}

/* ---- Theme ------------------------------------------------------------------
   Auto follows the OS. Light / Dark set data-theme on <html> (the inline
   script in <head> already did that before first paint). <picture> sources
   can't see data-theme, so their media queries are rewritten to match. */

const THEME_KEY = "flow-theme";

function initTheme() {
  const toggle = $("[data-theme-toggle]");
  let pref = "auto";
  try {
    pref = localStorage.getItem(THEME_KEY) || "auto";
  } catch { /* storage blocked */ }
  if (!["auto", "light", "dark"].includes(pref)) pref = "auto";
  applyTheme(pref);

  toggle?.addEventListener("change", (event) => {
    if (event.target.name !== "theme") return;
    applyTheme(event.target.value);
    try {
      if (event.target.value === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, event.target.value);
    } catch { /* storage blocked: the choice lasts for this visit */ }
  });

  function applyTheme(value) {
    if (value === "auto") root.removeAttribute("data-theme");
    else root.dataset.theme = value;
    const media = value === "dark" ? "all" : value === "light" ? "not all" : "(prefers-color-scheme: dark)";
    for (const source of $$("source[data-dark]")) {
      if (source.media !== media) source.media = media;
    }
    const input = toggle?.querySelector(`input[value="${value}"]`);
    if (input) input.checked = true;
  }
}

/* ---- Headline word masks ------------------------------------------------------ */

function splitWords(el) {
  const isHeading = /^H[1-6]$/.test(el.tagName);
  // Headings keep one clean accessible name; the word spans are hidden from AT.
  if (isHeading) el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
  let index = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(" ");
            continue;
          }
          const mask = document.createElement("span");
          mask.className = "w";
          const inner = document.createElement("span");
          inner.className = "w__i";
          inner.style.setProperty("--i", index++);
          inner.textContent = part;
          mask.append(inner);
          frag.append(mask);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(el);
  if (isHeading) {
    const wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "true");
    wrap.append(...el.childNodes);
    el.append(wrap);
  }
}

/* ---- Nav --------------------------------------------------------------------- */

function initNav() {
  const nav = $("[data-nav]");
  if (!nav) return;

  // Translucent bar after 24 px of scroll: watch a 1 px sentinel at y = 24.
  const sentinel = $("[data-scroll-sentinel]");
  new IntersectionObserver(([entry]) => nav.classList.toggle("is-scrolled", !entry.isIntersecting)).observe(sentinel);

  // Which ground is under the nav? Watch a thin band at the top of the viewport.
  const under = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) nav.dataset.over = entry.target.dataset.ground;
    },
    { rootMargin: "0px 0px -94% 0px" }
  );
  $$("[data-ground]:not([data-ground-layer])").forEach((s) => under.observe(s));

  // Mobile sheet: a modal <dialog> gives us the focus trap and Esc for free.
  const sheet = $("[data-menu]");
  const open = $("[data-menu-open]");
  if (sheet && open && typeof sheet.showModal === "function") {
    open.addEventListener("click", () => {
      sheet.showModal();
      open.setAttribute("aria-expanded", "true");
    });
    $("[data-menu-close]", sheet)?.addEventListener("click", () => sheet.close());
    sheet.addEventListener("close", () => open.setAttribute("aria-expanded", "false"));
    $$("a", sheet).forEach((a) => a.addEventListener("click", () => sheet.close()));
    // Leaving the mobile layout with the sheet open would strand it.
    matchMedia("(min-width: 820px)").addEventListener("change", (e) => e.matches && sheet.open && sheet.close());
  }
}

/* ---- Ground colour and scroll-spy ----------------------------------------------
   The section crossing the middle of the viewport decides both the ground
   colour and which nav link is current. */

function initGround() {
  const layer = $("[data-ground-layer]");
  const links = $$("[data-spy]");
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const section = entry.target;
        if (layer) layer.dataset.ground = section.dataset.ground;
        const spy = section.dataset.spySection || "";
        links.forEach((a) => (a.dataset.spy === spy ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
      }
    },
    { rootMargin: "-49.5% 0px -49.5% 0px" }
  );
  $$("[data-ground]:not([data-ground-layer])").forEach((s) => io.observe(s));
}

/* ---- Reveals ----------------------------------------------------------------------
   Headlines reveal once they are 25 % into view; body copy a little earlier.
   Reaching the very end of the page reveals anything still waiting. */

function initReveals() {
  const reveal = (el) => el.classList.add("is-in");
  const make = (margin) =>
    new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target);
          obs.unobserve(entry.target);
        }
      },
      { rootMargin: margin }
    );
  const words = make("0px 0px -25% 0px");
  const body = make("0px 0px -12% 0px");
  $$('[data-words="scroll"]').forEach((el) => words.observe(el));
  $$(".reveal").forEach((el) => body.observe(el));

  const end = document.createElement("div");
  end.setAttribute("aria-hidden", "true");
  document.body.append(end);
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    $$('[data-words="scroll"]:not(.is-in), .reveal:not(.is-in)').forEach(reveal);
    obs.disconnect();
  }).observe(end);
}

/* ---- Tilt and parallax fallback ------------------------------------------------------
   Browsers with scroll-driven animations do this in CSS (layout.css). Others
   get a small IntersectionObserver + rAF version setting the same values. */

function initTiltFallback() {
  if (reducedMotion.matches || CSS.supports("animation-timeline: view()")) return;

  const flatten = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.intersectionRatio < 0.25) continue;
        entry.target.classList.add("is-flat");
        obs.unobserve(entry.target);
      }
    },
    { threshold: [0, 0.25] }
  );
  $$("[data-tilt]").forEach((el) => flatten.observe(el));

  const visible = new Set();
  let queued = false;
  const update = () => {
    queued = false;
    const vh = innerHeight;
    // Read every rect first, then write, so the browser lays out once.
    const reads = [...visible].map((el) => [el, el.getBoundingClientRect()]);
    for (const [el, r] of reads) {
      const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty("--drift", clamp(progress, -1, 1).toFixed(3));
    }
  };
  const schedule = () => {
    if (!queued && visible.size) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  const watch = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    schedule();
  });
  $$("[data-parallax]").forEach((el) => watch.observe(el));
  addEventListener("scroll", schedule, { passive: true });
}

/* ---- Modes: sticky scroll story ---------------------------------------------------------
   On wide screens the section is 300vh tall with a sticky stage. Scroll
   progress through it picks the active mode (thirds) and fills its rail. */

function initModes() {
  const section = $("#modes");
  const track = $("[data-modes]");
  if (!section || !track) return;
  const modes = $$(".mode", section);
  const wide = matchMedia("(min-width: 900px)");
  let active = -1;
  let inView = false;
  let queued = false;

  const update = () => {
    queued = false;
    if (!wide.matches) {
      section.classList.remove("is-live");
      modes.forEach((m) => m.classList.remove("is-active"));
      active = -1;
      return;
    }
    const rect = track.getBoundingClientRect();
    const distance = Math.max(1, rect.height - innerHeight);
    const progress = clamp(-rect.top / distance, 0, 0.9999);
    const index = Math.floor(progress * modes.length);
    section.classList.add("is-live");
    if (index !== active) {
      modes.forEach((m, i) => m.classList.toggle("is-active", i === index));
      active = index;
    }
    modes[index].style.setProperty("--p", (progress * modes.length - index).toFixed(3));
  };
  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) schedule();
  }).observe(track);
  addEventListener("scroll", () => inView && schedule(), { passive: true });
  wide.addEventListener("change", schedule);
  schedule();
}

/* ---- Demos -------------------------------------------------------------------------------
   Each demo module loads only when its section comes within 200 px of the
   viewport. */

const DEMOS = {
  chat: () => import("./demos/chat.js"),
  review: () => import("./demos/review.js"),
  codemap: () => import("./demos/codemap.js"),
  citations: () => import("./demos/citations.js"),
};

function initDemos() {
  const near = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        obs.unobserve(entry.target);
        const load = DEMOS[entry.target.dataset.demo];
        load?.()
          .then((mod) => mod.default(entry.target))
          .catch((err) => console.error("Flow demo failed to start:", err));
      }
    },
    { rootMargin: "200px 0px" }
  );
  $$("[data-demo]").forEach((el) => near.observe(el));
}

/* ---- Film ----------------------------------------------------------------------------------- */

// The custom controls are built when the film section comes near; until then
// (and without JS) the native <video controls> works on its own.
function initFilm() {
  const el = $("#film [data-player]");
  if (!el) return;
  new IntersectionObserver(
    ([entry], obs) => {
      if (!entry.isIntersecting) return;
      createPlayer(el);
      obs.disconnect();
    },
    { rootMargin: "300px 0px" }
  ).observe(el);
}

/* ---- SHA-256 copy buttons ------------------------------------------------------------------- */

function initCopyButtons() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    const value = document.getElementById(button.dataset.copy)?.textContent ?? "";
    const label = button.querySelector("span");
    try {
      await navigator.clipboard.writeText(value);
      if (label) label.textContent = "Copied";
    } catch {
      if (label) label.textContent = "Select and copy";
    }
    setTimeout(() => label && (label.textContent = "Copy"), 1600);
  });
}
