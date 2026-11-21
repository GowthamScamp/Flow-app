/* ==========================================================================
   Copy values from assets/js/config.js into the static files that crawlers
   and no-JS visitors read. Run after editing config.js:

       node tools/apply-config.mjs

   Updates:
     index.html   canonical, og:url, og:image, twitter:image, version text,
                  the no-JS download card and button, releases link and
                  footer links
     404.html     the "Back to Flow" link
     sitemap.xml  and robots.txt
   Values still containing "TODO" keep their placeholder (and the live page
   leaves them out, or shows "Coming soon" where a link would be).
   ========================================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { SITE } = await import(pathToFileURL(join(ROOT, "assets/js/config.js")).href);
const { isTodo, renderFiles, renderReleases, renderFooterLinks } = await import(
  pathToFileURL(join(ROOT, "assets/js/downloads.js")).href
);

const base = SITE.baseUrl.endsWith("/") ? SITE.baseUrl : `${SITE.baseUrl}/`;
const values = {
  baseUrl: base,
  ogImage: `${base}assets/img/og-1280x720.jpg`,
};

// Replace attr="..." on every tag that carries data-config-<attr>="<key>".
function setAttr(html, attr, key, value) {
  const tag = new RegExp(`<[^>]*data-config-${attr}="${key}"[^>]*>`, "g");
  return html.replace(tag, (t) => t.replace(new RegExp(`\\s${attr}="[^"]*"`), ` ${attr}="${value}"`));
}

// Replace everything between <!-- config:name --> and <!-- /config:name -->.
function setBlock(html, name, inner, indent = "", closeIndent = indent) {
  const re = new RegExp(`(<!-- config:${name} -->)[\\s\\S]*?(<!-- /config:${name} -->)`);
  if (!re.test(html)) throw new Error(`Marker config:${name} not found`);
  return html.replace(re, (_, open, close) => `${open}\n${indent}${inner}\n${closeIndent}${close}`);
}

let changed = [];

// ---- index.html ------------------------------------------------------------
{
  const file = join(ROOT, "index.html");
  let html = readFileSync(file, "utf8");
  html = setAttr(html, "href", "baseUrl", values.baseUrl);
  html = setAttr(html, "content", "baseUrl", values.baseUrl);
  html = setAttr(html, "content", "ogImage", values.ogImage);
  html = html.replace(/(<span data-config-text="version">)[^<]*(<\/span>)/g, `$1${SITE.version}$2`);
  html = html.replace(/("softwareVersion":\s*")[^"]*(")/, `$1${SITE.version}$2`);
  html = setBlock(html, "files:windows", renderFiles(SITE, "windows").trim(), "            ");
  html = html.replace(/(<!-- config:releases -->)[\s\S]*?(<!-- \/config:releases -->)/, `$1${renderReleases(SITE)}$2`);
  html = setBlock(html, "footer", renderFooterLinks(SITE), "            ");
  // No-JS hero button: straight to the installer once it has a real URL.
  const url = SITE.downloads?.windows?.[0]?.url;
  const href = url && !isTodo(url) ? url : "#download";
  html = html.replace(/(<a class="[^"]*" href=")[^"]*(" data-os-button="windows">)/, `$1${href}$2`);
  writeFileSync(file, html);
  changed.push("index.html");
}

// ---- 404.html ------------------------------------------------------------------
{
  const file = join(ROOT, "404.html");
  let html = readFileSync(file, "utf8");
  html = setAttr(html, "href", "baseUrl", isTodo(SITE.baseUrl) ? "./" : values.baseUrl);
  writeFileSync(file, html);
  changed.push("404.html");
}

// ---- sitemap.xml and robots.txt -------------------------------------------------------
writeFileSync(
  join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${values.baseUrl}</loc>
  </url>
</urlset>
`
);
writeFileSync(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${values.baseUrl}sitemap.xml\n`);
changed.push("sitemap.xml", "robots.txt");

console.log(`Updated: ${changed.join(", ")}`);
const todos = JSON.stringify(SITE).match(/TODO[^"]*/g) ?? [];
console.log(todos.length ? `${todos.length} TODO value(s) remain in config.js.` : "No TODO values remain.");
