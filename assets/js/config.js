/* ==========================================================================
   Site configuration — the ONE file to edit.

   Every URL, file name and placeholder lives here. Any value that still
   contains "TODO" is shown on the page as a calm "Coming soon" state (never a
   broken link), and the browser console lists every TODO that remains.

   After editing, run:  node tools/apply-config.mjs
   That copies these values into the places crawlers and no-JS visitors read
   (canonical and social tags, sitemap.xml, robots.txt, the no-JS download
   links and 404.html). The live page always reads this file directly.
   ========================================================================== */

export const SITE = {
  version: "2.1.3",

  // Where the site is published, with a trailing slash. Used for the
  // canonical link, social cards and the sitemap.
  baseUrl: "https://TODO-user.github.io/TODO-repo/",

  // The GitHub Releases page that holds the installers.
  releasesUrl: "https://github.com/TODO-owner/TODO-releases-repo/releases",

  // Download URLs should follow the pattern
  //   https://github.com/<owner>/<repo>/releases/latest/download/<file>
  // so they always point at the newest release. Note that "latest" only works
  // while the newest release contains a file with exactly that name: the file
  // names below include the version, so update them with each release.
  //
  // File names come from Flow's electron-builder.yml. GitHub replaces spaces
  // in uploaded asset names with dots ("Flow Setup 2.1.3.exe" becomes
  // "Flow.Setup.2.1.3.exe"), so check the real name on the release page.
  downloads: {
    windows: [
      { label: "Windows installer (.exe)", file: "TODO-Flow.Setup.2.1.3.exe", url: "TODO", size: "TODO", sha256: "TODO" }
    ],
    ubuntu: [
      { label: "Ubuntu package (.deb)", file: "TODO-Flow-2.1.3-ubuntu-amd64.deb", url: "TODO", size: "TODO", sha256: "TODO" },
      { label: "AppImage", file: "TODO-Flow-2.1.3-ubuntu-x86_64.AppImage", url: "TODO", size: "TODO", sha256: "TODO" }
    ]
  },

  // Shown in the footer as a mailto: link.
  contactEmail: "TODO",

  // Set to a URL to show a "Privacy" link in the footer; null hides it.
  privacyUrl: null
};
