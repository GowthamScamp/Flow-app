/* ==========================================================================
   Flow site — boot.
   Everything here enhances a page that already works without JavaScript:
   config rendering, OS detection, theme, nav, soft scroll reveals, and
   lazy-loading the demos.
   ========================================================================== */

import { SITE } from "./config.js";
import { listTodos, primaryUrl, renderFiles, renderReleases, renderFooterLinks } from "./downloads.js";
import { createPlayer } from "./demos/player.js";

const root = document.documentElement;
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

boot();

function boot() {
  applyConfig();
  warnTodos();
  detectOS();
  initTheme();
  // Scroll reveals only hide content once this class is set, so a script that
  // fails earlier never leaves the page blank.
  root.classList.add("booted");
  initNav();
  initReveals();
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

/* ---- Nav --------------------------------------------------------------------- */

function initNav() {
  const nav = $("[data-nav]");
  if (!nav) return;

  // Translucent bar after 24 px of scroll: watch a 1 px sentinel at y = 24.
  const sentinel = $("[data-scroll-sentinel]");
  new IntersectionObserver(([entry]) => nav.classList.toggle("is-scrolled", !entry.isIntersecting)).observe(sentinel);

  // Scroll-spy: the section crossing the middle of the viewport is "current".
  // Sections without a nav link (hero, film, FAQ) clear the highlight.
  const links = $$("[data-spy]");
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const current = entry.target.dataset.spySection || "";
        links.forEach((a) => (a.dataset.spy === current ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
      }
    },
    { rootMargin: "-49.5% 0px -49.5% 0px" }
  );
  $$("main > section").forEach((s) => spy.observe(s));

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

/* ---- Reveals ----------------------------------------------------------------------
   Headlines and copy rise in once, when they are 12 % into view. Reaching
   the very end of the page reveals anything still waiting. */

function initReveals() {
  const reveal = (el) => el.classList.add("is-in");
  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        obs.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  const end = document.createElement("div");
  end.setAttribute("aria-hidden", "true");
  document.body.append(end);
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    $$(".reveal:not(.is-in)").forEach(reveal);
    obs.disconnect();
  }).observe(end);
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

// Building the controls is cheap (the video itself loads only on play), and
// doing it up front means the bare <video> is never a Tab stop. Without JS the
// native <video controls> works on its own.
function initFilm() {
  const el = $("#film [data-player]");
  if (el) createPlayer(el);
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
