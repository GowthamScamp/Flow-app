/* ==========================================================================
   QA driver: headless Chrome over the DevTools protocol, no npm packages.

   Usage:
     node tools/qa/qa.mjs [baseUrl] [--only=widths,shots,keys,nojs,variants]
   Default baseUrl: http://localhost:8080/

   Writes screenshots and qa-report.json to tools/qa/out/ (gitignored).
   Checks: console errors/warnings, horizontal overflow at every width,
   full-page + per-viewport screenshots, a Tab walk, no-JS, reduced motion
   and dark mode.
   ========================================================================== */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith("--")) ?? "http://localhost:8080/";
const ONLY = (args.find((a) => a.startsWith("--only="))?.slice(7) ?? (args.some((a) => a.startsWith("--sections=")) ? "" : "widths,shots,keys,nojs,variants")).split(",");
const WIDTHS = [360, 390, 768, 1024, 1280, 1440, 1920];

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error("Chrome not found; set CHROME_PATH");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- Minimal CDP client ------------------------------------------------- */
async function launch() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = join(tmpdir(), `flow-qa-${port}`);
  const proc = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio",
    "--autoplay-policy=no-user-gesture-required", "about:blank",
  ], { stdio: "ignore" });
  let info;
  for (let i = 0; i < 50 && !info; i++) {
    await sleep(200);
    info = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => null);
  }
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result);
    } else if (msg.method) listeners.forEach((fn) => fn(msg));
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const close = () => {
    ws.close();
    proc.kill();
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1500);
  };
  return { send, on: (fn) => listeners.add(fn), off: (fn) => listeners.delete(fn), close };
}

async function evaluate(cdp, expression) {
  const res = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text + " " + (res.exceptionDetails.exception?.description ?? ""));
  return res.result.value;
}

async function navigate(cdp, url) {
  const loaded = new Promise((resolve) => {
    const fn = (m) => m.method === "Page.loadEventFired" && (cdp.off(fn), resolve());
    cdp.on(fn);
  });
  await cdp.send("Page.navigate", { url });
  await Promise.race([loaded, sleep(15000)]);
  await sleep(600);
}

async function setViewport(cdp, width, height = 900) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
}

async function scrollThrough(cdp, stepPause = 140) {
  await evaluate(cdp, `(async () => {
    const step = innerHeight * 0.6;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y); await new Promise(r => setTimeout(r, ${stepPause}));
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await new Promise(r => setTimeout(r, 400));
  })()`);
}

async function shot(cdp, file, fullPage = false) {
  let params = { format: "png" };
  if (fullPage) {
    // A fixed ground layer can't cover a full-page capture, so paint each
    // section's ground directly (the same as the no-JS look) for this shot.
    await evaluate(cdp, `(() => { const s = document.createElement('style'); s.id='qa-ground';
      s.textContent = '.booted .on-ivory{background-color:var(--ground)!important}.booted .on-midnight{background-color:var(--midnight)!important}.ground{display:none}.nav{position:absolute!important}';
      document.head.append(s); scrollTo(0,0); })()`);
    await sleep(500);
    const m = await cdp.send("Page.getLayoutMetrics");
    const { width, height } = m.cssContentSize ?? m.contentSize;
    params = { ...params, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.min(height, 16000), scale: 1 } };
  }
  const { data } = await cdp.send("Page.captureScreenshot", params);
  writeFileSync(join(OUT, file), Buffer.from(data, "base64"));
  if (fullPage) await evaluate(cdp, `document.getElementById('qa-ground')?.remove()`);
}

function collectConsole(cdp) {
  const messages = [];
  const fn = (m) => {
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning", "warn", "assert"].includes(m.params.type)) {
      messages.push({ type: m.params.type, text: m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300) });
    } else if (m.method === "Runtime.exceptionThrown") {
      messages.push({ type: "exception", text: (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 400) });
    } else if (m.method === "Log.entryAdded" && ["error", "warning"].includes(m.params.entry.level)) {
      messages.push({ type: `log-${m.params.entry.level}`, text: `${m.params.entry.text} ${m.params.entry.url ?? ""}`.slice(0, 300) });
    }
  };
  cdp.on(fn);
  return { messages, stop: () => cdp.off(fn) };
}

const OVERFLOW_JS = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push('document scrollWidth ' + document.documentElement.scrollWidth + ' > ' + vw);
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      // ignore content clipped by an overflow:hidden/clip ancestor
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (/(hidden|clip)/.test(o.overflowX) || /(hidden|clip)/.test(o.overflow)) { clipped = true; break; }
      }
      if (!clipped) out.push((el.className && el.className.baseVal === undefined ? el.tagName.toLowerCase() + '.' + String(el.className).split(' ').join('.') : el.tagName.toLowerCase()) + ' right=' + Math.round(r.right));
    }
    if (out.length > 12) break;
  }
  return out;
})()`;

/* ---- Runs ------------------------------------------------------------------ */
const report = { base: BASE, when: new Date().toISOString(), widths: {}, variants: {} };

async function withPage(fn) {
  const cdp = await launch();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  try { return await fn(cdp); } finally { cdp.close(); }
}

if (ONLY.includes("widths")) {
  await withPage(async (cdp) => {
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    for (const w of WIDTHS) {
      await setViewport(cdp, w);
      const con = collectConsole(cdp);
      await navigate(cdp, BASE);
      await scrollThrough(cdp, 90);
      const overflow = await evaluate(cdp, OVERFLOW_JS);
      con.stop();
      report.widths[w] = { overflow, console: con.messages };
      console.log(`width ${w}: overflow ${overflow.length ? overflow.join(" | ") : "none"}; console ${con.messages.length}`);
    }
  });
}

if (ONLY.includes("shots")) {
  await withPage(async (cdp) => {
    // Default shots are the light design; the dark variant has its own pass.
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    for (const w of [1440, 390]) {
      await setViewport(cdp, w, w > 800 ? 900 : 844);
      await navigate(cdp, BASE);
      await sleep(1800);
      await shot(cdp, `view-${w}-00-top.png`);
      // Per-viewport shots, scrolling slowly so reveals and demos can run.
      const total = await evaluate(cdp, "document.documentElement.scrollHeight");
      const vh = w > 800 ? 900 : 844;
      let i = 1;
      for (let y = vh * 0.8; y < total; y += vh * 0.8, i++) {
        await evaluate(cdp, `scrollTo(0, ${y})`);
        await sleep(1300);
        await shot(cdp, `view-${w}-${String(i).padStart(2, "0")}.png`);
      }
      await shot(cdp, `full-${w}.png`, true);
      console.log(`shots ${w}: ${i} viewports + full page`);
    }
  });
}

if (ONLY.includes("variants")) {
  const variants = {
    "reduced-motion": [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }],
    dark: [{ name: "prefers-color-scheme", value: "dark" }],
  };
  for (const [name, features] of Object.entries(variants)) {
    await withPage(async (cdp) => {
      await cdp.send("Emulation.setEmulatedMedia", { features });
      for (const w of [1440, 390]) {
        await setViewport(cdp, w, w > 800 ? 900 : 844);
        const con = collectConsole(cdp);
        await navigate(cdp, BASE);
        await scrollThrough(cdp, 120);
        await shot(cdp, `${name}-${w}-full.png`, true);
        const vh = w > 800 ? 900 : 844;
        // a few representative viewports
        for (const id of ["modes", "chat", "code", "research", "local"]) {
          await evaluate(cdp, `document.getElementById('${id}').scrollIntoView({block:'start'}); scrollBy(0, ${id === "modes" ? vh * 0.5 : 60})`);
          await sleep(900);
          await shot(cdp, `${name}-${w}-${id}.png`);
        }
        con.stop();
        report.variants[`${name}-${w}`] = { console: con.messages };
      }
    });
    // Manual toggle: force the opposite theme via the footer control.
    if (name === "dark") {
      await withPage(async (cdp) => {
        await setViewport(cdp, 1440);
        await navigate(cdp, BASE);
        await evaluate(cdp, `(() => { const i = document.querySelector('[data-theme-toggle] input[value=dark]'); i.click(); })()`);
        await sleep(800);
        const srcs = await evaluate(cdp, `[...document.querySelectorAll('picture img')].slice(0,3).map(i => i.currentSrc.split('/').pop())`);
        await evaluate(cdp, `document.getElementById('chat').scrollIntoView()`);
        await sleep(1200);
        await shot(cdp, `toggle-dark-1440-chat.png`);
        report.variants["toggle-dark"] = { firstImages: srcs };
        console.log("toggle dark ->", srcs.join(", "));
      });
    }
  }
}

if (ONLY.includes("nojs")) {
  await withPage(async (cdp) => {
    await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });
    for (const w of [1440, 390]) {
      await setViewport(cdp, w, w > 800 ? 900 : 844);
      await navigate(cdp, BASE);
      await scrollThrough(cdp, 60);
      await shot(cdp, `nojs-${w}-full.png`, true);
      const links = await cdp.send("Runtime.evaluate", { expression: "1" }).catch(() => null);
      void links;
    }
    console.log("no-JS shots done");
  });
}

if (ONLY.includes("keys")) {
  await withPage(async (cdp) => {
    await setViewport(cdp, 1440);
    await navigate(cdp, BASE);
    const stops = [];
    for (let i = 0; i < 90; i++) {
      await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await sleep(70);
      const info = await evaluate(cdp, `(() => {
        const el = document.activeElement; if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g,' ').slice(0, 48);
        const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
        return { tag: el.tagName.toLowerCase(), label, ring, section: el.closest('section,header,footer,dialog')?.id || el.closest('section,header,footer,dialog')?.tagName.toLowerCase() || '' };
      })()`);
      if (info) stops.push(info);
      if (stops.length > 3 && info && stops[0].label === info.label && stops[0].tag === info.tag) break;
    }
    report.tabStops = stops;
    const noRing = stops.filter((s) => !s.ring);
    console.log(`tab stops: ${stops.length}; without visible outline: ${noRing.length}`);
    noRing.forEach((s) => console.log("   no ring:", s.tag, s.label, s.section));
  });
}

// --sections=id,id[@width] : one screenshot per section, scrolled to its top.
const SECTIONS = args.find((a) => a.startsWith("--sections="))?.slice(11);
if (SECTIONS) {
  await withPage(async (cdp) => {
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    for (const w of [1440, 390]) {
      await setViewport(cdp, w, w > 800 ? 900 : 844);
      await navigate(cdp, BASE);
      for (const id of SECTIONS.split(",")) {
        await evaluate(cdp, `document.getElementById('${id}').scrollIntoView({block:'start', behavior:'instant'})`);
        await sleep(2500);
        const offset = await evaluate(cdp, `(() => { const r = document.getElementById('${id}').getBoundingClientRect(); return Math.round(r.top); })()`);
        await evaluate(cdp, `scrollBy({top: ${w > 800 ? 420 : 380}, behavior:'instant'})`);
        await sleep(3500);
        await shot(cdp, `sec-${id}-${w}.png`);
        void offset;
      }
    }
  });
  console.log("section shots done");
}

writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
const problems = Object.entries(report.widths).flatMap(([w, r]) => [
  ...r.overflow.map((o) => `[${w}] overflow: ${o}`),
  ...r.console.map((c) => `[${w}] ${c.type}: ${c.text}`),
]);
console.log(problems.length ? "\nIssues:\n" + [...new Set(problems)].join("\n") : "\nNo overflow or console issues at any width.");
