/* ==========================================================================
   Static preview server with gzip, like GitHub Pages.

       node tools/serve.mjs [port]            (default 8080)

   Python's http.server sends everything uncompressed, which makes
   Lighthouse and page-weight numbers look worse than the real site, because
   GitHub Pages compresses text files. This serves the site root the same way
   (and nothing else), with no dependencies.
   ========================================================================== */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2]) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".mjs", ".json", ".webmanifest", ".xml", ".txt", ".svg"]);
const cache = new Map(); // path -> gzipped bytes, so repeat requests stay cheap

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
  if (path === "" || path.endsWith("/") || path.endsWith("\\")) path += "index.html";
  const file = join(ROOT, path);
  // Never serve anything outside the site folder, or the unpublished extras.
  if (!file.startsWith(ROOT) || /^(_raw|tools|\.git|graphify-out)([/\\]|$)/.test(path) || /prompt\.md$/.test(path)) {
    res.writeHead(404).end("Not found");
    return;
  }
  let stat;
  try { stat = statSync(file); } catch { res.writeHead(404, { "content-type": TYPES[".html"] }).end(readFileSafe("404.html")); return; }
  if (!stat.isFile()) { res.writeHead(404).end("Not found"); return; }

  const ext = extname(file).toLowerCase();
  const headers = { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "public, max-age=600" };

  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "")) {
    const key = `${file}:${stat.mtimeMs}`;
    if (!cache.has(key)) cache.set(key, gzipSync(readFileSync(file), { level: 9 }));
    const body = cache.get(key);
    res.writeHead(200, { ...headers, "content-encoding": "gzip", "content-length": body.length, vary: "accept-encoding" });
    res.end(body);
    return;
  }
  res.writeHead(200, { ...headers, "content-length": stat.size });
  createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`Flow site preview: http://127.0.0.1:${PORT}/  (gzip on)`));

function readFileSafe(name) {
  try { return readFileSync(join(ROOT, name)); } catch { return "Not found"; }
}
