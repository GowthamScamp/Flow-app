# Flow website

The official site for Flow, the local-first AI workspace for Windows. It is plain HTML, CSS and vanilla JavaScript, with no build step, made for GitHub Pages.

## Edit the placeholders

Every URL and unconfirmed value lives in one file, `assets/js/config.js`:

- `baseUrl`: where the site is published, with a trailing slash. It's used for the canonical link, social cards and the sitemap.
- `releasesUrl`: the GitHub Releases page.
- `downloads.windows`: the installer's `file`, `url`, `size` and `sha256`.
  - The download URL points at the v2.1.3 release. When you publish a new version, update `version` and the version in this URL.
  - `size` and `sha256` are left out of the page until you fill them in. Once you do, they appear on the Download card automatically.
- `privacyUrl`: set it to a URL to show a Privacy link in the footer; leave it `null` to hide the link.

The browser console lists every placeholder that remains.

After editing `config.js`, run:

```sh
node tools/apply-config.mjs
```

The live page reads `config.js` directly. This command copies the same values into the places that crawlers and visitors without JavaScript read:

- canonical and social tags;
- the no-JS download card and button;
- `404.html`;
- `sitemap.xml` and `robots.txt`.

You can safely run it any number of times.

## Preview locally

```sh
node tools/serve.mjs          # http://127.0.0.1:8080/, gzip on, like GitHub Pages
# or, with Python:
python -m http.server 8080
```

Open http://localhost:8080/. ES modules don't load from `file://`, so use a server. Prefer `tools/serve.mjs` when measuring speed: Python's server doesn't compress, which makes Lighthouse look worse than the real site.

To check that it also works under a project path, as GitHub Pages serves it, serve the parent folder instead and open `http://localhost:8080/flow-app-web/`.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository, on the `main` branch.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select **`main`** and **`/ (root)`**, and save.
4. After a minute the site is live at `https://<user>.github.io/<repo>/`. Put that address in `baseUrl`, run `node tools/apply-config.mjs`, then commit and push.

Every link and asset path is relative, so the site works both at a domain root and under `/<repo>/`. The empty `.nojekyll` file tells Pages to serve the files as they are.

**Custom domain (later).** Add a file named `CNAME` at the root that contains only the domain (for example `flow.example.com`), and set the domain under Settings → Pages. Then point your DNS at GitHub Pages, set `baseUrl` to the new address and run `apply-config` again.

**The installer is not stored here.** It lives on GitHub Releases. GitHub warns about files over 50 MiB and blocks files over 100 MiB in a repository.

## Files

```
index.html  404.html  .nojekyll  robots.txt  sitemap.xml  site.webmanifest
assets/css/       tokens.css (design tokens), base, layout, components, sections
assets/js/        config.js (edit me), main.js (boot), downloads.js (download card markup)
assets/js/demos/  shared.js, chat.js, review.js, codemap.js, citations.js
assets/fonts/     Inter and JetBrains Mono, Latin subset, self-hosted
assets/img/       screenshot crops (WebP), social card
assets/icons/     favicons and app icons
tools/            one-off asset scripts, apply-config.mjs, serve.mjs, qa/qa.mjs
```

## Regenerate the assets

The source assets go in `_raw/`, which is never committed. To rebuild the web assets from them:

```sh
python tools/build_assets.py      # screenshots -> WebP crops, icons, social card (needs Pillow)
python tools/fetch_fonts.py       # Latin-subset woff2 fonts
```

## QA

```sh
node tools/qa/qa.mjs http://localhost:8080/
```

The script drives headless Chrome and checks:

- console errors and horizontal overflow at 360–1920 px;
- a Tab walk through the page;
- the no-JS and reduced-motion variants.

Screenshots go to `tools/qa/out/`, which is gitignored. For Lighthouse, run `npx lighthouse http://localhost:8080/`.
