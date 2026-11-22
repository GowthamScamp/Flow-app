/* ==========================================================================
   Site configuration — the ONE file to edit.

   Every URL, file name and placeholder lives here. Any value that still
   contains "TODO" is left out of the page (or shown as a calm "Coming soon"
   state where a link would be), never as a broken link, and the browser
   console lists every TODO that remains.

   After editing, run:  node tools/apply-config.mjs
   That copies these values into the places crawlers and no-JS visitors read
   (canonical and social tags, sitemap.xml, robots.txt, the no-JS download
   link and 404.html). The live page always reads this file directly.
   ========================================================================== */

export const SITE = {
  version: "2.1.3",

  // Where the site is published, with a trailing slash. Used for the
  // canonical link, social cards and the sitemap.
  baseUrl: "https://gowthamscamp.github.io/Flow-app/",

  // The GitHub Releases page that holds the installer.
  releasesUrl: "https://github.com/GowthamScamp/Flow-app/releases",

  // Every Download button opens the v2.1.3 release page, where Flow-Setup.exe
  // is listed under Assets. When you publish a new version, update `version`
  // above and the tag in this URL.
  // Size and checksum are left out of the page until you fill them in.
  downloads: {
    windows: [
      {
        label: "Windows installer (.exe)",
        file: "Flow-Setup.exe",
        url: "https://github.com/GowthamScamp/Flow-app/releases/tag/v2.1.3",
        size: "TODO",
        sha256: "TODO"
      }
    ]
  },

  // Set to a URL to show a "Privacy" link in the footer; null hides it.
  privacyUrl: null
};
