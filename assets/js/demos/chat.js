/* ==========================================================================
   Chat demo (Think it.)
   Types the question, sends it, shows the model reasoning in a Thought card,
   collapses it, then streams the answer word by word. The markup in
   index.html is the finished state; this script rewinds and replays it.
   ========================================================================== */

import { mountDemo, reducedMotion, wrapWords } from "./shared.js";

const PROMPT = "Explain how a hash map handles collisions, simply, with a tiny example.";
const WORDS_PER_SECOND = 50;
const LINE_DELAY = 90; // code lines and table rows, one by one

export default function initChat(root) {
  const app = root.querySelector(".chat-app");
  const log = root.querySelector("[data-log]");
  const composer = root.querySelector("[data-composer]");
  const typed = root.querySelector("[data-typed]");
  const send = root.querySelector("[data-send]");
  const bubble = root.querySelector('[data-part="bubble"]');
  const thought = root.querySelector('[data-part="thought"]');
  const label = root.querySelector("[data-thought-label]");
  const reasoning = [...root.querySelectorAll("[data-thought-line]")];
  const answer = root.querySelector('[data-part="answer"]');

  // The answer, in reading order: text blocks stream word by word; the code
  // block and the table appear line by line.
  const steps = [...answer.querySelectorAll("[data-stream], [data-stream-block]")].map((el) =>
    el.hasAttribute("data-stream")
      ? { kind: "words", el, items: wrapWords(el, "w-stream") }
      : { kind: "lines", el, items: [...el.querySelectorAll("[data-line]")] }
  );
  const allWords = steps.filter((s) => s.kind === "words").flatMap((s) => s.items);
  const allLines = steps.filter((s) => s.kind === "lines").flatMap((s) => s.items);
  const blocks = steps.filter((s) => s.kind === "lines").map((s) => s.el);

  // Keep the newest content in view, like the app does while streaming.
  let followQueued = false;
  const follow = () => {
    if (followQueued) return;
    followQueued = true;
    requestAnimationFrame(() => {
      followQueued = false;
      const top = log.scrollHeight - log.clientHeight;
      if (top > log.scrollTop + 2) log.scrollTo({ top, behavior: reducedMotion.matches ? "auto" : "smooth" });
    });
  };

  const show = (part) => part.classList.add("is-shown");

  function setComposer(text, focused) {
    typed.textContent = text;
    composer.classList.toggle("has-text", text.length > 0);
    composer.classList.toggle("is-focused", focused);
    send.classList.toggle("is-ready", text.length > 0);
  }

  function reset() {
    app.classList.add("is-pre");
    [bubble, thought, answer].forEach((p) => p.classList.remove("is-shown"));
    thought.classList.remove("is-collapsed", "is-thinking", "is-folding");
    thought.style.clipPath = "";
    label.textContent = "Thinking";
    reasoning.forEach((l) => l.classList.add("is-hidden"));
    allWords.forEach((w) => w.classList.remove("is-in"));
    allLines.forEach((l) => l.classList.add("is-hidden"));
    blocks.forEach((b) => b.classList.add("is-hidden"));
    setComposer("", false);
    log.scrollTop = 0;
  }

  function finish() {
    app.classList.remove("is-pre");
    [bubble, thought, answer].forEach((p) => p.classList.remove("is-shown"));
    thought.classList.remove("is-thinking", "is-folding");
    thought.classList.add("is-collapsed");
    label.textContent = "Thought";
    reasoning.forEach((l) => l.classList.remove("is-hidden"));
    allWords.forEach((w) => w.classList.add("is-in"));
    allLines.forEach((l) => l.classList.remove("is-hidden"));
    blocks.forEach((b) => b.classList.remove("is-hidden"));
    setComposer("", false);
    log.scrollTop = log.scrollHeight;
  }

  async function play(r) {
    await r.wait(500);
    setComposer("", true);
    await r.wait(400);

    // A believable typing rhythm: 40–85 ms per key, a beat after commas.
    let text = "";
    for (const ch of PROMPT) {
      text += ch;
      setComposer(text, true);
      let delay = 40 + Math.random() * 45;
      if (ch === " ") delay += 25;
      if (ch === "," || ch === ".") delay += 180;
      await r.wait(delay);
    }
    await r.wait(450);

    send.classList.add("is-pressed");
    await r.wait(140);
    send.classList.remove("is-pressed");
    setComposer("", false);
    show(bubble);
    follow();
    await r.wait(650);

    // Thinking: the card opens with a shimmer, two lines of reasoning fade in.
    thought.classList.add("is-thinking");
    show(thought);
    follow();
    await r.wait(600);
    for (const line of reasoning) {
      line.classList.remove("is-hidden");
      follow();
      await r.wait(1000);
    }
    await r.wait(600);
    await collapseThought(r);

    // The answer streams in.
    show(answer);
    for (const step of steps) {
      if (step.kind === "words") {
        for (let i = 0; i < step.items.length; i++) {
          step.items[i].classList.add("is-in");
          if (i % 8 === 0) follow();
          await r.wait(1000 / WORDS_PER_SECOND);
        }
      } else {
        step.el.classList.remove("is-hidden");
        for (const line of step.items) {
          line.classList.remove("is-hidden");
          follow();
          await r.wait(LINE_DELAY);
        }
      }
      follow();
      await r.wait(160);
    }
  }

  // The one exception to "transform and opacity only": the card collapses
  // with clip-path: inset(), while the chevron turns from ⌄ to ›.
  async function collapseThought(r) {
    const head = thought.querySelector(".thought__head");
    const hidden = thought.offsetHeight - head.offsetHeight;
    thought.classList.remove("is-thinking");
    label.textContent = "Thought";
    thought.classList.add("is-folding");
    const anim = thought.animate(
      [{ clipPath: "inset(0 0 0 0 round 10px)" }, { clipPath: `inset(0 0 ${hidden}px 0 round 10px)` }],
      { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" }
    );
    await r.wait(680);
    thought.classList.add("is-collapsed");
    thought.classList.remove("is-folding");
    anim.cancel();
    await r.wait(250);
  }

  mountDemo(root, { reset, play, finish });
}
