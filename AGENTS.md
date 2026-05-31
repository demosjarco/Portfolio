# Portfolio - Windows XP Recreation

This project is a re-creation of Windows XP, built with [Qwik](https://qwik.dev/) in static generation mode (not SSR) and deployed on Cloudflare Workers + static assets. It also serves as a portfolio/demo showcasing cool tech the author has built, with links to other projects and work. Use `mcp_cloudflare-do_search_cloudflare_documentation` only for infrastructure/hosting setup questions, as the app itself is statically generated.

## Core Principle

**The most important aspect of this project is accuracy to real Windows XP.** All the small details matter — pixel-perfect UI, correct behaviors, animations, sounds, and even iconic bugs from the original OS should be faithfully reproduced. When in doubt, match what real Windows XP actually did.

## Running the Project

- **Start the server:** `npm run start`
- **Start with Node inspector / Chrome DevTools:** `npm run dev`

## Images

All images bundled in the app must be imported with `?jsx` at the end so that Qwik can properly optimize them (see [Qwik image optimization](https://qwik.dev/docs/integrations/image-optimization/#image-optimization)). For example, `import Logo from './logo.png?jsx';` and then use it as `<Logo />`.

## Verification

**Always double-check all work by actually visiting the page using Chrome DevTools MCP tools** (e.g., `mcp_chrome-devtoo_take_screenshot`, `mcp_chrome-devtoo_click`, etc.). Do not assume changes are correct without visually confirming them in the browser.

The dev server uses Vite HMR, so changes appear almost immediately — the page usually reloads within a couple hundred milliseconds. There is no need to wait several seconds (e.g. a 10000ms sleep) after an edit before verifying; a short wait is plenty.
