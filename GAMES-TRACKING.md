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

## Status: untracked in git

Not yet `git add`ed. Whether to commit it (and the intro photo assets) is an
open decision — not made unilaterally as part of this tracking pass.

## Findings from the 2026-08-22 review

### Fixed
- **CSP was blocking both CDN scripts in production.** `bay-quest.html` loads
  `cdn.tailwindcss.com` and `cdnjs.cloudflare.com` (Tone.js), neither of which
  was on the site's `script-src` allowlist in `.htaccess`. Under the live CSP
  this would have silently broken the page — no Tailwind styling, no audio
  (every `Tone.js` call throws). **Fixed**: both domains added to `script-src`
  in `.htaccess` (2026-08-22).

### Open / not yet addressed
- **No SRI hashes** on either CDN script. `index.html`'s own script tags
  (React/ReactDOM/Chart.js) all carry `integrity` + `crossorigin="anonymous"`;
  these two don't. If either CDN were compromised, the page would run
  injected code with no protection. Lower priority than the CSP break, but
  worth closing — especially since the Tailwind CDN build is explicitly
  documented by Tailwind as **not meant for production** (regenerates CSS
  client-side on every load, no purging). Real fix is dropping the CDN
  dependency entirely (compiled/purged Tailwind, or hand-written CSS; the
  Tone.js usage is 2-3 simple beep calls that don't need a full synthesis
  library) — that's a much bigger rewrite than adding an SRI hash, not
  attempted yet.
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

## Next steps (not yet actioned, listed for future reference)

1. Decide whether to `git add` and commit `games/` (code + intro photos).
2. Decide whether to drop the Tailwind/Tone.js CDN dependencies vs. just add
   SRI hashes as an interim measure.
3. Decide whether the "Nano Crab" AI-hype voice is intentional for this page
   or should be toned down to match the rest of the site.
4. Add real keyboard controls + `aria-live` gameplay announcements if this
   page is meant to meet the same accessibility bar as the rest of the site.
