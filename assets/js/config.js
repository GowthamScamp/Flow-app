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
  baseUrl: "https://TODO-user.github.io/TODO-repo/",

  // The GitHub Releases page that holds the installer.
  releasesUrl: "https://github.com/GowthamScamp/Flow-app/releases",

  // This link points at the v2.1.3 release. When you publish a new version,
  // update `version` above and the version in this URL.
  // Size and checksum are left out of the page until you fill them in.
  downloads: {
    windows: [
      {
        label: "Windows installer (.exe)",
        file: "Flow-Setup.exe",
        url: "https://github.com/GowthamScamp/Flow-app/releases/download/v2.1.3/Flow-Setup.exe",
        size: "TODO",
        sha256: "TODO"
      }
    ]
  },

  // Set to a URL to show a "Privacy" link in the footer; null hides it.
  privacyUrl: null
};
