/* ==========================================================================
   Download markup, rendered from config.js.

   Shared by the browser (main.js renders it live) and by
   tools/apply-config.mjs (which writes the same markup into index.html for
   visitors without JavaScript). It must stay free of DOM access so Node can
   import it.
   ========================================================================== */

/** A value is a placeholder while it still mentions TODO (or is empty). */
export const isTodo = (value) =>
  value == null || (typeof value === "string" && (value.trim() === "" || value.includes("TODO")));

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Every TODO left in the config, as "path: value" strings, for console.warn. */
export function listTodos(site) {
  const found = [];
  const walk = (value, path) => {
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k));
    else if (typeof value === "string" && value.includes("TODO")) found.push(`${path}: ${value}`);
  };
  walk(site, "");
  return found;
}

/** The first real download URL for a platform, or null while it is a TODO. */
export function primaryUrl(site, os) {
  const file = site.downloads?.[os]?.[0];
  return file && !isTodo(file.url) ? file.url : null;
}

const COPY_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

function renderFile(file, version, index, os) {
  const id = `sha-${os}-${index}`;
  const name = isTodo(file.file)
    ? '<span class="soon">File name coming soon</span>'
    : `<span class="mono">${escapeHtml(file.file)}</span>`;
  const size = isTodo(file.size) ? '<span class="soon">Size coming soon</span>' : escapeHtml(file.size);
  const button = isTodo(file.url)
    ? `<span class="btn btn--soon" aria-disabled="true">Coming soon</span>`
    : `<a class="btn btn--primary" href="${escapeHtml(file.url)}">Download<span class="vh"> ${escapeHtml(file.label)}</span></a>`;
  const sha = isTodo(file.sha256)
    ? `<p class="sha__value"><span class="soon">Checksum coming soon</span></p>`
    : `<p class="sha__value"><code id="${id}">${escapeHtml(file.sha256)}</code>` +
      `<button class="sha__copy" type="button" data-copy="${id}">${COPY_ICON}<span>Copy</span></button></p>`;

  return `<li class="file">
            <div class="file__head">
              <p class="file__label">${escapeHtml(file.label)}</p>
              ${button}
            </div>
            <dl class="file__meta">
              <div><dt>Version</dt><dd>${escapeHtml(version)}</dd></div>
              <div><dt>File</dt><dd>${name}</dd></div>
              <div><dt>Size</dt><dd>${size}</dd></div>
            </dl>
            <details class="sha">
              <summary>SHA-256</summary>
              ${sha}
            </details>
          </li>`;
}

/** The <li> items for one platform card. */
export function renderFiles(site, os) {
  return (site.downloads?.[os] ?? []).map((f, i) => renderFile(f, site.version, i, os)).join("\n          ");
}

/** The releases link, or a quiet "coming soon" line while it is a TODO. */
export function renderReleases(site) {
  return isTodo(site.releasesUrl)
    ? `<span class="soon">All releases and release notes: coming soon</span>`
    : `<a class="arrow-link" href="${escapeHtml(site.releasesUrl)}">All releases and release notes <span aria-hidden="true">→</span></a>`;
}

/** Footer links: Download · Releases · Contact · Privacy (only when set). */
export function renderFooterLinks(site) {
  const items = [`<li><a href="#download">Download</a></li>`];
  items.push(
    isTodo(site.releasesUrl)
      ? `<li><span class="soon">Releases (coming soon)</span></li>`
      : `<li><a href="${escapeHtml(site.releasesUrl)}">Releases</a></li>`
  );
  items.push(
    isTodo(site.contactEmail)
      ? `<li><span class="soon">Contact (coming soon)</span></li>`
      : `<li><a href="mailto:${escapeHtml(site.contactEmail)}">Contact</a></li>`
  );
  if (site.privacyUrl && !isTodo(site.privacyUrl)) {
    items.push(`<li><a href="${escapeHtml(site.privacyUrl)}">Privacy</a></li>`);
  }
  return items.join("\n            ");
}
