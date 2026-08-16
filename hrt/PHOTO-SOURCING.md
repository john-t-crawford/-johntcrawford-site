# Photograph sourcing worksheet

**Capture stopped being the bottleneck on 2026-08-09.** A single morning
session — 08:12 to 08:50, thirty-eight minutes — produced ninety-four
photographs, sitting now in `images/` awaiting identification. That's roughly
three images a minute of standing in front of plants with a phone. The old
framing of this document ("thirty images, not one hundred and twenty-one",
written on the assumption that sourcing meant trawling restrictive-licence
image libraries or scheduling rare field trips) was scoped to a cost that no
longer applies. Revise the ambition upward: broad coverage of most of the 121
species, not just the pairs line art can't settle, is achievable in a handful
of sessions like this one.

**What did not get cheaper: knowing what you photographed.** A phone with no
scale reference and no notes gives you a HEIC file and a timestamp — nothing
that identifies the plant. Sorting ninety-four images into species, confirming
each against a flora or herbarium record, and only then filling in a `src`
field is still a slow, one-at-a-time, un-automatable task, and it is now the
long pole in the whole pipeline. Budget for verification, not for shooting.

This worksheet still tells you what a photograph must show once you're
standing in front of the right plant. Each row below names the **view to
source** and the **character the photograph must show**. A pretty picture of
the whole tree is worthless here — if the frame doesn't resolve the character,
don't file it. That discipline applies whether you're taking three images or
three hundred.

File naming for `build-photos.js`: `<id>-<view>.jpg`, views `foliage | bark |
habit | flower | fruit`. The `<id>` is only known once verification (below)
has happened — do not guess it from a filename or shooting order.

---

## Licence policy

| Source | Status | Use |
|---|---|---|
| USDA ARS Image Gallery | Public domain | Clean. No attribution required. |
| USDA PLANTS Database | US Government work | Clean. |
| USDA NRCS Photo Gallery | Public domain | Clean. |
| Britton & Brown, *Illustrated Flora* (1913) | Public domain | Clean. Plates, not photos — excellent for fruit and habit. |
| Wikimedia Commons, PD / CC0 files | Clean | Verify the file page, not the category. |
| Wikimedia Commons, CC BY | Attribution | Fine, credit goes in the manifest. |
| Wikimedia Commons, CC BY-SA | **Share-alike** | Propagates to your file. Avoid unless you accept that. |
| Bugwood / Forestry Images / IPM Images | **Educational, non-commercial** | Do not use in anything touching DoD work. |

Your own photographs are the cleanest source of all, and Maryland has every
species on this list within an hour's drive. Shoot with a scale reference. The
2026-08-09 session is the proof: ninety-four images, one morning, zero licence
questions to resolve, because every one of them is yours outright.

Run `node verify-photos.js` before `node build-photos.js`. It fails the build on
a blocked licence, a missing credit, or a dead URL.

---

## Tier 0 — broad coverage, now that shooting is cheap

This tier didn't exist under the old thirty-image ceiling; it exists because
a 38-minute session can produce ninety-four frames. The ambition: **multiple
views — foliage, bark, and habit at minimum, flower and fruit when the
season offers them — across as many of the 121 species as opportunity
allows**, not just the confusable pairs below. A specimen sheet with three or
four confirmed photographs beside the drawn plate is a materially better
teaching artifact than the plate alone, even where line art was never
ambiguous.

Two things this tier does *not* change:

- **It doesn't outrank Tier A or B.** If a session only has time for some of
  a species list, shoot the Tier A/B targets first — they resolve characters
  the generators genuinely get wrong, which broad coverage of an unrelated
  species doesn't fix.
- **It doesn't touch the bottleneck.** Ninety-four frames from one session
  still means ninety-four rounds of "which species is this, and can I prove
  it" before a single `src` field can be filled in. Shoot broadly, but expect
  the verification queue to be the thing that actually paces this project —
  see [Verification](#verification) below, which is unchanged by any of this.

There's no fixed image count for this tier the way A/B have one — coverage
grows opportunistically, species by species, as verified photographs clear
the queue. `build-photos.js` already reports, on every run, which specimens
still have no photograph and fall back to the drawn plate — that output is
the running scoreboard for this tier, not a number fixed in this document.

## Tier A — the twelve clusters (24 images)

Still the first thing to shoot in any session, coverage ambitions aside.
These are the pairs where learners actually lose points, and drawn plates
cannot resolve them no matter how much broad coverage Tier 0 accumulates.

| # | Cluster | View | The character the photo must show |
|---|---|---|---|
| 1 | `que-rub` *Quercus rubra* vs `que-pal` *Q. palustris* | foliage | Sinus depth. Red oak sinuses cut roughly halfway to the midrib; pin oak's cut nearly to it, leaving narrow struts. Frame both blades flat. |
| 2 | `car-car` *Carpinus caroliniana* vs `ost-vir` *Ostrya virginiana* | bark | The decisive character, and drawing can't do it justice — smooth sinewy fluting versus fine shreddy strips. Trunk at close range. |
| 3 | `tax-dis` *Taxodium distichum* vs `met-gly` *Metasequoia glyptostroboides* | foliage | Needle arrangement on the twig: alternate versus strictly opposite. Macro, twig filling the frame. |
| 4 | `ile-cre` *Ilex crenata* vs `ile-gla` *Ilex glabra* vs `bux-sem` *Buxus sempervirens* | foliage | Three images. Crenate versus entire margins, alternate versus opposite arrangement. Twig tips, not hedge faces. |
| 5 | `cor-flo` *Cornus florida* vs `cor-kou` *Cornus kousa* | bark | Alligator-hide blocks versus mottled exfoliating patches. |
| 6 | `ulm-ame` *Ulmus americana* vs `zel-ser` *Zelkova serrata* | foliage | Leaf base symmetry — strongly oblique in elm, near-even in zelkova. |
| 7 | `vib-den` *Viburnum dentatum* vs `aro-arb` *Aronia arbutifolia* | foliage | Opposite versus alternate. One image of each showing a node. |
| 8 | `pin-vir` *Pinus virginiana* vs `pin-nig` *Pinus nigra* | foliage | Needle length and twist in a two-needle fascicle. Include a ruler. |
| 9 | `pic-abi` *Picea abies* vs `abi-con` *Abies concolor* | foliage | Needle cross-section and attachment: four-sided on a peg versus flat and stalkless. |
| 10 | `fag-gra` *Fagus grandifolia* vs `fag-syl` *Fagus sylvatica* | foliage | Margin — distinct teeth versus a wavy near-entire edge. |
| 11 | `leu-fon` *Leucothoe fontanesiana* vs `pie-jap` *Pieris japonica* | habit | Arching versus upright, and the terminal flower-bud clusters on pieris. |
| 12 | `sty-jap` *Styrax japonicus* vs `hal-car` *Halesia carolina* | bark | Smooth and close versus shreddy strips. |

## Tier B — where the drawing under-serves (6 images)

Characters the generators approximate rather than render.

| # | Specimen | View | Why a photograph |
|---|---|---|---|
| 13 | `ace-gri` *Acer griseum* | bark | Cinnamon exfoliation is the entire identification, and it's a colour character. |
| 14 | `bet-nig` *Betula nigra* | bark | Same — the salmon-buff curl doesn't survive monochrome line work. |
| 15 | `pla-ace` *Platanus × acerifolia* | bark | The camouflage mottle needs tonal range. |
| 16 | `lag-ind` *Lagerstroemia indica* | bark | Muscular polished trunk; the plate reads as generic mottling. |
| 17 | `car-ova` *Carya ovata* | bark | Strip length and how far the plates stand off the trunk. |
| 18 | `euo-ala` *Euonymus alatus* | bark | Corky wings on a green twig, close range. |

## Tier C — the colour set (6 images)

Previously framed as optional because a seasonal layer wasn't worth the
sourcing effort. With capture this cheap, treat it as part of Tier 0's
broad-coverage sweep instead of a separate stretch goal — shoot these
whenever the season is right, same as any other specimen. Everything here is
a colour character the cyanotype deliberately discards.

`cot-cog` smoke plume · `cal-dic` violet drupes · `ile-ver` winter fruit on bare
stems · `hyd-que` autumn foliage · `nys-syl` autumn foliage · `cer-can` bare-stem
bloom.

---

## Verification

Before a file goes in `./photos/`, confirm the species against a herbarium or
flora record — the Maryland Plant Atlas or the USDA PLANTS profile, not a
gardening blog. A misidentified photograph in an identification trainer teaches
the error, and the learner has no way to catch it. This is the one step that
cannot be automated, which is why the manifest leaves `src` blank rather than
guessing.
