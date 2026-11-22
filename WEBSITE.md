# Flow website

The website for **Flow**, a local-first AI workspace for Windows.

**Live site:** https://gowthamscamp.github.io/flow-app/

**Download:** [Flow 2.1.3 for Windows](https://github.com/GowthamScamp/Flow-app/releases/tag/v2.1.3). Flow is free to use.

## About this repository

This is a static site made of plain HTML, CSS and JavaScript. It has no build step and no dependencies. GitHub Pages serves it as is.

## Run it locally

From this folder, start any static server, for example:

```bash
python -m http.server 8080
```

Then open http://localhost:8080/.

## Publish on GitHub Pages

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/ (root)` folder, then save.

## Change the download link or site URL

Site values live in `assets/js/config.js`. After editing them, run:

```bash
node tools/apply-config.mjs
```

This updates the static HTML that search engines and visitors without JavaScript read.

For developer notes, see [DEVELOPMENT.md](DEVELOPMENT.md).
