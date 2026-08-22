# Security Audit — johntcrawford.com

Repo root: `C:\dev\www-root`. Research/reporting only, no files modified.
Scope depth: deep pass on the main portfolio (`index.html` + endpoints), lighter-but-real pass on `hrt/` and `learning/claude-code/`, quick sanity check on everything else.

---

## Critical

None found.

---

## High

None found.

---

## Medium

### M1. `hrt/review.html` carries the admin secret in the URL on a page that also loads a third-party beacon script
- **What**: `hrt/review.html:1056` reads the admin key straight from the URL — `var ADMIN_KEY = new URLSearchParams(location.search).get('key') || '';` — and reuses it in six `fetch()` calls (`hrt/review.html:1474,1492,1519,1539,1543,1577`). The same page also loads Cloudflare Web Analytics — `hrt/review.html:196` — `<script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='...'>`.
- **Exploit scenario**: I verified against Cloudflare's own FAQ (developers.cloudflare.com/web-analytics/faq) that the beacon **does not** log query strings — "Cloudflare Web Analytics do not log query strings to avoid collecting potentially sensitive data." So the specific "beacon exfiltrates the key to Cloudflare" scenario the audit asked me to check for is **not real** — false positive, ruled out by design on Cloudflare's end. What remains real: the key still lands in (a) the server's own access logs on every request, (b) the browser's local history/autocomplete on the device used to review photos, and (c) any browser extension or proxy that inspects full URLs. Anyone with read access to those logs, or physical/browser access to the reviewing device, recovers the key and gets full read/write/publish access to the hrt inbox (list, view, publish, discard — see `hrt/api/hrt-admin.php:217-288`).
- **Remediation**: Move the key out of the query string post-load — e.g. read it once, strip it from the URL with `history.replaceState`, and carry it in memory/sessionStorage for the rest of the session (`capture.html` and `review.html` both already fall back to `sessionStorage` elsewhere, so the pattern exists in-repo).

### M2. `deploy.php` and `hrt-admin.php` follow the same URL-secret pattern — accepted risk, but worth naming explicitly
- **What**: `deploy.php:6,11` and `hrt/api/hrt-admin.php:33,59-62` both gate every action on `?key=<SECRET>` checked with `hash_equals` (correct, constant-time comparison — good practice, no timing-attack issue). Neither page loads any third-party script (deploy.php returns `Content-Type: text/plain`; and `capture.html`, which also uses `?key=`, loads **no** beacon script — confirmed, zero matches for `cloudflareinsights` in `hrt/capture.html`). So there is no active third-party-script exfiltration path here — same conclusion as M1's beacon check.
- **Exploit scenario**: The residual risk is purely server-access-log / browser-history exposure of a bearer-token-equivalent secret, same as M1. Given `deploy.php` and `hrt-admin.php` are both gitignored, single-admin tools, and comments show the author already accepted this trade-off, this is Medium rather than High.
- **Remediation**: Optional — same URL-stripping approach as M1, or move to a header-based `Authorization` scheme if these tools ever grow beyond one admin.

---

## Low

### L1. CSP allows `'unsafe-inline'` for scripts site-wide
- **What**: `.htaccess:18` — `Content-Security-Policy: ... script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com ...`. `'unsafe-inline'` on `script-src` neutralizes most of the XSS protection a CSP would otherwise provide, because it permits any inline `<script>` block or inline event handler to execute — including one an attacker manages to inject.
- **Exploit scenario**: Given the audit found no actual injection point (see "nothing else stood out" below — `dangerouslySetInnerHTML` in `hrt/index.html` is fed only from hardcoded local data, `email-capture.php` escapes appropriately, no other unescaped `innerHTML` sinks take remote/user data), this is currently a defense-in-depth gap rather than an active exploit path. It matters only if a future change introduces an injection point — the CSP wouldn't catch it.
- **Remediation**: If build tooling ever gets added, migrate inline `<script>` blocks to nonces or hashes and drop `'unsafe-inline'`. Not urgent given the sites are hand-authored static/PHP pages with no current injection point.

### L2. Prepared `.htaccess` protection templates for `tree.html` and the course lessons exist but are not deployed
- **What**: `htaccess_tree_protection.txt`, `htaccess_EDIT_ME.txt` (site root) and `learning/claude-code/htaccess_course_protection.txt` are all *templates* — plain `.txt` files, not live `.htaccess` files. The live `.htaccess` at the site root (`C:\dev\www-root\.htaccess`) contains **no** `<Files>` block for `tree.html` and no `AuthType`/`AuthUserFile` directives at all. `tree.html:8` is `<meta name="robots" content="index, follow" />` — actively indexable.
- **Why this is Low, not higher**: I read `tree.html` in full and it currently contains **zero genealogy data** — it's a stale duplicate of the portfolio homepage (same `<title>John Crawford | Instructional Design...`, same `skills`/`projects`/`testimonials`/`creds` arrays as `index.html`). The actual "family history" front door is `genealogy.html`, which has `<meta name="robots" content="noindex, nofollow" />` (`genealogy.html:8`) and is itself just a static "request access" gate card with no embedded family data, dates, or names — nothing sensitive is present at either URL today.
- **Remediation**: Before any real genealogy content (or a `crawford_tree.ged` file) is ever placed at `tree.html`, deploy one of the prepared `.htaccess` templates first. As-is, this is a "loaded gun with no bullets" — fix before it becomes a real exposure, not urgent today.

### L3. `back/index.html` and `tfg/index.html` are old/alternate builds left publicly reachable
- **What**: `back/index.html` (405 KB) is a near-duplicate of the live `index.html` (427 KB) — an older snapshot, publicly reachable at `/back/` with no robots exclusion checked. Same for `tfg/index.html`. Quick pass only — no `eval`/`innerHTML`/`document.write`/`fetch` hits in either.
- **Exploit scenario**: No active vulnerability found; the concern is purely stale-content/attack-surface hygiene (an old build could reference a deprecated endpoint or contain since-fixed info).
- **Remediation**: Low priority — `noindex` these paths or remove if truly unused.

---

## Informational (non-issues confirmed by code reading — reported so they aren't re-chased later)

- **`dangerouslySetInnerHTML` in `hrt/index.html` (lines 1656, 2095, 2490, 2503, 2630) is not attacker-reachable.** Traced both call sites: `W.svg(k, p)` / `W.svg(x[1], p)` (plate/SVG generation) and `sageSVG(props.size)` (avatar). Grepped the whole file for `URLSearchParams`, `location.search`, `location.hash` — **zero matches**. The page reads no URL parameters at all; `k`/`x[1]`/`meta.key` all trace back to the hardcoded local species/geometry data, and `sageSVG`'s only input is a numeric size used in width/height attributes. No other hrt page (`field.html`, `case-study.html`, `sheets.html`, `worksheet.html`, `houseplants.html`, `review.html`, `capture.html`) uses `dangerouslySetInnerHTML` at all. This is a non-issue.
- **`hrt/api/hrt-admin.php` file-upload path is solid.** Server-side MIME sniffing via `finfo` (not trusting client-supplied `Content-Type`) at line 185-190; extension is derived from the sniffed MIME, not client input; upload filenames are always server-generated (`bin2hex(random_bytes(16))`, line 201) — client-supplied names never touch the filesystem; a strict allowlist regex `^[a-f0-9]{32}\.(jpg|jpeg|png|webp)$` (line 76, `safeInboxName()`) gates every filename that's read back from the inbox, closing path traversal; `$_POST['id']` in the publish action is validated against `loadSpeciesIndex()` (line 249-250) — an unknown id is rejected — and `$_POST['view']` is checked against a fixed enum (`VIEWS`, line 42, 247) before being used to build the output filename (line 257). Size is capped at 20 MB (line 37, 183) and uploads are rate-limited to 40/hour/IP (line 36, 85-100, 177). This is a well-built endpoint.
- **`api/email-capture.php` mail() usage is safe from header injection.** `Reply-To` is built from user-supplied `$email` (line 179), but `$email` is validated with `filter_var(..., FILTER_VALIDATE_EMAIL)` (line 91) before that point, which rejects the CR/LF sequences a classic header-injection payload needs. `$name` is length- and character-restricted (`[<>{}\\\\]` rejected, line 99). `$source` is restricted to `[A-Za-z0-9_-]` (line 104). Honeypot (line 82-84) + per-IP rate limit (5/hour, line 112-141) cover basic spam/abuse. CORS is locked to the site's own origin (line 31, 41). No injection risk found.
- **Third-party scripts are appropriately pinned.** `index.html:37-39` loads React, ReactDOM, and Chart.js from `unpkg.com`/`cdn.jsdelivr.net` **with SRI `integrity` hashes and `crossorigin="anonymous"`** — correct practice, tampering by the CDN would be caught. The Cloudflare beacon (`static.cloudflareinsights.com/beacon.min.js`, appears across `index.html`, `hrt/*.html`, `tree.html`, `genealogy.html`, `game.html`) has no SRI hash, but that's normal/expected for Cloudflare's own auto-updating analytics snippet (Cloudflare doesn't publish a pinnable hash for it) and it's loaded as `type='module'` from Cloudflare's own domain, not a third-party CDN reseller — acceptable as-is.
- **Client-side secret grep across `index.html`, `hrt/index.html`, `learning/claude-code/*.html` came back clean.** All hits for `key|secret|token|password` were noise: React's internal `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` export, minified `password` as an HTML input-type string, "design tokens" (CSS custom properties) in `tree.html`/`back/index.html`, and course-content prose about hooks/secrets in `learning/claude-code/lessons/03-hooks.html`. No real credentials found client-side.
- **`game.html`'s leaderboard `innerHTML` render (`game.html:992-996`) is not exploitable.** `e.name` is interpolated unescaped into HTML, but tracing `S.name` (`game.html:852`) shows it's algorithmically generated as `<snack-name-from-a-hardcoded-list> + ' #' + <tag>` — there is no free-text name entry field anywhere in the page. Also worth noting: `window.storage` (the apparent shared-leaderboard backend, `game.html:768-771`) has no definition anywhere in the file, so in its current deployed state the "leaderboard" silently falls back to per-browser `sessionStorage` — it isn't even a live shared feature right now.
- **`johntcrawford-site.git/` (the deploy-webhook git receiver, gitignored, found on disk).** `.htaccess` inside that directory enforces `AuthType Digest` / `require valid-user` against `.htdigest` for the whole directory (including the `.htdigest` file itself, since Apache directory-scoped auth applies before serving any static file in-directory) — correctly configured, assuming the host's `mod_auth_digest` behaves as documented. Not part of the requested scope but flagged since it was encountered; no action needed unless you want to double check the live server enforces it the same way this local `.htaccess` describes.
- **`decoder/index.html`, `nautical-elements.html`, `tfg/index.html`**: quick pass, no `eval`, no unescaped `innerHTML`/`document.write` assignments, nothing jumped out.
- **`.htaccess` (site root) security headers are real and active**, not just templated: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and the CSP discussed above are all sent as genuine HTTP headers (`Header always set ...`), correctly noting in a comment that the meta-tag equivalents in the HTML are ignored by browsers for `frame-ancestors`/`X-Content-Type-Options`/`Permissions-Policy`. `display_errors off` / `log_errors on` prevents PHP error leakage. This file was read in full — nothing unused or contradictory found.

---

## Coverage note

Deep-read: `deploy.php`, `hrt/api/hrt-admin.php` (full, including the gitignored live version), `api/email-capture.php`, `.htaccess`, `hrt/capture.html` and `hrt/review.html`'s key/fetch call sites, `hrt/index.html`'s `dangerouslySetInnerHTML` call sites and their data sources, `genealogy.html` (full), `tree.html` (structure/data-source check).
Lighter pass: `hrt/field.html`, `case-study.html`, `sheets.html`, `worksheet.html`, `houseplants.html` (grepped for the same sink patterns, no hits), `learning/claude-code/index.html` + all 7 lesson pages (grepped for secrets/eval/innerHTML, clean).
Quick sanity only: `game.html` (one finding chased down and ruled out), `decoder/index.html`, `nautical-elements.html`, `tfg/index.html`, `back/index.html`.
Not in scope / not reviewed: `_course-builder/`, `games/`, build/convert scripts (`build-photos.js`, `convert-heic.py`, etc.) — these are local tooling, not served endpoints.
