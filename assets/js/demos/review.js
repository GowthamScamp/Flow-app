/* ==========================================================================
   Review demo (Build it.) — genuinely interactive.
   The "Review needed" dialog rises over a dimmed window. Approve applies the
   change in the Changes panel; Reject discards it. Nothing real is written:
   this is a demo, and the visually hidden text beside it says so.
   ========================================================================== */

import { mountDemo, reducedMotion } from "./shared.js";

const NUDGE_AFTER = 2000; // ms before Approve starts to pulse, if untouched

export default function initReview(root) {
  const app = root.querySelector(".review-app");
  const dialog = root.querySelector("[data-dialog]");
  const approveButton = root.querySelector("[data-approve]");
  const note = root.querySelector("[data-note]");
  const changes = root.querySelector("[data-changes]");
  const empty = root.querySelector("[data-empty]");
  const file = root.querySelector("[data-file]");
  const counts = [...root.querySelectorAll("[data-count]")];
  const added = [...changes.querySelectorAll("[data-add]")];
  const replay = root.querySelector("[data-replay]");

  // The visible window is decorative (aria-hidden), so outcomes are announced
  // through this live region instead.
  const live = document.createElement("p");
  live.className = "vh";
  live.setAttribute("role", "status");
  root.append(live);

  let nudgeTimer = 0;
  let fillTimers = [];
  let decided = false;

  function setDialog(open) {
    app.classList.toggle("is-reviewing", open);
    app.classList.toggle("is-pending", open);
    // While hidden, its buttons must not be reachable.
    dialog.inert = !open;
    dialog.setAttribute("aria-hidden", String(!open));
  }

  function clearTimers() {
    clearTimeout(nudgeTimer);
    fillTimers.forEach(clearTimeout);
    fillTimers = [];
    approveButton.classList.remove("is-nudging");
  }

  function reset() {
    clearTimers();
    decided = false;
    app.classList.remove("is-approved", "is-rejected");
    setDialog(false);
    note.hidden = true;
    empty.hidden = false;
    file.hidden = true;
    counts.forEach((c) => (c.textContent = "0"));
    changes.classList.remove("is-filling");
    added.forEach((line) => line.classList.remove("is-in"));
    live.textContent = "";
  }

  // Reduced motion: the dialog is already waiting for a decision.
  function finish() {
    reset();
    setDialog(true);
  }

  async function play(r) {
    await r.wait(600);
    setDialog(true);
    if (!reducedMotion.matches) {
      nudgeTimer = setTimeout(() => !decided && approveButton.classList.add("is-nudging"), NUDGE_AFTER);
    }
  }

  function decide(approved) {
    if (decided) return;
    decided = true;
    const focusWasInside = dialog.contains(document.activeElement);
    clearTimers();
    setDialog(false);

    if (approved) {
      app.classList.add("is-approved");
      empty.hidden = true;
      file.hidden = false;
      counts.forEach((c) => (c.textContent = "1"));
      // The added lines slide into the Changes panel one by one.
      if (reducedMotion.matches) {
        added.forEach((line) => line.classList.add("is-in"));
      } else {
        changes.classList.add("is-filling");
        added.forEach((line, i) => fillTimers.push(setTimeout(() => line.classList.add("is-in"), 450 + i * 85)));
      }
      live.textContent = "Approved. In this demo, the edit to src/forms/signup.ts now shows in the Changes panel.";
    } else {
      app.classList.add("is-rejected");
      note.hidden = false;
      live.textContent = "Rejected. Nothing was written.";
    }

    // Send focus somewhere sensible: the Replay button that now appears.
    replay.hidden = false;
    if (focusWasInside) replay.focus();
  }

  dialog.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    if (!button || button.getAttribute("aria-disabled") === "true") return;
    if (button.dataset.act === "reject") decide(false);
    else if (button.dataset.act === "approve") decide(true);
  });

  // Hovering or focusing Approve counts as noticing it: stop the hint.
  approveButton.addEventListener("pointerenter", () => approveButton.classList.remove("is-nudging"));
  approveButton.addEventListener("focus", () => approveButton.classList.remove("is-nudging"));

  mountDemo(root, {
    reset,
    play,
    finish,
    // After Replay, put the keyboard user straight back on Approve.
    onReplay: () => {
      if (document.activeElement !== replay) return;
      const giveFocus = () => (app.classList.contains("is-reviewing") ? approveButton.focus() : setTimeout(giveFocus, 100));
      setTimeout(giveFocus, 650);
    },
  });
}
