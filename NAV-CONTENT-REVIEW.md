# Nav & Content Review — johntcrawford.com
Audience lens: recruiter/hiring manager, fast skim, <2 min decision to keep reading (not a client evaluating fit).
Source reviewed: `C:\dev\www-root\index.html` (nav at lines 556-560/577-581; sections at 595-682).

---

## Part 1 — Navigation Consolidation (5 → 3)

### Current merge target content (verified in file)
| Section | Lines | What's actually there |
|---|---|---|
| `#services` | 609-617 | 3 service-cards: Instructional Design (primary — h3, lead line, paragraph, 4-item bullet list, CTA "Let's Talk Training"), Web Design & Development (lead + paragraph + CTA), Video Production (lead + paragraph + CTA) |
| `#expertise` (`skills-section`) | 618-623 | 6 `SkillCard`s with animated radial-arc % + Expert/Advanced label (418), plus `ToolStack` — 8-tool grid + 3-item badge legend (419-420) |
| `#projects` | 624-627 | 3 expandable `ProjectCard`s, each with Problem/Solution/Outcome (3-step breakdown) + an interactive demo (workflow sim, a11y lab, or external game link) |

These three sections are really one story: **what I do → what I use to do it → proof I did it.**

### Candidate labels (1-3 words, ranked)
1. **The Craft** — best fit. One word, evokes skill + care without corporate flatness; naturally covers "how I do things" (skills), "what I make" (projects), and "what I offer" (services) as facets of one practice.
2. **How I Help** — warm, outward-facing, frames the section around value to the reader rather than a list of the owner's capabilities; slightly service-desk in tone.
3. **In Practice** — professional and personal at once ("practitioner" ties to instructional-design field language); a notch cooler/more neutral than "Craft."
4. **What I Build** — active, energetic, fits the web/eLearning/workflow projects well; slightly undersells "Services" (consulting-style work isn't really "built").
5. **Passion & Practice** — most literally answers the "pleasant/passionate" brief, but reads a little on-the-nose/soft for a recruiter audience skimming for signal.

**Recommendation: "The Craft."** Short enough for a 3-item nav, warmer than "Work," and it plausibly labels services, skills, and projects as one thing without stretching any of them.

### Resulting page structure under "The Craft"
1. **Intro line** (new, ~1-2 sentences) — compress the current Services heading + lead ("What I Can Do For You") into a short bridge sentence: *"I design the learning, build what delivers it, and prove it works."* Sets up the subsections below instead of launching straight into 3 full service-cards.
2. **Focus-areas strip** (replaces the 3 `service-card`s, 609-616) — condense Instructional Design / Web Design & Development / Video Production into a compact 3-up row: icon/label + one line each. Drop the per-card CTAs (614, 615 both point back to `#projects` anyway) — one CTA at the strip level is enough.
3. **Tools/skills strip** (replaces 618-623) — collapse the 6 animated `SkillCard`s + 8-tile `ToolStack` grid into a single compact pill/tag row of top tools and competencies (e.g. "Articulate 360 · Power Automate · Claude Code · WCAG 2.2 · xAPI/SCORM · Premiere Pro …"). Drop the radial-arc % + Expert/Advanced labeling — it reads as manufactured precision a fast skimmer has no way to verify and won't stop to parse.
4. **Projects grid** (unchanged, 624-627) — this is the strongest proof-of-work content; keep it last/most prominent so a scanner reaches concrete outcomes quickly rather than getting stuck in the preamble.

---

## Part 2 — Three Overload Trim Candidates

### 1. Interactive project demos (`WorkflowDemo` + `A11yLabDemo`)
**Where:** `WorkflowDemo` lines 465-508 (full SVG org-chart-style `OnboardingDiagram` + a 5-node animated "Run Simulation" sequence); `A11yLabDemo` lines 422-446 (4 independent toggles + live screen-reader-text simulation + a scrolling "xAPI statement stream" log). Both render automatically the moment a recruiter expands a project card.
**Why it slows a fast skimmer:** the card's Problem/Solution/Outcome text (517, `pbl-steps-wrap`) already states the mechanism and result in three short sentences. The demos restate the same story as an interactive widget that requires clicking through to get any value from — a recruiter has to *operate* the workflow simulation or toggle all 4 WCAG fixes to see what's already been told to them in prose. That's a 30-60s detour inside a 2-minute budget, for a payoff (a UI toy) that doesn't add new information, only production polish.
**Fix:** Keep Problem/Solution/Outcome as the primary read; put the demo behind a secondary, explicitly-labeled action inside the expanded card — e.g. a "▶ Try the live demo" button that reveals the widget only on request, instead of auto-rendering full diagram + simulation the instant the card opens. Skimmers who stop at the text get the point; only interested readers pay the interaction cost.

### 2. Resume section's three-column highlights
**Where:** `.resume-highlights`, lines 660-674 — Education (2 items), Certifications (4 items), Core Skills (6 items) = 12 restated line items.
**Why it slows a fast skimmer:** this is the fourth time overlapping identity/skill info appears on the page. About-tags (605) already flags credentials/focus; Expertise's skills grid + ToolStack (618-623) already lists the tools; the Credentials grid (639-643) already lists the *exact same four* items as Resume's Education + Certifications columns (Capella M.S., Google Cloud GenAI, Microsoft/LinkedIn AI cert, Articulate cert — verbatim match between `creds` at 456 and `rh-col` content at 663/668). A recruiter hits the same four credentials twice in two different card layouts within one scroll, plus a fourth skills recap.
**Fix:** Cut `resume-highlights` down to nothing (or a single line: "Full credentials above ↑"). Let the Resume section be exactly what its two buttons already promise — Download PDF / Print — rather than a third restatement of the same 4 credentials and 6 skills tags already shown twice above it.

### 3. Testimonials marquee — auto-scroll + generic role titles
**Where:** `.testimonials-track` (246-247, animation `t-scroll 40s linear infinite`), rendered content at 448 and 629-637. Three testimonials, duplicated to six DOM nodes for the seamless loop.
**Why it slows a fast skimmer:** the marquee is in continuous motion, competing for attention while a recruiter is trying to decide whether to keep reading — motion is genuinely hard to read/skim, not just a minor annoyance. Two of the three quotes are generic praise with no concrete claim ("has an incredible eye for design," "wonderful to work with") — low signal for the time cost of stopping the scroll (via hover) to read them. Only one quote has a concrete number ("20,000 team members into our LMS").
**Fix:** Drop the auto-scrolling marquee; show the strongest testimonial (the 20,000-LMS-import one) as a single static pull-quote, or a static 2-up row if a second is wanted. Cuts from 3 cards (6 rendered nodes) + motion to 1-2 static, readable-at-a-glance quotes.

---

## Part 3 — Other Observations
- **Embedded 310KB base64 image** (`about-photo`, line 600) makes up the large majority of this file's ~420KB weight, inlined directly in the HTML rather than referenced as a separate cacheable asset. For a fast-skimming recruiter (often on a work laptop/mobile), this is pure load-time friction before they see anything — worth moving to a real image file even outside the nav/content work.
- **Footer includes a "Family Tree" link** (`/genealogy.html`, line 686) alongside Email/LinkedIn/Learning Dashboard. Mixing a personal genealogy project into the same footer row a recruiter uses for professional contact links is an odd, slightly unprofessional note to end on.
- **Service-card depth is inconsistent**: the primary Instructional Design card (613) gets a 4-item bullet list + dedicated CTA; the other two (614, 615) get a single lead line + generic CTA. Not a major issue, but reinforces that "Services" is really "one real offer + two lighter mentions" — supports collapsing all three into the compact strip proposed in Part 1 rather than preserving three full cards.
