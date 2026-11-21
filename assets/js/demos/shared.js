/* ==========================================================================
   Shared demo lifecycle.

   Every demo is written as an async "play" sequence that awaits runner.wait().
   The runner's clock only advances while the demo is on screen and the tab is
   visible, so a sequence pauses mid-step instead of racing ahead unseen.
   ========================================================================== */

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/** Thrown into a sequence when it is cancelled (for example by Replay). */
export class Cancelled extends Error {}

/** A cancellable, pausable timer source. */
export class Runner {
  #paused = false;
  #generation = 0;
  #timers = new Set();

  wait(ms) {
    const generation = this.#generation;
    return new Promise((resolve, reject) => {
      const timer = {
        remaining: Math.max(0, ms),
        startedAt: 0,
        id: 0,
        reject,
        arm: () => {
          timer.startedAt = performance.now();
          timer.id = setTimeout(() => {
            this.#timers.delete(timer);
            generation === this.#generation ? resolve() : reject(new Cancelled());
          }, timer.remaining);
        },
      };
      this.#timers.add(timer);
      if (!this.#paused) timer.arm();
    });
  }

  pause() {
    if (this.#paused) return;
    this.#paused = true;
    const now = performance.now();
    for (const t of this.#timers) {
      clearTimeout(t.id);
      t.remaining = Math.max(0, t.remaining - (now - t.startedAt));
    }
  }

  resume() {
    if (!this.#paused) return;
    this.#paused = false;
    for (const t of this.#timers) t.arm();
  }

  cancel() {
    this.#generation++;
    for (const t of this.#timers) {
      clearTimeout(t.id);
      t.reject(new Cancelled());
    }
    this.#timers.clear();
  }
}

/**
 * Wire a demo to the page.
 *  - reset():  put the demo in its starting state
 *  - play(r):  async sequence using r.wait(ms)
 *  - finish(): jump to the finished state (reduced motion)
 *  - onVisibility(running): optional hook for rAF loops and CSS loops
 * The demo starts once, when 40 % visible; Replay restarts it at any time.
 */
export function mountDemo(root, { reset, play, finish, onVisibility, onReplay }) {
  const runner = new Runner();
  const replay = root.querySelector("[data-replay]");
  let started = false;
  let onScreen = false;

  const showReplay = () => replay && (replay.hidden = false);

  async function run() {
    runner.cancel();
    reset();
    sync();
    try {
      await play(runner);
    } catch (err) {
      if (err instanceof Cancelled) return;
      throw err;
    }
    showReplay();
  }

  function showFinal() {
    runner.cancel();
    finish();
    showReplay();
  }

  function sync() {
    const running = onScreen && !document.hidden;
    if (running) runner.resume();
    else runner.pause();
    root.classList.toggle("is-paused", !running);
    onVisibility?.(running);
  }

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (!started && entry.intersectionRatio >= 0.4) {
        started = true;
        if (reducedMotion.matches) showFinal();
        else run();
      }
      sync();
    },
    { threshold: [0, 0.4] }
  ).observe(root);

  document.addEventListener("visibilitychange", sync);

  replay?.addEventListener("click", () => {
    run();
    onReplay?.();
  });

  // Reduced motion: the finished state, straight away. Otherwise wait at the
  // start so the visitor sees it begin.
  if (reducedMotion.matches) showFinal();
  else reset();

  return { runner, run, showFinal, showReplay };
}

/**
 * Wrap every word of an element's text in a span, keeping inline markup such
 * as <strong>. Returns the spans in reading order. Used for token streaming.
 */
export function wrapWords(el, className) {
  const spans = [];
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(part);
            continue;
          }
          const span = document.createElement("span");
          span.className = className;
          span.textContent = part;
          spans.push(span);
          frag.append(span);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(el);
  return spans;
}
