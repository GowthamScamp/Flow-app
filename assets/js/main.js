/* ==========================================================================
   Flow site — boot.
   Everything here enhances a page that already works without JavaScript:
   config rendering, the platform note, nav, soft scroll reveals, and
   lazy-loading the demos.
   ========================================================================== */

import { SITE } from "./config.js";
import { listTodos, primaryUrl, renderFiles, renderReleases, renderFooterLinks } from "./downloads.js";

const root = document.documentElement;
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

boot();

function boot() {
  applyConfig();
  warnTodos();
  noteOtherSystems();
  // Scroll reveals only hide content once this class is set, so a script that
  // fails earlier never leaves the page blank.
  root.classList.add("booted");
  initNav();
  initReveals();
  initDemos();
  initCopyButtons();
}

/* ---- Config ---------------------------------------------------------------- */

function applyConfig() {
  $$('[data-config-text="version"]').forEach((el) => (el.textContent = SITE.version));
  const list = $('[data-files="windows"]');
  if (list) list.innerHTML = renderFiles(SITE, "windows");
  // The hero button downloads directly once there is a real URL; until then
  // it leads to the Download section.
  $$('[data-os-button="windows"]').forEach((a) => (a.href = primaryUrl(SITE, "windows") ?? "#download"));
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

/* ---- Other systems -------------------------------------------------------------
   Flow is for Windows only. Visitors on anything else still see the download
   button, plus one quiet line so there are no surprises. userAgentData first,
   then the user agent string. */

function noteOtherSystems() {
  const source = (navigator.userAgentData?.platform || navigator.userAgent).toLowerCase();
  if (!/win/.test(source) || /darwin/.test(source)) $("[data-os-note]")?.removeAttribute("hidden");
}

/* ---- Nav --------------------------------------------------------------------- */

function initNav() {
  const nav = $("[data-nav]");
  if (!nav) return;

  // Translucent bar after 24 px of scroll: watch a 1 px sentinel at y = 24.
  const sentinel = $("[data-scroll-sentinel]");
  new IntersectionObserver(([entry]) => nav.classList.toggle("is-scrolled", !entry.isIntersecting)).observe(sentinel);

  // Scroll-spy: the section crossing the middle of the viewport is "current".
  // Sections without a nav link (hero, FAQ) clear the highlight.
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

/* ---- SHA-256 copy button (shown once a checksum is set in config.js) ------------------------ */

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
