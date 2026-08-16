# CLAUDE.md — Woody Ornamentals

Context for Claude Code working in `/hrt`. Read this before touching anything.

---

## What this is

An offline plant-identification trainer covering **121 woody ornamental species** of
Maryland and the mid-Atlantic, built from a 1988 Prince George's Community College
course (HRT 116, *Woody Ornamental Plants*).

Deployed at `https://johntcrawford.com/hrt/`, linked from the site's `#projects`
section.

Two branches: a **narrated lesson track** at three depths, and a **scored
identification trainer**. Around them sit a field-capture tool, a photo review
bench, specimen sheets, and four Node build scripts.

**Every illustration is generated, not drawn.** A plant is a spec object; the plate
is a render. 121 species × 4 views = **484 plates**, none of them artwork.

---

## Hard constraints — do not violate

These are standing project doctrine, not preferences. If a change would break one,
stop and say so rather than working around it.

| Constraint | Detail |
|---|---|
| **Single-file HTML** | No npm, no bundler, no build step, no framework |
| **React 18 UMD, inlined** | Extracted from the npm tarball and embedded. Never a CDN `<script src>` |
| **No external requests** | The one exception is `photos.js`, added deliberately with an `onerror` guard |
| **sessionStorage only in the trainer** | Never `localStorage`. See the IndexedDB exception below |
| **WCAG 2.2 AA** | Non-negotiable. Every plate carries a text description; see the alt-text contract |
| **44 px minimum targets** | `--tap: 44px`, applied everywhere |
| **`prefers-reduced-motion`** | Guard on every animation |
| **Maryland flag palette** | Gold `#EAAA00`, navy `#0F1B2D`, red `#CE1126` |
| **Mobile-first** | Nothing under 12 px, safe-area insets, no nested scroll regions |

**The IndexedDB exception.** `field.html` and `review.html` store photo blobs, which
sessionStorage cannot hold (string-only, ~5 MB cap) and which must survive a tab
close. Both carry a source comment explaining this. Do not "fix" it back to
sessionStorage — that would silently destroy a morning's fieldwork.

---

## File map

```
index.html          302 KB  trainer + learn branch. The main artifact
field.html           91 KB  mobile field capture, GPS goals, ZIP export
review.html         107 KB  photo identification bench, resize + EXIF strip
sheets.html          86 KB  specimen sheets — photos beside plates
worksheet.html       14 KB  sourcing worksheet, rendered
case-study.html      14 KB  build notes, public-facing
og-image.png        135 KB  1200×630 social card, generated from the plate library

build-photos.js       5 KB  ingest photos into a photos.js sidecar
verify-photos.js      5 KB  licence + reachability audit, exits non-zero on failure
scan-images.js       13 KB  scan local drives for candidate images, hand-rolled EXIF reader
photos-manifest.json 25 KB  121 entries, src fields intentionally blank

PHOTO-SOURCING.md          which 30 photographs are worth taking, and why
FIELD-PLAN.md              capture routes and seasons, scoped to Odenton 21113
```

`photos.js` and `photos/` do not exist yet. They are produced by `review.html` or
`build-photos.js` and dropped in.

---

## index.html internal structure

Nine script blocks, **in this order**. Order matters — later blocks read globals set
by earlier ones.

| # | Block | Notes |
|---|---|---|
| 0 | boot shim | |
| 1–2 | React 18.3.1 + ReactDOM UMD | inlined, ~143 KB combined. Never edit |
| 3 | **SVG generators** (34 KB) | `WOODY.svg(kind, plant)` → SVG string |
| 4 | **Specimen data** (40 KB) | `WOODY.PLANTS`, 121 records |
| 5 | photo + narration slots | `WOODY.PHOTOS = {}`, `WOODY.NARRATION = {}` |
| — | `<script src="photos.js">` | external sidecar, `onerror` guarded |
| 7 | **Learn branch** (29 KB) | tracks, audio engine, slideshow |
| 8 | **App + engine** (38 KB) | grading, question construction, React UI |

Everything is `var`-scoped inside IIFEs writing to `window.WOODY`. No modules.

### Editing safely

After **any** edit to `index.html`, run this. It catches the failure mode that
matters — a syntax error inside one block, which silently kills the page:

```bash
node -e "
const fs=require('fs');const h=fs.readFileSync('index.html','utf8');
const b=h.match(/<script>([\s\S]*?)<\/script>/g).map(s=>s.replace(/^<script>|<\/script>\$/g,''));
b.forEach((x,i)=>{try{new Function(x);}catch(e){console.log('FAIL block',i,e.message);}});
console.log(b.length,'blocks parse');"
```

Prefer surgical `str_replace` over regenerating a block. These files are large and a
full rewrite loses hand-tuned values.

---

## The data model

### Specimen record

```js
{
  id: 'que-alb',                     // stable slug, used everywhere
  latin: 'Quercus alba', common: 'White oak', fam: 'Fagaceae',
  tier: 2,                           // 1 distinctive · 2 moderate · 3 confusable
  leaf: { arch, prof, margin, ven, arrangement, len, wide,
          lobes, sinus, leaflets, needles, pointed, variant },
  bark: { pattern },
  form: { silhouette },
  repro: { type },
  syn: ['tulip poplar', ...],        // optional, 54 species carry these
  conf: ['que-rub','que-pal',...]    // confusable partners, drives distractors
}
```

### Generator vocabularies

Only these values render. Anything else falls through to a default.

- **leaf.arch** (14) — `simple bipinnate cordate fan lobedPalmate lobedPinnate mitten
  needleFascicle needleSingle palmateCompound pinnateCompound scaleFrond spinose trifoliate`
- **bark.pattern** (11) — `blockyPlate exfoliatingCurl fibrousShred furrowedRidge
  lenticelBand mottledPatch shaggyStrip smoothGray smoothMuscled warty winged`
- **form.silhouette** (12) — `arching columnar groundcover irregular mounded pyramidal
  rounded spreading upright vase vine weeping`
- **repro.type** (17) — `achenePlume acorn berryCluster capsuleSpiny capsuleWoody catkin
  cone drupeCluster flowerHead follicleCone legumePod none nutHusk panicle pome
  samaraPair samaraSingle`

### Adding a species

1. Add the record to block 4, with `conf` partners both ways.
2. Add matching entries to `field.html`'s `GEO` table (block 1) — it carries `r` (province
   letters `CPBVG`), `s` (`w` wild / `p` planted / `b` both / `c` collection), `hab`, plus
   duplicated `arr`, `arch`, `bark`, `repro`, `tier`, `conf` for the quest engine.
3. Add to `SPECIES` in `field.html`, `review.html`, `sheets.html` if the index is embedded there.
4. Re-run the plate sweep below.

**Data lives in more than one file.** There is no shared module — that is the cost of
the single-file constraint. Grep the id across `*.html` before assuming one edit suffices.

---

## Verification recipes

These caught real bugs during the build. Use them.

**Render every plate** — catches NaN paths and degenerate geometry:

```bash
node -e "
global.window={};const fs=require('fs');
const h=fs.readFileSync('index.html','utf8');
const b=[];let m,re=/<script>([\s\S]*?)<\/script>/g;while((m=re.exec(h)))b.push(m[1]);
eval(b.find(x=>x.includes('CYANOTYPE PLATE GENERATORS')));
eval(b.find(x=>x.includes('SPECIMEN REGISTER')));
const W=global.window.WOODY;let bad=0;
W.PLANTS.forEach(p=>['leaf','bark','habit','repro'].forEach(k=>{
  const s=W.svg(k,p);
  if(/NaN|undefined/.test(s)||s.length<200){bad++;console.log('FAIL',p.id,k);}}));
console.log('plates clean:',W.PLANTS.length*4-bad,'/',W.PLANTS.length*4);"
```

**Visual QA.** Rasterize a contact sheet and actually look at it — `pip install
cairosvg --break-system-packages`, then compose the plates into one SVG and convert.
Three real morphology bugs were found this way and by no other means: palmate leaves
collapsing into rosettes, opposite pairs colliding across the twig, and an inverted
lobe exponent that made red oak and pin oak render identically.

**Name-index safety** — every indexed name form against every species; must be zero:

```bash
# see the grade() / NAME_INDEX section in block 8
# 35,574 pairs checked, 0 wrong accepts as of the last run
```

**Broken links:**

```bash
python3 -c "
import re,os
for fn in [f for f in os.listdir('.') if f.endswith('.html')]:
    h=open(fn,encoding='utf8').read()
    for l in set(re.findall(r'href=\"\./([^\"#?]+)\"',h))|set(re.findall(r\"href: '\./([^']+)'\",h)):
        if l and not os.path.exists(l): print(fn,'->',l)"
```

---

## Accessibility contract

**The alt-text rule is load-bearing, not cosmetic.** A visual identification test
where the alt text names the species hands every screen-reader user the answer. So
descriptions are generated from the morphology spec and never mention the taxon:

> *"Foliage specimen: a pinnately lobed blade with sinuses cut toward the midrib,
> roughly 4 lobes, forward-pointing saw teeth, pinnate venation. Leaves borne singly,
> staggered along the twig."*

Same information a sighted learner reads off the plate. Zero taxonomic leak. Any new
visual content must follow this — including photographs, which take a
morphology-derived alt string, not a caption.

Other standing requirements: `aria-live="polite"` on verdicts, focus moved to the
verdict heading on answer, `role="progressbar"` with live values in the lesson,
nothing autoplays (WCAG 1.4.2), auto-advance is always pausable (2.2.2), and voice-over
defaults **off** so screen-reader users don't hear every slide twice.

---

## Photo pipeline

Photographs are optional throughout. With no sidecar, everything runs on drawn plates.

```
camera / archive
   │
   ├─ field.html    capture in the field, GPS-derived goals, ZIP export
   ├─ scan-images.js  find candidates on local drives (text + EXIF only)
   │
   └─ review.html   ← the identification bench
        resize to 1600 px · strip EXIF · confirm species against the drawn plates
        exports: photos/<id>-<view>.jpg  +  photos.js  +  manifest fragment
             │
             └─ upload to /hrt/ → index.html and sheets.html pick it up automatically
```

`build-photos.js` and `verify-photos.js` are the Node path for the same thing. Run
verify before build; it exits non-zero on a blocked licence, a missing credit, or a
dead URL. `build-photos.js` also has a third mode, `--local` — same `./photos/`
directory and `<id>-<view>.jpg` discovery as its default LOCAL mode, but it emits
`{src, credit, license}` objects with a same-origin relative path instead of
base64-inlining, for when the photo count grows past what's comfortable to inline
into one `photos.js` (default mode's `WARN_BYTES`/`WARN_TOTAL` budget).

`convert-heic.py` sits in front of all of this: iPhones shoot HEIC, browsers can't
read it, and `review.html`'s file picker only accepts JPEG/PNG/WebP. Run it to
convert everything in `./images/` to JPEG in `./review-inbox/` (auto-oriented,
resized to a 1600 px long edge, EXIF/GPS stripped) before loading photos into the
review bench. It's a build-time tool (`pillow-heif` + system Pillow), not part of
any deployed HTML file.

### Licence rules, enforced by `verify-photos.js`

- **CLEAN** — public domain, PD-USGov, CC0. USDA ARS / PLANTS / NRCS
- **ATTRIB** — CC BY. Fine, credit goes in the manifest
- **VIRAL** — CC BY-SA. Share-alike propagates to the whole project. Avoid
- **BLOCKED** — CC BY-NC, "educational use only", Bugwood / Forestry Images / IPM.
  Never, especially not in anything touching DoD work

---

## Deliberate non-features

Do not "fix" these. Each is a considered decision.

- **`src` fields in `photos-manifest.json` are blank.** Confirming that a photograph
  really is *Ostrya* and not *Carpinus* cannot be automated, and a misidentified image
  in an ID trainer teaches the error. Blank beats guessed.
- **Nothing identifies plants from pixels.** `scan-images.js` matches text and metadata
  only, and says so in its own output.
- **Ambiguous common names are rejected, not resolved.** `beech`, `ironwood`, `holly`,
  `willow` each belong to more than one species on the list. The tool names both and
  explains why the binomial exists.
- **"Sycamore" is not accepted for *Platanus × acerifolia*.** That is *P. occidentalis*.
  Accepting it would teach an error.
- **The 1988 species list is preserved as taught**, including eleven species now
  regulated or discouraged in Maryland. Current status is flagged in the verdict rather
  than the species being removed.

---

## Current state

**Done.** 121 specimens, 484 plates, learn branch (3 tracks, 28 slides, 53 exhibits,
speechSynthesis narration, Web Audio ambience), practice mode (evidence-economy
scoring, comparison mode, synonym-tolerant grading, Latin-only option), field capture
with a GPS-resolved province model and an 8-rung goal ladder, review bench, specimen
sheets, four build scripts, full cross-linking, JSON-LD and social metadata.

**Open.**

1. **94 iPhone photographs are converted and staged**, not yet identified. `HEIC`
   originals in `images/` have been run through `convert-heic.py` into
   `review-inbox/` — 94 JPEGs, EXIF/GPS stripped, resized to a 1600 px long edge.
   Species identification through `review.html` is still pending; that manual pass
   is what turns `review-inbox/` files into `photos/<id>-<view>.jpg`.
2. **Learn-slideshow exhibits and prose-page illustration** are specified but not wired;
   they were deferred until real images exist.
3. **`woody-ornamentals-trainer.html`** may still be on the server. It is a stale
   duplicate of `index.html`. Delete it.
4. The province model in `field.html` is Maryland-tuned. Extending beyond the state
   means extending `FALL_LINE` — five coordinate pairs at the top of the quest engine.
5. **`build-photos.js --local`** now exists for when the photo count grows past what's
   comfortable to base64-inline into one `photos.js` — same `./photos/` source, but
   referenced by relative path instead of inlined. Worth revisiting once the 94
   staged photographs above are identified and land in `./photos/`.

---

## Working style

- Surgical `str_replace` over regeneration. Batch related edits.
- Complete, deployable files — no scaffolding, no placeholders.
- Flag regressions and WCAG violations immediately and unprompted.
- Assume live testing and iteration on the other end.
- Verify with the recipes above rather than asserting something works.
