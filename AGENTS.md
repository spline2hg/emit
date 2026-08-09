# AGENTS.md

## Rules

- Never install, download, or launch browsers (Chrome, Chromium, headless-shell,
  Playwright, puppeteer) or browser automation tooling unless the user explicitly
  asks for it. Do not "repair" or re-fetch browser binaries.
- To verify UI work without a browser, use `tsc --noEmit`, `npm run build`, and
  code review instead. Leave visual QA to the user.
- If a browser binary ends up in your environment by mistake, remove it; if it is
  only in a temp directory, leave it alone.