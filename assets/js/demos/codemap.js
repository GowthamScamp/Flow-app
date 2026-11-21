/* ==========================================================================
   Code map (See how it fits together.)
   An SVG drawing of the sample project from Flow's screenshots. Files pop in
   folder by folder, edges draw, then the map drifts gently while a few "data"
   dots travel along edges. Hover, focus or tap a file to light up what it
   connects to; arrow keys move between connected files.
   ========================================================================== */

import { mountDemo, reducedMotion } from "./shared.js";

// The sample project (coordinates in a 0 0 1000 620 space).
const DATA = {"viewBox":"0 0 1000 620","nodes":[{"id":"pw","file":"password.ts","dir":"src/auth","x":644,"y":40},{"id":"lg","file":"login.ts","dir":"src/routes","x":397,"y":85},{"id":"mg","file":"migrations.ts","dir":"src/db","x":600,"y":127},{"id":"se","file":"session.ts","dir":"src/auth","x":171,"y":165},{"id":"cl","file":"client.ts","dir":"src/db","x":589,"y":164},{"id":"us","file":"users.ts","dir":"src/services","x":815,"y":177},{"id":"tk","file":"tokens.ts","dir":"src/auth","x":40,"y":228},{"id":"ht","file":"http.ts","dir":"src/lib","x":400,"y":271},{"id":"pf","file":"profile.ts","dir":"src/forms","x":272,"y":316},{"id":"up","file":"uploads.ts","dir":"src/routes","x":602,"y":319},{"id":"em","file":"email.ts","dir":"src/services","x":960,"y":328},{"id":"sf","file":"signup.ts","dir":"src/forms","x":112,"y":347},{"id":"st","file":"storage.ts","dir":"src/services","x":772,"y":363},{"id":"cf","file":"config.ts","dir":"src","x":622,"y":396},{"id":"lo","file":"logger.ts","dir":"src/lib","x":895,"y":406},{"id":"ro","file":"router.ts","dir":"src/app","x":454,"y":434},{"id":"sr","file":"signup.ts","dir":"src/routes","x":254,"y":473},{"id":"pr","file":"profile.ts","dir":"src/routes","x":110,"y":483},{"id":"va","file":"validate.ts","dir":"src/lib","x":166,"y":510},{"id":"ma","file":"main.ts","dir":"src/app","x":585,"y":512},{"id":"sv","file":"server.ts","dir":"src/app","x":682,"y":500},{"id":"da","file":"dates.ts","dir":"src/lib","x":468,"y":580}],"edges":[["lg","pw"],["lg","se"],["lg","mg"],["lg","ht"],["lg","ro"],["mg","cl"],["mg","us"],["se","cl"],["se","tk"],["cl","us"],["cl","cf"],["us","pw"],["us","em"],["us","ht"],["us","sr"],["tk","cf"],["ht","up"],["ht","sf"],["ht","pf"],["sf","se"],["sf","sr"],["sf","ro"],["pf","se"],["pf","ro"],["pf","pr"],["up","st"],["up","ro"],["st","cf"],["st","lo"],["em","lo"],["ro","sv"],["ro","ma"],["sv","cf"],["sv","lo"],["ma","sv"],["pr","va"],["sr","va"]]};

// Padding around the 1000 x 620 space so labels on the right edge fit.
const VIEW = { x: -30, y: -28, w: 1110, h: 676 };
const LABEL_PX = 13;           // labels stay 13 px on screen
const FOLDER_STAGGER = 150;    // ms between folders popping in
const PULSES = 4;              // travelling "data" dots
const NS = "http://www.w3.org/2000/svg";

const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

export default function initCodeMap(root) {
  const canvas = root.querySelector("[data-map-canvas]");
  const tip = root.querySelector("[data-map-tip]");

  // ---- Graph model ----------------------------------------------------------
  const nodes = new Map(DATA.nodes.map((n) => [n.id, { ...n, links: new Set(), edges: [] }]));
  const edges = DATA.edges.map(([a, b]) => ({ a: nodes.get(a), b: nodes.get(b) }));
  for (const e of edges) {
    e.a.links.add(e.b.id);
    e.b.links.add(e.a.id);
    e.a.edges.push(e);
    e.b.edges.push(e);
  }
  const radius = (n) => 6 + n.links.size * 1.15;

  // ---- SVG ---------------------------------------------------------------------
  const svg = svgEl("svg", {
    viewBox: `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`,
    class: "map",
    role: "group",
    "aria-label": `Code map of a sample project with ${nodes.size} files`,
    "aria-describedby": "map-help",
  });
  const world = svgEl("g", { class: "map-world" });
  const edgeLayer = svgEl("g", { "aria-hidden": "true" });
  const pulseLayer = svgEl("g", { "aria-hidden": "true" });
  const nodeLayer = svgEl("g");
  world.append(edgeLayer, pulseLayer, nodeLayer);
  svg.append(world);
  canvas.prepend(svg);

  for (const e of edges) {
    e.el = svgEl("path", { class: "map-edge", d: `M${e.a.x} ${e.a.y}L${e.b.x} ${e.b.y}`, pathLength: 1 });
    edgeLayer.append(e.el);
  }

  // The most connected file is the keyboard entry point; the others are
  // reached with the arrow keys (a roving tabindex keeps one Tab stop).
  const entry = [...nodes.values()].sort((p, q) => q.links.size - p.links.size)[0];

  for (const n of nodes.values()) {
    const names = [...n.links].map((id) => nodes.get(id).file).join(", ");
    n.el = svgEl("g", {
      class: "map-node",
      transform: `translate(${n.x} ${n.y})`,
      tabindex: n === entry ? "0" : "-1",
      role: "button",
      "aria-pressed": "false",
      "aria-label": `${n.dir}/${n.file}, ${n.links.size} ${n.links.size === 1 ? "link" : "links"}: ${names}`,
    });
    n.ring = svgEl("circle", { class: "map-ring", r: radius(n) + 5 });
    n.dot = svgEl("circle", { class: "map-dot", r: radius(n) });
    n.label = svgEl("text", { class: "map-label", x: radius(n) + 7, y: 1 });
    n.label.textContent = n.file;
    n.el.append(n.ring, n.dot, n.label);
    n.el.dataset.id = n.id;
    nodeLayer.append(n.el);
  }

  // Keep labels at 13 px on screen whatever the map's size, and grow the dots
  // a little on small screens so they stay tappable.
  let scale = 1;
  const resize = () => {
    scale = canvas.clientWidth / VIEW.w || 1;
    svg.style.setProperty("--label-size", `${(LABEL_PX / scale).toFixed(2)}px`);
    svg.style.setProperty("--edge-w", (1.5 / scale).toFixed(2));
    svg.style.setProperty("--ring-w", (2 / scale).toFixed(2));
    const grow = Math.min(2, Math.max(1, 0.75 / scale));
    for (const n of nodes.values()) {
      const r = radius(n) * grow;
      n.dot.setAttribute("r", r.toFixed(1));
      n.ring.setAttribute("r", (r + 5 / Math.min(1, scale)).toFixed(1));
      n.label.setAttribute("x", (r + 6 / Math.min(1, scale)).toFixed(1));
    }
    if (focused) placeTip(focused);
  };
  new ResizeObserver(resize).observe(canvas);

  // ---- Focus / highlight -------------------------------------------------------------
  let focused = null;
  let pinned = null;

  function placeTip(n) {
    // Layout coordinates (not getBoundingClientRect), so the tooltip stays
    // aligned while the window is tilted during its entrance.
    const left = (n.x - VIEW.x) * scale;
    const top = (n.y - VIEW.y) * scale - radius(n) * scale;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function highlight(n) {
    focused = n;
    svg.classList.toggle("is-focusing", Boolean(n));
    for (const m of nodes.values()) {
      m.el.classList.toggle("is-focus", m === n);
      m.el.classList.toggle("is-hot", Boolean(n) && n.links.has(m.id));
    }
    for (const e of edges) e.el.classList.toggle("is-hot", Boolean(n) && (e.a === n || e.b === n));
    if (!n) {
      tip.hidden = true;
      return;
    }
    tip.innerHTML = "";
    const path = document.createElement("b");
    path.textContent = `${n.dir}/${n.file}`;
    const count = document.createElement("span");
    count.textContent = `${n.links.size} ${n.links.size === 1 ? "link" : "links"}`;
    tip.append(path, count);
    placeTip(n);
    tip.hidden = false;
  }

  const nodeFrom = (target) => nodes.get(target.closest?.(".map-node")?.dataset.id);

  svg.addEventListener("pointerover", (e) => {
    const n = nodeFrom(e.target);
    if (n && e.pointerType !== "touch") highlight(n);
  });
  svg.addEventListener("pointerout", (e) => {
    const n = nodeFrom(e.target);
    if (n && !n.el.contains(e.relatedTarget) && e.pointerType !== "touch") highlight(pinned);
  });
  svg.addEventListener("focusin", (e) => {
    const n = nodeFrom(e.target);
    if (n) highlight(n);
  });
  svg.addEventListener("focusout", (e) => {
    if (!svg.contains(e.relatedTarget)) highlight(pinned);
  });

  // Click / tap / Enter pins a file so the highlight stays (touch has no hover).
  const togglePin = (n) => {
    pinned = pinned === n ? null : n;
    for (const m of nodes.values()) m.el.setAttribute("aria-pressed", String(m === pinned));
    highlight(pinned ?? (document.activeElement === n.el ? n : null));
  };
  svg.addEventListener("click", (e) => {
    const n = nodeFrom(e.target);
    if (n) togglePin(n);
    else if (pinned) togglePin(pinned);
  });

  const DIRECTIONS = { ArrowRight: 0, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI, ArrowUp: -Math.PI / 2 };
  svg.addEventListener("keydown", (e) => {
    const n = nodeFrom(e.target);
    if (!n) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePin(n);
      return;
    }
    if (!(e.key in DIRECTIONS)) {
      if (e.key === "Escape" && pinned) togglePin(pinned);
      return;
    }
    e.preventDefault();
    // Move to the connected file that lies closest to the arrow's direction.
    const want = DIRECTIONS[e.key];
    let best = null;
    let bestScore = Infinity;
    for (const id of n.links) {
      const m = nodes.get(id);
      const angle = Math.atan2(m.y - n.y, m.x - n.x);
      const diff = Math.abs(Math.atan2(Math.sin(angle - want), Math.cos(angle - want)));
      const score = diff + Math.hypot(m.x - n.x, m.y - n.y) / 4000;
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
    if (best) {
      n.el.setAttribute("tabindex", "-1");
      best.el.setAttribute("tabindex", "0");
      best.el.focus();
    }
  });

  // ---- Entrance -------------------------------------------------------------------------
  const folders = [...new Set(DATA.nodes.map((n) => n.dir))].sort();

  function reset() {
    stopPulses();
    svg.classList.remove("is-idle");
    svg.classList.add("is-drawing");
    for (const n of nodes.values()) n.el.classList.remove("is-popped");
    for (const e of edges) e.el.classList.remove("is-drawn");
  }

  function finish() {
    svg.classList.remove("is-drawing");
    for (const n of nodes.values()) n.el.classList.add("is-popped");
    for (const e of edges) e.el.classList.add("is-drawn");
    if (!reducedMotion.matches) startIdle();
  }

  async function play(r) {
    await r.wait(200);
    for (const dir of folders) {
      for (const n of nodes.values()) if (n.dir === dir) n.el.classList.add("is-popped");
      await r.wait(FOLDER_STAGGER);
    }
    await r.wait(250);
    for (const e of edges) {
      e.el.classList.add("is-drawn");
      await r.wait(28);
    }
    await r.wait(900);
    svg.classList.remove("is-drawing");
    startIdle();
  }

  // ---- Idle motion: slow drift (CSS) and travelling data dots (rAF) --------------------
  let pulses = [];
  let frame = 0;
  let running = false;

  function startIdle() {
    svg.classList.add("is-idle");
    if (pulses.length) return;
    pulses = Array.from({ length: PULSES }, (_, i) => {
      const el = svgEl("circle", { class: "map-pulse", r: 2.6 });
      pulseLayer.append(el);
      return { el, edge: null, start: 0, duration: 0, delay: i * 900 };
    });
    tick();
  }

  function stopPulses() {
    cancelAnimationFrame(frame);
    frame = 0;
    pulses.forEach((p) => p.el.remove());
    pulses = [];
  }

  function tick(now = performance.now()) {
    if (!running || !pulses.length) {
      frame = 0;
      return;
    }
    for (const p of pulses) {
      if (!p.edge || now - p.start > p.duration + p.delay) {
        p.edge = edges[Math.floor(Math.random() * edges.length)];
        p.forward = Math.random() > 0.5;
        p.start = now;
        p.duration = 1800 + Math.random() * 1400;
        p.delay = 300 + Math.random() * 1600;
      }
      const t = Math.min(1, Math.max(0, (now - p.start - p.delay) / p.duration));
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const [from, to] = p.forward ? [p.edge.a, p.edge.b] : [p.edge.b, p.edge.a];
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;
      p.el.style.transform = `translate(${x}px, ${y}px)`;
      p.el.style.opacity = t <= 0 || t >= 1 ? "0" : String(Math.sin(t * Math.PI) * 0.8);
    }
    frame = requestAnimationFrame(tick);
  }

  mountDemo(root, {
    reset,
    play,
    finish,
    // Drift and dots stop off-screen and in hidden tabs.
    onVisibility(isRunning) {
      running = isRunning && !reducedMotion.matches;
      svg.classList.toggle("is-paused", !running);
      if (running && pulses.length && !frame) tick();
    },
  });
}
