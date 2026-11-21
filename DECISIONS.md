# Decisions

Where the brief was ambiguous, I chose the calmer, simpler option. Each choice is listed here so it's easy to revisit.

## What the site is now (changes you asked for)

- **Simple and modern, in the style of Claude's own site.** This replaces the brief's film-like treatment. The facts, copy, colours, fonts and demos are unchanged.
  - One warm ground (ivory) for the whole page.
  - Calmer type: the hero is `clamp(2.75rem, 6.2vw, 5.25rem)` (the brief had up to 8.75rem), section headlines `clamp(2rem, 4.2vw, 3.5rem)`, weights 600.
  - Each section head puts the headline on the left and its supporting copy on the right, above the visual.
  - The three modes are simple cards, each with a preview and a link to its section.
  - No tilt, parallax, sticky scroll story, word-by-word headlines, hero wave motif or marquee. Content fades up once, softly. The model names are a plain list of chips with breathing dots.
- **Light only.** There is no dark mode and no theme toggle. The Review dialog, the code map and the onboarding card are still dark *windows*, because the app itself is dark there; the page around them is light.
- **Windows only.** Ubuntu is gone everywhere: the hero button, the download card, the FAQ answer, the page description, the structured data and the config.
  - Every visitor sees "Download for Windows". On macOS, Linux, iOS, Android or anything else, one quiet line is added: "Flow is available for Windows."
- **No video.** The film section, its player, the captions, the poster and the video file are removed, along with the encode and caption scripts. The earlier "Watch the film" button is gone too.
- **Footer.** It has the Download link (and Privacy, only if `privacyUrl` is set). The "Releases" and "Contact" placeholders are removed, and so is `contactEmail` in the config.
- **No "closed source" wording** anywhere on the site.
- **Download link.** `Flow-Setup.exe` from the v2.1.3 release of `GowthamScamp/Flow-app`, as you gave it. I also set the "All releases and release notes" link to that repository's releases page (`https://github.com/GowthamScamp/Flow-app/releases`).

## Inputs

- **Source assets.** There was no `_raw/` folder, so I copied the screenshots, brand files and captions in from `Projects/Flow-video/`. `_raw/` is gitignored, and the site never references it.
- **`prompt.md` is gitignored.** Committing it would publish the brief on GitHub Pages.

## Assets

- **Fonts.** Both are self-hosted Latin-subset variable woff2 files, downloaded from Google Fonts by `tools/fetch_fonts.py`: Inter (with the `opsz` and `wght` axes) and JetBrains Mono. The GitHub releases ship full character sets, and subsetting them needs fontTools, which isn't installed. Only Inter is preloaded.
- **Image widths.** Screenshot crops are made at 640, 1024, 1600 and 2400 px wide. Any width larger than a crop's master is skipped, and the master's own width is added instead (for example `mode-code-light-1533.webp`), so nothing is upscaled.
- **Light screenshots only.** Because the site is light only, only the light screenshots are used. The two dark ones (the Review dialog and the code map) are the static fallbacks for the dark app windows.
- **Code comments.** In the demo code blocks the comment colour is `#8B949E`, lighter than the app's `#6A737D`, so it passes AA contrast.

## Content

- **Facts.** All copy is from the brief. The demos reproduce text visible in your screenshots, such as the hash-map answer, the signup diff and the Webb/Hubble answer with its sources. That text is example app output, not claims about Flow.
- **Model chip.** The Chat demo's model chip reads `qwen3.6:27b`, as the brief specifies, although the screenshot shows `qwen3.5:2b`.
- **Copy kept to the brief's lists.** Where a screenshot shows more than the brief lists, I followed the brief:
  - **Chat:** the answer ends with the table. The closing quote and the Copy/Canvas/Regenerate row are left out.
  - **Review dialog:** it uses only the explanatory line. The "edit_file requests…" and "Automatically rejected at…" lines are left out, and so is the optional reject-reason field.
  - **Research:** the checked line shows only "Checked automatically: 3 of 3 cited statements match the evidence they cite."
  - **Onboarding card:** it stops after the two choice cards.
- **Review dialog diff.** The diff shows the changed function (lines 11–26) rather than all 27 lines, so the dialog fits in the window. Line numbers match the screenshot.
- **Export block.** The Export row gets a small heading, "Export", and one sentence restating the brief's fact: "Reports export as MD, HTML, PDF and DOCX. Citations export as BIB and RIS."
- **FAQ heading.** The FAQ needed a heading for document structure. I used "Questions.", in the same voice as "Get Flow."
- **Footer line.** "In flow." uses the accent colour (`#4F46E5`), not the brief's `#818CF8`, which has weak contrast on a light page.

## Behaviour

- **One config file.** `config.js` is the only file to edit. Crawlers and no-JS visitors can't read JavaScript, so `tools/apply-config.mjs` copies the values into the static spots marked with `data-config-*` attributes or `<!-- config:… -->` comments. It's a one-command helper, not a build step. Running it twice changes nothing.
- **Unknown details are left out, not faked.** The download card shows the version and the file name. Size and checksum appear only once they are filled in; until then those rows simply aren't there, rather than saying "coming soon". The browser console lists what is still missing.
- **The download URL is version-pinned.** It points at `v2.1.3`, so it needs updating with each release (the README says so). It does not use `latest/download`.
- **Demos without JavaScript.** Each demo's static fallback screenshot shows only when JavaScript is off. With JavaScript, the rebuilt HTML demo shows. Its markup is written in the finished state, so reduced motion simply skips the animation.
- **Demos and assistive tech.** The purely decorative demo (Chat) is `aria-hidden` and has a visually hidden description. The three interactive ones (Review, the code map and the citations) keep their controls available to assistive tech, with labels.
- **Review demo controls.** "Approve this turn" and "Allow for this session" behave like "Approve", since each one approves the edit. "Edit…" is shown but disabled ("not part of this demo"). The Unified / Side by side switch and the per-hunk Accept/Reject chips are decorative.
- **Code map keyboard.** The map uses a single Tab stop (a roving tabindex) instead of 22. Tab reaches the best-connected file, and the arrow keys move between connected files. Enter pins the highlight, and Escape clears it. Click or tap also pins, because touch screens have no hover.
- **Code map spacing.** The view box is padded (`-30 -28 1110 676`) around the brief's `0 0 1000 620` coordinates, so labels on the right edge are not cut off. The coordinates themselves are unchanged.
- **Reveals and failure.** Scroll reveals hide content only after `main.js` has booted (the `.booted` class). If the module fails to load, everything stays visible. The hero's headline, subhead and screenshot are visible from the first frame (the text only rises, never fades in), so the page's largest paint isn't held up by an animation.
- **Animated properties.** Only `transform`, `opacity` and `filter` animate, plus the Thought card's `clip-path` collapse, `stroke-dashoffset` for line drawing, and the FAQ height (which falls back to instant).
- **Performance.** The Chat and Review windows have fixed heights, so the browser skips laying them out until they near the viewport (`content-visibility: auto`).
- **CSS loading.** The five CSS files from the brief's file tree are linked separately, about 20 KB gzipped in total. That bends "one render-blocking CSS file", to keep the five-file structure without a build step.
- **Structured data.** The JSON-LD includes `priceCurrency: "USD"` alongside `price: "0"`, because schema validators expect a currency on an offer. There are no ratings or anything else.
