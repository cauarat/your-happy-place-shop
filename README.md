# Welcome to your Lovable project

TODO: Document your project here

## Image studio

Product photos arrive on whatever the brand shot them against — a grey sweep, a
warm seamless, occasionally a room. The catalogue tile is `#FFFFFF`, so anything
else reads as a rectangle floating behind the product. The studio cuts the
background out and leaves a transparent WebP, which sits on the shop's white
without any blend-mode trickery.

Two places use it:

- **`/admin/studio`** — measures every photo in the catalogue, sorts by how far
  its background sits from white, and cuts out the ones past a threshold you set
  with a slider. Clean results are kept automatically; doubtful ones stop for a
  look.
- **The toggle on a product page** — the same engine for one photo, with a
  before/after preview before anything is written.

### How a cut-out is made

`src/lib/imageStudio/` — the steps are separate files because they are separately
arguable, and all the pixel work is pure functions over typed arrays, so it is
tested without a browser.

| | |
|---|---|
| Read the background off the border ring | [`analyze.ts`](src/lib/imageStudio/analyze.ts) |
| Build the mask — flood fill or neural | [`mask.ts`](src/lib/imageStudio/mask.ts), [`neural.ts`](src/lib/imageStudio/neural.ts) |
| Rebuild the edge and unmix it | [`matte.ts`](src/lib/imageStudio/matte.ts) |
| Decide whether to trust the result | [`quality.ts`](src/lib/imageStudio/quality.ts) |
| Decode and encode | [`encode.ts`](src/lib/imageStudio/encode.ts) |

A flat studio sweep is keyed by flooding inward from the border, which is exact
where a model is approximate — and safe for a white shirt on a white backdrop,
because the fill can only reach what touches the edge. Everything else goes to
the neural model.

Then the part that matters most. `removeBackground()` from the library writes the
mask into the alpha channel and stops, which leaves every edge pixel still
holding a blend of the product and the backdrop — put that on white and the grey
comes with it, drawn as an outline around the piece. Instead the edge is reopened
as undecided, each pixel's coverage is read from how far it sits between the
background and the product colour beside it, and then the backdrop is solved back
out: `F = (C - (1-a)B) / a`.

The colour is sampled from the *nearest* solid pixel, not an average. Averaging
over a window ruins hair — a window across fine strands takes in as much of the
gaps as the strands, the foreground reads halfway to the backdrop, and every
strand comes out half covered and combed away.

Nothing is saved without being scored first. A mask that kept 97% of the frame
found no background; one that kept 2% ate the product. Both are rejected rather
than written over a photo that was fine, which is the failure that matters,
because it is silent.

### Running a batch

Needs Cloudflare R2 configured — without it `uploadToR2` falls back to a base64
data URL, and a few hundred of those in `localStorage` overflow the quota and
take the catalogue with them. The studio refuses to start and says so.

Results reach `localStorage` only, which is one browser's copy and is wiped when
`CATALOG_VERSION` moves. **Export catalog.json**, replace
[`src/data/catalog.json`](src/data/catalog.json), and bump `CATALOG_VERSION` in
[`store.ts`](src/lib/store.ts) to make a run permanent.

## Importing a crawl

New products can be added from a [Firecrawl](https://firecrawl.dev) crawl
instead of being typed into the admin one at a time.

```sh
npm run catalog:import -- --url=https://shop.com/products/x --dry-run
npm run catalog:import -- --url=https://shop.com/collections/bags --max-pages=40
npm run catalog:import -- --yupoo=https://supplier.x.yupoo.com/albums
npm run catalog:import -- --dry-run     # an export already on disk
npm run catalog:import -- --limit=3     # a trial run of three products
```

**From a link.** `--url` crawls the page itself, through the Firecrawl API, and
imports what comes back. A link that looks like a single product is scraped as
one page; anything else — a category, a whole shop — is crawled, capped at
`--max-pages` (default 50, and each page costs a credit). `--scrape` and
`--crawl` override the guess. Needs `FIRECRAWL_API_KEY` in `.env`, without a
`VITE_` prefix — that prefix is what would publish the key in the browser bundle.

**From a Yupoo album site.** `--yupoo=https://<supplier>.x.yupoo.com/albums`
reads a supplier's whole album wall — every album, its photos and the category
it was filed under — over plain HTTP, with no API and no credits. Yupoo is a
photo host rather than a shop, so there is no structured product data on it at
all; what it has is read directly in
[`src/lib/crawlImport/yupoo.ts`](src/lib/crawlImport/yupoo.ts) and handed to the
importer as though a crawler had extracted it.

Three things about these sites are worth knowing, because each one costs a
product if it is missed. Every picture is written into an album page three times
over — the gallery's `big`, a `medium` copy and a `square` thumbnail — so only
the gallery tags are read and the sizes normalised, or one photo becomes three.
The categories overlap heavily, the same t-shirt sitting in ALL BLANKS, in
PREMIUM COLLECTION and in T-SHIRT, so an album is filed under a category the
catalogue already uses in preference to one it does not, and under the smaller
of two equals. And the photos are served only to a request that came from the
album site: fetch one with any other `Referer` and Yupoo answers 567.

There is no product prose on these sites — not in the album, not in the meta
description, which holds the supplier's own links, and not on the shop those
links point at. The album title carries the specification instead (weight,
material, fit), so that is what the description becomes, and the supplier's shop
rides along as a second reference link.

**From a file.** Put an export in `data/firecrawl/` (git-ignored) — a `.json`, a
`.jsonl`, or the folder of per-page files Firecrawl writes — and the importer
reads the newest thing in there unless `--in=<path>` says otherwise. Every
`--url` and `--yupoo` run saves its crawl there too, so re-importing it later
costs nothing.

It reads each page in five passes, best first: Firecrawl's own `product` format,
a schema'd `json` extraction, the page's JSON-LD, its OpenGraph metadata, then
the markdown. The `product` format is the one worth having — a deterministic
read of the shop's structured data, with the priced variants folded down into
one catalogue product: the lowest price anyone can actually pay, every image any
variant shows, and the sizes and colours as lists.

A page that yields neither a name nor an image is not a product page and is
reported as such. Neither is a category page that only the guessing layers
liked — a listing carries the shop's name in `og:title`, a tile's price in its
markdown and a grid of photos, which is enough to fool everything that infers
but nothing that reads.

Two things it does that are worth knowing:

**It speaks the catalogue's vocabulary, not the crawled shop's.** Categories and
designers are read off `src/data/catalog.json` itself and matched against it, so
an import cannot invent a second spelling of Footwear. Alias tables in
[`src/lib/crawlImport/mapping.ts`](src/lib/crawlImport/mapping.ts) are the one
place to teach it a new shop's wording. Anything it cannot place is listed in the
report as needing a look in the admin.

**It re-hosts every image on our own R2 bucket.** A crawled shop can change its
URLs, block us or disappear, and a hot-linked catalogue would go with it. Needs
the same `VITE_R2_*` variables in `.env.local` that the admin uploader uses; the
import stops if they are missing rather than falling back to base64, which would
blow the localStorage quota. `--no-images` keeps the original URLs instead.
Uploads are cached in `data/firecrawl/.image-cache.json`, so a re-run costs
nothing for images already on R2.

Running twice is safe: products already in the catalogue are matched by source
link, then by name and designer, and skipped — `--update` refreshes them in place
instead, keeping their ids so looks and orders still point at them.

### Curating what an import landed

An import lands the supplier's words faithfully, which is the right thing for an
import to do and the wrong thing for a shop window. A supplier files goods the
way its warehouse thinks — flannel shirts under SHORTS, tracksuits under PANTS, a
marketing collection used as though it were a garment type — and titles them as
specifications, in a card that shows two lines.

```sh
npm run catalog:curate -- --dry-run     # what would change, nothing written
npm run catalog:curate                  # apply it
```

The decisions live in `data/curation/*.json`, one row per product: the new name,
the department, and what each was before. The rules in
[`src/lib/curation.ts`](src/lib/curation.ts) write that table's first pass — the
department comes from the garment named last in the title, the name keeps what
tells one piece from the next and drops what they all say — and then a person
reads it and shortens what the rule could not. The table is the point: it is
reviewable in a diff, and it is what the tests assert against.

Two things the rules earn their keep on. A title naming no garment at all is not
a product — on a supplier's album site those are its notices to buyers ("How to
view inventory?"), and they arrive looking exactly like merchandise. And garment
words are matched on word boundaries, never as substrings: the first version of
this searched for plain text, `t-shirt` contained `shirt`, and every tee in the
catalogue emptied itself into the shirt department.

Every run writes `data/firecrawl/last-import-report.json`: what was created,
skipped, dropped and why, and which products need a category, a designer or a
price filled in. `--help` lists every flag.

> After a real import the script raises `CATALOG_VERSION` in
> [`src/lib/store.ts`](src/lib/store.ts) — without it no browser sees the new
> products. That reseed also **discards product edits made in the admin panel** on
> each device. `--no-bump` skips it.

### Choosing which photo leads

An imported product leads with whatever photo sat first in the supplier's album,
and a supplier orders albums for its warehouse: a flat lay, then a model wearing
the piece, then a close-up of a seam, in no particular order. On a grid that
reads as three different shops.

```sh
npm run catalog:covers -- --dry-run     # what would change, nothing written
npm run catalog:covers                  # apply it
```

Every photo of every product is measured and the best one is promoted to the
front. Only the cover moves — the rest of the gallery keeps the album's order,
nothing is uploaded, and no photo is deleted.

The judging is in [`src/lib/coverPhoto.ts`](src/lib/coverPhoto.ts), and it leans
on the image studio's [`analyzeBackground`](src/lib/imageStudio/analyze.ts) for
the measurement that matters most. The tell is not how white the background is:
a studio still and a model shoot are lit on the same grey. It is how *even* the
border ring is. A flat lay leaves the ring as pure sweep and reads near zero; a
model bleeds off the bottom of the frame, so the ring cuts through fabric and
skin and reads in the tens.

Two things worth knowing before retuning it.

**The thresholds are calibrated per supplier, not universal.** The first version
borrowed the studio's `WHITE_TOLERANCE` of 20, which was measured against the
shop's own photography. This supplier lights its stills on a grey seamless that
sits 26 to 30 from white — so the borrowed constant rejected every good photo in
the album while the model shots failed for unrelated reasons. Measure before
trusting a number that came from somewhere else.

**Measuring and judging are separate on purpose.** `measureCover` returns raw
numbers and `judgeCover` applies the thresholds, so the cached measurements in
`data/curation/.cover-scores.json` survive a change of mind: retuning a
threshold re-judges the catalogue in milliseconds instead of re-downloading it.

A product whose album is model shots end to end is left exactly as it was, and
listed in the report. Promoting one model shot over another buys nothing.

## Voice assistant

The site has a spoken assistant: it reads the tour pop-ups and the onboarding flow
out loud, and names what a shopper selects. It costs nothing to run and has no
quota, because every line is either recorded into the build or spoken on the
visitor's own machine.

### Three engines, in this order

**1. Recordings** — `public/audio/assistant/`, made with ElevenLabs at build time.
Instant, best sounding, pauses baked into the audio. This is also the only tier
that can start in the same tick as a click, which is what gets past a browser's
autoplay policy.

**2. Piper** — a neural model running in the browser via
[`@diffusionstudio/vits-web`](https://www.npmjs.com/package/@diffusionstudio/vits-web)
(MIT). Free, unlimited, private — nothing leaves the device. It is the only engine
that can say a sentence nobody recorded: a shopper's name, a category, a product.
Fetches a ~60&nbsp;MB model per language on first use, keeps it in OPFS, and never
pays for it again. The download starts only after the visitor's first interaction,
at idle, so it never competes with the catalogue for bandwidth.

**3. The browser's own voice** — `speechSynthesis`. Plainer, and different on every
device, but weighs nothing and is ready on the first line. It is what keeps the
site from being mute while Piper downloads, and on devices where it never will.

### Re-recording the fixed lines

Optional — the site works without it, the other two engines cover everything. But
the recordings sound best, so they are worth refreshing when wording changes.

```sh
npm run voice:build -- --dry-run   # what it would cost, in characters
npm run voice:build                # record what changed
npm run voice:build -- --lang=PT   # one language only
```

Needs `ELEVENLABS_API_KEY` in `.env` (git-ignored, no `VITE_` prefix — that prefix
is what would publish the key in the browser bundle). Only lines whose wording
actually changed are re-recorded, and lines no longer spoken are deleted.

### Where things live

| | |
|---|---|
| What the assistant can say | [`src/lib/voiceLines.ts`](src/lib/voiceLines.ts) |
| Choosing the engine, playback, autoplay | [`src/contexts/VoiceAssistantContext.tsx`](src/contexts/VoiceAssistantContext.tsx) |
| Piper / browser voice | [`src/lib/voiceEngines/`](src/lib/voiceEngines/) |
| Build-time recording | [`scripts/generate-voice.ts`](scripts/generate-voice.ts) |
| Mute control | [`src/components/VoiceToggle.tsx`](src/components/VoiceToggle.tsx) |

The spoken lines are not written in `voiceLines.ts` — it points at the same
translation keys the screen renders, so editing a pop-up's wording edits what the
voice says and the two cannot drift apart. Pauses are written into the cue as
numbers and performed as real waits, never as markup a model has to interpret.

### When it is silent

Run `__voice()` in the browser console. It reports whether the assistant is on,
which engine spoke last, whether Piper's model has arrived, whether a line is held
waiting for a gesture, and the last error.
