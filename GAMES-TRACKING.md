# games/ — Tracking Notes

Brought into session tracking 2026-08-22. This directory was built outside this
session's visibility (owner-confirmed, not an unauthorized agent action) and
found untracked in git during a routine `git status` check.

## What it is

A new "Interactive Learning" sub-site at `/games/`:
- `games/index.html` — landing page, links out to individual games. Currently
  lists one live game plus a "more coming soon" placeholder card.
- `games/bay-quest.html` — "Bay Quest: Nano Edition," a canvas-based catch game
  teaching Chesapeake Bay blue crab ecology, with an intro photo-slideshow,
  difficulty select, an "AI Knowledge Hub" facts screen, and a "Nano Crab" AI
  guide character narrating gameplay.
- `games/assets/intro/*.jpg` — 8 photos for the intro slideshow (all verified
  present, ~600KB total).

Links back to the main site via `../index.html#projects` and reuses
`maryland-crab.svg` / `favicon.svg` from the site root — both confirmed to exist.

This is a bigger, standalone expansion of the "Bay Quest" trivia quiz already
embedded as a `GameDemo` inside `index.html`'s project cards — same IP, much
more built out here.

## Status: tracked in git (2026-08-22)

Added to git after the CSP fix and SRI hashes were both in place —
`games/index.html`, `games/bay-quest.html`, and all 8 intro photos.

## Findings from the 2026-08-22 review

### Fixed
- **CSP was blocking both CDN scripts in production.** `bay-quest.html` loads
  `cdn.tailwindcss.com` and `cdnjs.cloudflare.com` (Tone.js), neither of which
  was on the site's `script-src` allowlist in `.htaccess`. Under the live CSP
  this would have silently broken the page — no Tailwind styling, no audio
  (every `Tone.js` call throws). **Fixed**: both domains added to `script-src`
  in `.htaccess` (2026-08-22).
- **No SRI hashes on either CDN script.** `index.html`'s own script tags
  (React/ReactDOM/Chart.js) carry `integrity` + `crossorigin="anonymous"`;
  these two didn't. **Fixed** (2026-08-22): the unversioned
  `cdn.tailwindcss.com` URL was itself a problem for SRI — it's a redirect
  (currently to `/3.4.17`) that Tailwind can silently repoint, which would
  either break SRI or defeat its purpose. Pinned the script tag directly to
  `cdn.tailwindcss.com/3.4.17`, then computed real SHA-384 hashes for both
  scripts from their actual downloaded bytes (not copied from anywhere) and
  added `integrity` + `crossorigin="anonymous"` to both. Same-origin as the
  CSP allowlist added earlier, no `.htaccess` change needed.
  Still true and unresolved: the Tailwind CDN build is documented by
  Tailwind as **not meant for production** (regenerates CSS client-side on
  every load, no purging) regardless of SRI — the real fix is still dropping
  the CDN dependency entirely, not attempted.

### Open / not yet addressed
- **Accessibility regression relative to the rest of the site.** hrt/ and the
  Claude Code course are WCAG 2.2 AA-diligent throughout. This game is
  mouse-only (`canvas.onmousemove` drives the player, no keyboard movement
  alternative — Space bar only triggers "scan"), score/objective/fact updates
  aren't in an `aria-live` region, and there's no skip-link. Not fixed.
- **Brand-voice departure.** "Nano Crab AI Assistant," "AI-powered insights,"
  heavy Bungee-font arcade styling is a real tonal break from the rest of the
  site's understated, no-hype voice (confirmed independently today by the
  `site-writing-voice` skill audit: zero exclamation points, zero hype
  adjectives elsewhere on the site). Might be an intentional register for a
  standalone game page — flagged as a judgment call for the owner, not
  something I changed.

## Main-site visibility

Briefly added as a fourth project card on the main portfolio (2026-08-22),
then removed the same night — owner wants more work done on it first, plans
to revisit tomorrow or later. The game itself is still live and tracked in
git at `/games/`, just not linked from the main site's showcase for now.

## Next steps (not yet actioned, listed for future reference)

1. Decide whether to drop the Tailwind/Tone.js CDN dependencies entirely
   (SRI is now in place as an interim measure, but Tailwind's CDN build
   still isn't meant for production use).
2. Decide whether the "Nano Crab" AI-hype voice is intentional for this page
   or should be toned down to match the rest of the site.
3. Add real keyboard controls + `aria-live` gameplay announcements if this
   page is meant to meet the same accessibility bar as the rest of the site.
