# Decisions

Where the brief was ambiguous, I chose the calmer, simpler option. Each choice is listed here so it's easy to revisit.

## Inputs

- **Where the source assets came from.** There was no `_raw/` folder, so I copied the assets in from their real locations:
  - screenshots and brand files from `Projects/Flow-video/images/`;
  - captions from `Projects/Flow-video/on-screen-text.srt`;
  - the film from `Downloads/Flow-launch-film-1080p60.mp4`, the 7:39 PM render you chose.

  `_raw/` is gitignored, and the site never references it.
- **`prompt.md` is gitignored too.** Committing it would publish the brief on GitHub Pages.

## Assets

- **Fonts.** Both are self-hosted Latin-subset variable woff2 files, downloaded from Google Fonts by `tools/fetch_fonts.py`:
  - Inter with the `opsz` and `wght` axes;
  - JetBrains Mono with `wght`.

  The official GitHub releases ship full character sets, and subsetting them needs fontTools, which isn't installed. The Google files are the same typefaces, already cut to Latin.
- **Image widths.** Screenshot crops are made at 640, 1024, 1600 and 2400 px wide.
  - When a crop's master is narrower than a width, that width is skipped.
  - The master's own width is added instead (for example `mode-code-light-1533.webp`), so high-DPI screens still get full detail without upscaling.
- **Mode crops.** The three crops in the Modes section share one aspect ratio (about 1.45), so the cross-fade never changes the frame.
- **Demo fallbacks.** Each demo's static fallback is the full screenshot:
  - Chat: `02b-chat-answer`;
  - Code: `05-code-approval`;
  - Code map: `06c-code-graph-full`;
  - Research: `10-research-sources`.

  The fallbacks show only when JavaScript is off.
- **Film.** CRF 23 already produced 9.0 MB, under the 12 MB budget, so no CRF stepping was needed. It keeps the original 60 fps.
- **Film poster.** The poster is `flow-end-card-1920x1080.png` converted to WebP. I used the designed end card rather than a frame grabbed from the video.
