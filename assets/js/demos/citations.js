/* ==========================================================================
   Citation demo (Know it.)
   Each citation chip connects to its source card with a thin indigo curve.
   On first view the three links demo themselves in order, then the
   "Checked automatically" line fades in. Hover or focus a chip to link it;
   tap (or click) toggles it, for touch screens.
   ========================================================================== */

import { mountDemo } from "./shared.js";

export default function initCitations(root) {
  const app = root.querySelector(".cite-app");
  const svg = root.querySelector("[data-cite-links]");
  const path = svg.querySelector("[data-cite-path]");
  const chips = [...root.querySelectorAll(".cite")];
  const cards = new Map([...root.querySelectorAll(".source")].map((s) => [s.dataset.source, s]));
  let current = null;
  let pinned = null;

  // Position of an element inside the window, from layout offsets rather than
  // getBoundingClientRect, so the curve lines up even while the window is
  // tilted during its entrance.
  function offsetIn(el) {
    let x = 0;
    let y = 0;
    let node = el;
    while (node && node !== app) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  function drawCurve(chip, card) {
    const c = offsetIn(chip);
    const s = offsetIn(card);
    svg.setAttribute("viewBox", `0 0 ${app.clientWidth} ${app.clientHeight}`);
    let d;
    if (s.x > c.x + c.w) {
      // Side by side: from the chip's right edge to the card's status dot.
      const x1 = c.x + c.w + 3;
      const y1 = c.y + c.h / 2;
      const x2 = s.x + 11;
      const y2 = s.y + 24;
      const bend = Math.max(40, (x2 - x1) * 0.5);
      d = `M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`;
    } else {
      // Stacked (narrow screens): leave the chip's right edge, run down the
      // right margin so the line never crosses the text, and meet the card
      // from the right.
      const x1 = c.x + c.w + 3;
      const y1 = c.y + c.h / 2;
      const x2 = s.x + s.w - 14;
      const y2 = s.y + 20;
      const lane = app.clientWidth - 6;
      d = `M${x1} ${y1} C${lane} ${y1} ${lane} ${y2} ${x2} ${y2}`;
    }
    path.setAttribute("d", d);
  }

  function link(chip) {
    const card = cards.get(chip.dataset.cite);
    if (!card) return;
    current = chip;
    chips.forEach((c) => c.classList.toggle("is-active", c === chip));
    cards.forEach((s) => s.classList.toggle("is-active", s === card));
    drawCurve(chip, card);
    // Restart the stroke-dashoffset draw for the new curve.
    svg.classList.remove("is-on");
    void path.getBBox();
    svg.classList.add("is-on");
  }

  function unlink() {
    current = null;
    chips.forEach((c) => c.classList.remove("is-active"));
    cards.forEach((s) => s.classList.remove("is-active"));
    svg.classList.remove("is-on");
  }

  const restore = () => (pinned ? link(pinned) : unlink());

  for (const chip of chips) {
    chip.addEventListener("pointerenter", (e) => e.pointerType !== "touch" && link(chip));
    chip.addEventListener("pointerleave", (e) => e.pointerType !== "touch" && restore());
    chip.addEventListener("focus", () => link(chip));
    chip.addEventListener("blur", restore);
    chip.addEventListener("click", () => {
      pinned = pinned === chip ? null : chip;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === pinned)));
      restore();
    });
  }

  new ResizeObserver(() => current && drawCurve(current, cards.get(current.dataset.cite))).observe(app);

  function reset() {
    pinned = null;
    chips.forEach((c) => c.setAttribute("aria-pressed", "false"));
    unlink();
    app.classList.add("is-pre");
  }

  function finish() {
    unlink();
    app.classList.remove("is-pre");
  }

  async function play(r) {
    await r.wait(700);
    for (const chip of chips) {
      link(chip);
      await r.wait(1500);
      unlink();
      await r.wait(350);
    }
    app.classList.remove("is-pre");
  }

  mountDemo(root, { reset, play, finish });
}
