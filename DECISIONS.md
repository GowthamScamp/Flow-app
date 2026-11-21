# Decisions

Where the brief was ambiguous, I chose the calmer, simpler option. Each choice is listed here so it's easy to revisit.

## Design direction (changed mid-build, at your request)

You asked for a simple, modern site in the style of Claude's own, and not a copy of the launch film's look. This replaces the brief's film-like treatment (§3.4–3.5, §4). The facts, copy, colours, fonts and demos are unchanged.

What changed:

- **One warm ground.** The whole page sits on ivory (a warm charcoal in dark mode). The alternating ivory/midnight sections and the glide between them are gone.
- **Calmer type.** The hero is `clamp(2.75rem, 6.2vw, 5.25rem)` (the brief had up to 8.75rem), section headlines are `clamp(2rem, 4.2vw, 3.5rem)`, and weights are 600 instead of 680. Letter-spacing and line-height are relaxed to match.
- **Standard layouts.** Each section head puts the headline on the left and its supporting copy on the right, above the visual. Everything is left-aligned except the hero.
- **No showpiece motion.** Removed:
  - the 3D tilt and parallax on windows;
  - the sticky 300vh Modes story (replaced by three simple cards, each with a preview and a link to its section);
  - the word-by-word headline masks;
  - the hero's three-wave motif and mode-card glows;
  - the model marquee (replaced by a plain list of chips with breathing dots).

  Content now fades up once, softly. The demos themselves are unchanged, and still animate once and offer Replay.
- **Softer windows.** The window frame keeps its 16 px radius and hairline, with a lighter layered shadow.
- **Dark where the app is dark.** The Review dialog, the code map and the onboarding card stay dark windows on the light page, as they are in the app.
- **Footer.** It sits on the page ground, and "In flow." uses the accent token (`#4F46E5` on ivory, `#818CF8` in dark mode). The brief's fixed `#818CF8` has weak contrast on ivory.
- **Kept from the brief:** the colour tokens, mode colours, Inter and JetBrains Mono, the exact copy, the interactive demos, OS detection, the theme toggle, config placeholders and the film.

## Inputs

- **Source assets.** There was no `_raw/` folder, so I copied the assets in from where they actually were:
  - screenshots and brand files from `Projects/Flow-video/images/`;
  - captions from `Projects/Flow-video/on-screen-text.srt`;
  - the film from `Downloads/Flow-launch-film-1080p60.mp4` (the 7:39 PM render, your choice).

  `_raw/` is gitignored, and the site never references it.
- **`prompt.md` is gitignored.** Committing it would publish the brief on GitHub Pages.

## Other changes you asked for

- **No film button in the hero.** You asked for the "Watch the film" button to be removed, so I removed it completely: the button, the pop-up player it opened, and that pop-up's code and styles. The hero has just the download button(s) and "Free to use." The film stays in its own section ("One minute with Flow.") with the full player.
- **Windows downloads.** Only the installer `.exe` is listed, at your request. The portable `.exe` is left out. Ubuntu lists the `.deb` and the AppImage.

## Assets

- **Fonts.** Both are self-hosted Latin-subset variable woff2 files, downloaded from Google Fonts by `tools/fetch_fonts.py`:
  - Inter with the `opsz` and `wght` axes;
  - JetBrains Mono with `wght`.

  The GitHub releases ship full character sets, and subsetting them needs fontTools, which isn't installed. Only Inter is preloaded.
- **Image widths.** Screenshot crops are made at 640, 1024, 1600 and 2400 px wide. Any width larger than a crop's master is skipped, and the master's own width is added instead (for example `mode-code-light-1533.webp`). That way nothing is upscaled.
- **Mode cards.** The three Modes cards show the story crops of the Chat, Code and Research screens as previews, cropped to their top-left.
- **Film.** CRF 23 already produced 9.0 MB, under the 12 MB budget, so no CRF stepping was needed. It keeps the original 60 fps.
- **Film poster.** The poster is the designed end card (`flow-end-card-1920x1080.png`) converted to WebP, rather than a frame grabbed from the video. The play button is a dark disc so it stays visible over the light poster.

## Content

- **Facts.** All copy is from the brief. The demos reproduce text visible in your screenshots, such as the hash-map answer, the signup diff and the Webb/Hubble answer with its sources. That text is example app output, not claims about Flow.
- **Model chip.** The Chat demo's model chip reads `qwen3.6:27b`, as the brief specifies, although the screenshot shows `qwen3.5:2b`.
- **Copy kept to the brief's lists.** Where a screenshot shows more than the brief lists, I followed the brief:
  - **Chat:** the answer ends with the table. The closing quote and the Copy/Canvas/Regenerate row are left out.
  - **Review dialog:** it uses only the explanatory line. The "edit_file requests…" and "Automatically rejected at…" lines are left out, and so is the optional reject-reason field.
  - **Research:** the checked line shows only "Checked automatically: 3 of 3 cited statements match the evidence they cite." The "Confidence" sentence and the "3 sources have grounded notes" banner are left out.
  - **Onboarding card:** it stops after the two choice cards. The form fields are left out.
- **Review dialog diff.** The diff shows the changed function (lines 11–26) rather than all 27 lines, so the dialog fits in the window. Line numbers match the screenshot.
- **Export block.** The Export row gets a small heading, "Export", and one sentence restating the brief's fact: "Reports export as MD, HTML, PDF and DOCX. Citations export as BIB and RIS."
- **FAQ heading.** The FAQ needed a heading for document structure. I used "Questions.", in the same voice as "Get Flow."
- **404 page.** It shows only the headline and the button, as the brief describes.

## Behaviour

- **One config file.** `config.js` is the only file to edit. Crawlers and no-JS visitors can't read JavaScript, so `tools/apply-config.mjs` copies the values into the static spots marked with `data-config-*` attributes or `<!-- config:… -->` comments. It's a one-command helper, not a build step. Running it twice changes nothing.
- **Downloads before the URLs exist.** While a download URL is still a TODO:
  - the hero "Download for …" button links to the Download section;
  - the Download card shows a dashed "Coming soon" pill.

  File names, sizes and checksums likewise read "coming soon". Nothing ever links to a TODO.
- **Version in the file names.** `latest/download/<file>` URLs only work while the newest release has a file with exactly that name. Flow's file names include the version, so they need updating with each release. The README says so.
- **Checksums.** The `SHA256SUMS-win32.txt` file in `CODE_CHAT/desktop/release/` comes from a local, unsigned build. The published, signed installer will have a different hash, so I didn't use it, and checksums stay TODO.
- **OS detection.**
  - On Windows or Linux, the hero shows just that OS's button, and its download card is moved first and highlighted.
  - On macOS, iOS, Android, ChromeOS or anything unknown, both buttons show, with the note "Flow is available for Windows and Ubuntu."
  - Without JavaScript, both buttons show.
- **Demos without JavaScript.** Each demo's static fallback screenshot shows only when JavaScript is off. With JavaScript, the rebuilt HTML demo shows. Its markup is written in the finished state, so reduced motion simply skips the animation.
- **Demos and assistive tech.** The purely decorative demo (Chat) is `aria-hidden` and has a visually hidden description. The three interactive ones (Review, the code map and the citations) keep their controls available to assistive tech, with labels. Focusable controls inside `aria-hidden` content would be an accessibility error.
- **Review demo controls.**
  - **Approve this turn** and **Allow for this session** behave like **Approve**, since each one approves the edit.
  - **Edit…** is shown but disabled ("not part of this demo").
  - The Unified / Side by side switch and the per-hunk Accept/Reject chips are decorative.
- **Code map keyboard.** The map uses a single Tab stop (a roving tabindex) instead of 22. Tab reaches the best-connected file, and the arrow keys move between connected files. Enter pins the highlight, and Escape clears it. Click or tap also pins, because touch screens have no hover.
- **Code map spacing.** The view box is padded (`-30 -28 1110 676`) around the brief's `0 0 1000 620` coordinates, so labels on the right edge are not cut off. The coordinates themselves are unchanged.
- **Theme.** The tokens use CSS `light-dark()`, so the page follows the theme and the dark windows force `color-scheme: dark`.
  - A tiny inline script in `<head>` applies a saved theme before first paint, to avoid a flash of the wrong theme. It is the only inline script; there are no inline event handlers.
  - `<picture>` elements can't see `data-theme`, so the footer toggle rewrites each dark `<source media>` to `all` or `not all`.
- **Reveals and failure.** Scroll reveals hide content only after `main.js` has booted (the `.booted` class). If the module fails to load, everything stays visible. The hero's entrance is pure CSS.
- **Animated properties.** Only `transform`, `opacity` and `filter` animate, plus:
  - the Thought card's `clip-path` collapse;
  - `stroke-dashoffset` for line drawing;
  - the FAQ height, which uses `::details-content` and falls back to instant.

  Hover colour changes are instant rather than animated.
- **CSS loading.** The five CSS files from the brief's file tree are linked separately, about 20 KB gzipped in total. That bends "one render-blocking CSS file", to keep the five-file structure without a build step. Lighthouse results are in the final report.
- **Structured data.** The JSON-LD includes `priceCurrency: "USD"` alongside `price: "0"`, because schema validators expect a currency on an offer. There are no ratings or anything else.
