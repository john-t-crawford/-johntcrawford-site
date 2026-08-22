# johntcrawford.com — Brand Kit (Internal Reference)

Honest inventory of visual systems currently in the codebase, as of 2026-08-22. Research/documentation only — nothing here was applied to site files. Re-open and re-audit this file rather than trusting memory as the site evolves.

Repo root: `C:\dev\www-root`

---

## Color systems found

### 1. Main site — `index.html`

CSS vars defined ~line 56-60. Light mode default, dark mode via `[data-dark="true"]` (~line 60).

| Variable | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#F7F4EE` | `#0F1B2D` | page background |
| `--bg2` | `#EDE9E0` | `#162236` | section alt background |
| `--fg` | `#111111` | `#F7F4EE` | primary text |
| `--fg2` | `#4A4035` | `#C8B99A` | secondary/muted text |
| `--accent` | `#B87D00` | `#F0A500` | gold accent — labels, links, highlights |
| `--accent-light` | `#FEF3D0` | `#2A1F00` | accent tint background (tags, chips) |
| `--cta` | `#CE1126` | `#CE1126` (dark redefines to `#E8253D` in some later blocks — see note) | primary CTA red |
| `--border` | `#D5CEBC` | `#243450` | hairlines, card borders |
| `--card` | `#FFFFFF` | `#162236` | card surface |
| `--serif` | `'DM Serif Display', Georgia, serif` | — | headings |
| `--sans` | `'Plus Jakarta Sans', system-ui, sans-serif` | — | body/UI |
| `--mono` | `'DM Mono', 'Courier New', monospace` | — | labels, stats, badges |

**Second, parallel gold palette in the same file** (line 55, inside a JTC-stack widget block): `--md-gold:#F0A500; --md-gold-light:#FEF3D0; --md-gold-dim:#B87D00; --md-red:#CE1126; --md-red-light:#FCEAEC; --md-black:#111111; --md-navy:#0F1B2D; --md-white:#F7F4EE;` — these are **exact duplicates** of the dark-mode `--accent`/light `--accent`/`--cta`/`--fg`/`--bg` values, just renamed with an `md-` prefix and hardcoded rather than reusing the existing tokens. Used by `.jtc-card[data-badge="new"]` and `.project-card[data-accent]` (index.html:172, 189).

Icon components (`IconCapella`, `IconGoogle`, `IconMicrosoft`, `IconArticulate`, ~index.html:451-454) hardcode their own local constants: `const G="#F0A500", GL="#FEF3D0";` (index.html:449) — again identical to dark-mode `--accent`/`--accent-light`, not read from the CSS custom properties (icons are plain SVG via `React.createElement`, so they can't use `var()` for fill unless passed through inline style, hence the JS constants — but the duplication of the literal hex is still worth naming).

### 2. hrt plant-ID trainer — `hrt\index.html`

CSS vars defined ~line 45-61. Single dark "field notebook" theme (a `:root` light-adjacent override exists at line 390 for a few text tones only, not a documented dark/light switch like the main site).

| Variable | Value | Used for |
|---|---|---|
| `--ground-deep` | `#0A1626` | page background |
| `--ground` | `#0F2A47` | mid-tone panel |
| `--ground-lift` | `#16406B` | hover/lift surface |
| `--print` | `#E8F1FA` | primary text (near-white blue) |
| `--print-dim` | `#9FC0DC` | secondary text |
| `--print-faint` | `#5C87AD` | tertiary/label text |
| `--gold` | `#EAAA00` | accent — correct answers, CTAs, links, masthead em |
| `--gold-deep` | `#8A6500` | dimmer accent (blockquote rule, etc.) |
| `--rule-firm` | `rgba(159,192,220,.55)` | borders |
| `--red` / `--red-lift` | `#CE1126` / `#FF5C6E` | error/incorrect state |
| `--green-lift` | `#7FD8A0` (houseplants.html only) | success state |
| `--serif` | `Georgia, "Iowan Old Style", "Palatino Linotype", ... serif` | headings, latin names |
| `--sans` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | body/UI |
| `--mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, ... monospace` | labels, stats, meta |

### 3. Claude Code course — `learning\claude-code\index.html` + `lessons\*.html`

**Finding: this is NOT a third independent system.** Its CSS vars (index.html:29,33; lessons/01-slash-commands.html:24,28) are byte-identical to the main site's: `--bg:#F7F4EE`/`#0F1B2D`, `--accent:#B87D00`/`#F0A500`, `--serif:'DM Serif Display',Georgia,serif`, `--sans:'Plus Jakarta Sans',...`, `--mono:'DM Mono',...`. It also carries its own `--cta` value that drifted slightly (dark mode `--cta:#E8253D` directly, vs. main site's dark mode which keeps `--cta:#CE1126` and only redefines to `#E8253D` in a later cascade layer — worth a visual diff to confirm which red actually renders where).

So in practice there are **two** color systems, not three: **main-site/course** (shared, gold `#B87D00`/`#F0A500`) and **hrt** (its own navy/gold `#EAAA00`).

### Near-duplicates worth unifying

| Pair | Values | Where |
|---|---|---|
| Main-site dark accent vs. hrt gold | `#F0A500` vs `#EAAA00` | index.html:60 / hrt/index.html:52 — visually almost the same amber, different hex, different files |
| Main-site `--md-gold` vs `--accent` (dark) | `#F0A500` = `#F0A500` | Literally the same value under two variable names in the same file (index.html:55 vs 60) |
| Main-site `--md-gold-dim` vs `--accent` (light) | `#B87D00` = `#B87D00` | Same file, same story (index.html:55 vs 56) |
| Icon-component gold constant vs CSS var | `G="#F0A500"` (index.html:449) vs `--accent` dark (index.html:60) | Same value, hardcoded separately because icons are inline SVG JS, not CSS |
| Main site `--cta` vs course `--cta` (dark mode) | `#CE1126`/possible `#E8253D` cascade vs `#E8253D` direct | index.html dark-mode red handling vs learning/claude-code/index.html:33 — needs a rendered check, values may not actually match in practice |

---

## Typography

| System | `--serif` | `--sans` | `--mono` |
|---|---|---|---|
| Main site (`index.html`) | `'DM Serif Display', Georgia, serif` | `'Plus Jakarta Sans', system-ui, sans-serif` | `'DM Mono', 'Courier New', monospace` |
| Course (`learning/claude-code/*`) | `'DM Serif Display', Georgia, serif` | `'Plus Jakarta Sans', system-ui, sans-serif` | `'DM Mono', 'Courier New', monospace` |
| hrt trainer + all 7 satellite pages | `Georgia, "Iowan Old Style", "Palatino Linotype", ... serif` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | `ui-monospace, SFMono-Regular, Menlo, Consolas, ... monospace` |

**Verdict: two genuinely different type systems, not three, and not accidentally identical.** Main site + course both load a webfont trio (DM Serif Display / Plus Jakarta Sans / DM Mono) — intentional shared branding, confirmed byte-identical across every file that defines it. hrt deliberately uses a **system-font-only stack** (Georgia/system-ui/ui-monospace, no webfont loads) — this reads as a real, purposeful choice (offline-first field tool, no FOUT/network dependency) rather than drift. Two of hrt's satellite pages (`case-study.html`, `worksheet.html`) never define `--serif` at all — they don't use serif type, so there's nothing broken, just a narrower type role set on those pages.

---

## Recurring visual motifs

| Motif | Where it appears | Notes |
|---|---|---|
| **Sage leaf-pair badge** (`sageSVG`/`SageAvatar`) | hrt/index.html:1639 & 2613 (defined twice in the file — see Simplification below), used at hrt/index.html:2066, 2689 | A small mascot avatar: a stem with 3 stacked leaf-pairs, the topmost pair rendered in gold (`#EAAA00`) |
| **Maryland state-outline masthead + gold leaf marker** | hrt/index.html:2669 `MarylandMark()`, styled `.md-mark` (hrt/index.html:129-139) | New addition: draws MD outline at full opacity plus PA/VA/WV/DE/DC neighbors at 50% opacity (real Census boundary data, not stylized), then stamps Sage's exact top-leaf-pair path (hardcoded, index.html:2677-2678) at Annapolis in gold. **This is the site's clearest working example of intentional visual repetition** — the same leaf shape used for the mascot is reused as a map pin, tying the two together without inventing a new icon. Worth leaning into further per the site owner's stated direction. |
| **JTC monogram** | Main site: `.about-photo` medallion (index.html:599, `aria-label="JTC medallion logo"`) and `.t-avatar` testimonial-card initials badge (index.html:637, renders literal text "JTC") | Two different renderings of the same three letters — one is an image/graphic medallion, the other is a plain text-in-circle avatar. Same identity mark, two visual treatments. |
| **Credential icon set** (Capella/Google/Microsoft/Articulate) | index.html:451-454, `credIconComponents` map at index.html:455 | All four share the same 64×64 viewBox, same two-tone (`G`/`GL`) fill convention, same stroke-width vocabulary — a consistent icon "family" even though each pictogram is different. |
| **Gold accent + serif italic for emphasis** (`h1 em`, `.section-title em`) | Main site (index.html:113,122) and hrt (hrt/index.html:122, and all 6 satellite pages' `h1 em`) | Both systems use an italic `<em>` in headings colored with the accent gold — same rhetorical/typographic device reused across both color systems, just with each system's own gold. |

---

## Simplification opportunities

- Collapse `--md-gold` / `--md-gold-light` / `--md-gold-dim` / `--md-red` / `--md-red-light` / `--md-black` / `--md-navy` / `--md-white` (index.html:55) into direct references to the existing `--accent` / `--accent-light` / `--cta` / `--fg` / `--bg` tokens — they are byte-identical values, just re-declared under a second name.
- The icon-component color constants `G="#F0A500", GL="#FEF3D0"` (index.html:449) duplicate the dark-mode `--accent`/`--accent-light` values as JS literals. Not fixable with a CSS var directly (inline SVG fill props), but worth a comment noting they must be kept in sync manually, or converting to a single exported JS constant shared by all four icon functions (already true) and documented as "mirrors dark-mode accent."
- hrt's `#EAAA00` and main site's `#F0A500` are two different gold accents ~10% apart in hue/saturation. If a shared "JTC gold" token is ever wanted across properties, this is the pair to reconcile — but see "What NOT to change" below.
- `sageSVG()` is defined twice in `hrt/index.html` (line 1639 and again at line 2613) with presumably identical bodies — worth confirming both copies stay in sync, or deduplicating to one function.
- Main site and course (`learning/claude-code/`) already share one font/color system exactly — no action needed there, but it's worth documenting explicitly (this file) so future edits to one are known to double as edits to the "canonical" palette both consume.
- Two hrt satellite pages' dark-mode `--cta` handling for the course differs slightly from the main site's (`#E8253D` direct vs. cascade-dependent) — worth a rendered side-by-side check to confirm they actually paint the same red before assuming this is a duplicate to merge.

---

## What NOT to change

- **hrt's navy/gold palette is deliberately distinct from the main site's cream/gold palette.** hrt is a "field notebook"/plant-ID tool with a dark, high-contrast, print-adjacent feel (`--ground-deep`, `--print` naming itself evokes a field journal). The main site is a bright portfolio. Different products, different moods — this is a feature, not drift.
- **hrt's system-font stack (Georgia/system-ui/ui-monospace) vs. main site's webfont stack (DM Serif/Plus Jakarta/DM Mono) is intentional**, not an oversight — hrt is built to work offline in the field with zero network font loads.
- **All 7 hrt satellite pages (`capture`, `case-study`, `field`, `houseplants`, `review`, `sheets`, `worksheet`) reuse hrt's exact color values with zero drift** — every `--gold`, `--ground-deep`, `--print*` value checked matched hrt/index.html precisely. No hex-value cleanup needed here; the copy-paste-per-page approach has NOT caused color drift so far, only a couple of pages simply omit unused type roles (no `--serif` var where no serif text is used).
- None of the satellite pages carry the `MarylandMark`/masthead treatment — only hrt/index.html has it. That reads as intentional (it's a "trainer home" flourish, not needed on every worksheet/utility screen) rather than an inconsistency to fix.
