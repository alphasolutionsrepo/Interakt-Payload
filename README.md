# Lumen — Payload + Interakt demo

**Lumen: The Open Collection** is a fictional online art museum. Content lives in
[Payload CMS](https://payloadcms.com/) 3, which runs inside the Next.js app. Search and AI chat
from [Interakt](https://interakt.app/) come in phase 2.

It is a purely content site with no commerce. It has about 635 real artworks, each with rich
attributes for facets, plus long-form editorial content for chat.

```
Art Institute of Chicago API ──npm run data:fetch──▶ data/aic/*.json + images
data/editorial/ (stories, bios, tours…)                     │
                                                            ▼
                                  npm run seed ──▶ Payload (Postgres + /media)
                                                            │
                                   Local API ◀──────────────┘
                                       │
                          Next.js pages (/collection with facets, …)
```

## Requirements

- Node.js 20.9+ (developed on 24)
- Docker, for the local Postgres

## Setup

```bash
npm install
cp .env.example .env        # set PAYLOAD_SECRET: openssl rand -hex 32
npm run db:up               # Postgres 16 on localhost:5433
npm run data:fetch          # AIC data → data/aic/, images → data/aic/images/ (~470 MB, a few minutes)
npm run seed                # loads everything into Payload (safe to re-run)
npm run interakt:sync       # pushes all ~900 documents into the Interakt index (see below)
npm run dev                 # http://localhost:3003
```

Then open http://localhost:3003/admin and create the first admin user.

The normalized JSON under `data/aic/` is committed. On a fresh clone, `data:fetch` only has to
download the images; `--refresh` re-pulls the raw API data as well.

### Ports

- **3003** is the app. Ports 3000–3002 are used by the Interakt backend and the other CMS demos.
- **5433** is Postgres. The Interakt backend's Postgres uses 5432.

## Content

| Source | What | Licence |
|---|---|---|
| [Art Institute of Chicago API](https://api.artic.edu/docs/) | 638 public-domain artworks that have an image and a `short_description`, their artists, and 12 AIC exhibitions they appeared in | CC0 (we deliberately skip the CC-BY `description` field) |
| `data/editorial/` (written for this demo) | 18 stories, 40 artist bios, 19 movement texts, 7 tours, 4 Lumen exhibitions | Original |

Three artworks have no downloadable IIIF image. The seed skips them, which leaves 635.

### Content model

| Collection | Notes |
|---|---|
| **Artworks** | Facet fields: `department`, `artworkType`, `movement`, `subjects`, `era`, `century`, `region`, `country`, `colorFamily`, `isOnView`, `artist` / `culture`. `century` and `era` are derived from `yearStart` in a hook. |
| **Artists** | `bio` (Lexical), plus an `artworks` **join** field that lists their works. |
| **Movements**, **Subjects** | Taxonomies. Movements have a `period`, a description, and a join to their artworks. |
| **Stories** | **Drafts enabled**. The Lexical body can embed artworks with the custom **Artwork** block. `readingTime` is computed from the body. |
| **Exhibitions** | `venue` is either `lumen` (original) or `aic` (the archive of real AIC exhibitions, labelled as such). |
| **Tours** | Ordered `stops`, each an artwork plus the guide's note. |
| **Media** | Sizes `thumb` / `card` / `hero`, with a focal point. |
| Globals | `homepage` (hero, featured items, highlights) and `site-settings`. |

The fixed vocabularies (departments, types, regions, eras, colours, movements, subjects) are
defined once in [src/lib/taxonomy.ts](src/lib/taxonomy.ts). The collection configs and the
normalizer both use them, so seeded values are always valid options.

### Normalization

The raw AIC data is noisy:
- It has 748 distinct subject terms, including "Century of Progress" on 93 works.
- It has over 100 style variants.
- Place names mix cities, states and historic regions.
- The "artist" is often a culture, such as "Ancient Greek".

[src/lib/normalize.ts](src/lib/normalize.ts) maps all of this onto the clean vocabularies. It is
unit-tested in `tests/int/normalize.int.spec.ts`.

### Editorial Markdown

Stories and exhibition texts are Markdown with frontmatter. An artwork is embedded by putting a
token on its own line:

```
{{artwork:27992}}                      wide
{{artwork:27992|inset}}                floated inset
{{artwork:27992|wide|Custom caption}}
```

The seed converts this into Lexical, and each token becomes an `artworkEmbed` block node
([src/lib/markdown.ts](src/lib/markdown.ts)).

## Frontend

| Route | |
|---|---|
| `/` | Hero, highlights, stories, movements, featured exhibition and tour |
| `/collection` | Faceted browse. Filter state lives in the URL, so views can be shared. Counts are disjunctive: each facet's counts ignore that facet's own selection. |
| `/artworks/[slug]` | Object page; each fact links to the matching filtered view |
| `/artists`, `/artists/[slug]` | |
| `/movements`, `/movements/[slug]` | |
| `/stories`, `/stories/[slug]` | Lexical rendered with a custom Artwork block converter |
| `/exhibitions`, `/exhibitions/[slug]` | Current / upcoming / past, plus the AIC archive |
| `/tours`, `/tours/[slug]` | |

Payload has no aggregation API. At this size, `/collection` loads the facet fields for all works,
then filters and counts in memory ([src/lib/facets.ts](src/lib/facets.ts)). Interakt's facets
replace this in phase 2.

Any content change in the admin revalidates the whole site through an `afterChange` /
`afterDelete` hook ([src/hooks/revalidate.ts](src/hooks/revalidate.ts)). The seed skips it.

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Dev server on :3003 |
| `npm run db:up` / `db:down` | Start / stop Postgres |
| `npm run data:fetch` | Build `data/aic/` from the AIC API and download images (`-- --refresh` to re-pull raw data) |
| `npm run seed` | Upsert all content into Payload (idempotent) |
| `npm run interakt:sample` | Write `sample-documents.json` / `sample-mapping.json` for creating the Interakt index |
| `npm run interakt:sync` | Full sync to Interakt, removing stale documents (`-- --allow-empty` to permit emptying the index) |
| `npm run generate:types` | Regenerate `src/payload-types.ts` |
| `npm run generate:importmap` | Regenerate the admin import map after adding custom components |
| `npm run typecheck` / `lint` | |
| `npm run test:int` | Vitest: normalizer, Markdown → Lexical, facets, Interakt mappers (needs Postgres running) |

## Database

In development Payload **pushes the schema** automatically. Before deploying anywhere, generate
migrations with `npm run payload migrate:create`. The data lives in the `pgdata` Docker volume,
and uploaded images in `/media` (gitignored).

## Interakt index

All content types go into **one index**. They share a single flat document shape, built by
[src/interakt/toDocument.ts](src/interakt/toDocument.ts):
- Scalars and arrays of strings only.
- The same field names across types, so a facet like `movements` covers artworks, artists,
  stories and movements alike.
- Facet values are human-readable labels.
- Fields a type doesn't have are omitted.
- `id` is `<type>-<payload id>`, e.g. `artwork-179`.

```bash
npm run interakt:sample     # writes sample-documents.json and sample-mapping.json
```

**Paste `sample-mapping.json` into Interakt's Configure Mappings screen, not the array.** The
screen only reads the *first* object of a pasted array, so fields the first document lacks never
get mapped. `sample-mapping.json` is one object holding all 48 fields, each with a real value.
`sample-documents.json` keeps the real per-type documents for reference.

This picks the smallest set of real documents that together use every field: 7 documents, all 6
types, 48 fields. After pasting, set:

| Field | Type | On | Mapping |
|---|---|---|---|
| `id` | string | all | key |
| `type`, `typeLabel` | string | all | facet (`typeLabel`) |
| `title` | string | all | searchable, **boost** |
| `slug`, `url`, `imageUrl`, `imageAlt` | string | all | include in response |
| `summary`, `body` | text | all | searchable |
| `artist`, `culture`, `nationality` | string | artwork (+ artist: `nationality`) | facet |
| `movements`, `subjects` | string[] | artwork, artist, story, movement | facet |
| `department`, `artworkType`, `era`, `century`, `region`, `country`, `colorFamily` | string | artwork | facet |
| `isOnView` | boolean | artwork | facet |
| `yearStart`, `yearEnd` | number (negative = BCE) | artwork | filter / sort |
| `dateDisplay`, `medium`, `dimensions`, `creditLine`, `gallery` | string | artwork | searchable / include |
| `materials`, `techniques` | string[] | artwork | facet |
| `birthYear`, `deathYear` | number | artist | filter |
| `category`, `author` | string | story | facet |
| `readingTime`, `publishedAt` | number, date | story | sort |
| `venue` | string | exhibition | facet |
| `startDate`, `endDate` | date | exhibition | filter |
| `theme` | string | tour | facet |
| `durationMinutes`, `stopCount` | number | tour | include |
| `period` | string | movement | include |
| `artworkCount` | number | artist, exhibition, tour, movement | include / sort |
| `artworkTitles` | string[] | artist, story, exhibition, tour, movement | searchable |
| `updatedAt` | date | all | sort |

**Deliberately not indexed:**
- subjects and media as separate documents
- an exhibition "status" field, which would go out of date (filter on the dates instead)
- the colour hex value

**Two gotchas:**
- Image URLs point at `NEXT_PUBLIC_SITE_URL`, which defaults to localhost. That is fine for
  display in the browser, but Interakt's server can't fetch them.
- Join fields don't populate the joined artworks' images, so artist and movement documents take a
  `cover` image from the caller.

### Ingestion

Set these in `.env`:
- `INTERAKT_BASE_URL`
- `INTERAKT_INDEX_ID`
- `INTERAKT_INGESTION_KEY` (a key with write + delete on the index)
- `NEXT_PUBLIC_SITE_URL`

Everything is server-side, since the ingestion API sends no CORS headers.

- **Live hooks** ([src/interakt/hooks.ts](src/interakt/hooks.ts)): `afterChange` / `afterDelete`
  on artworks, artists, stories, exhibitions, tours and movements.
  - Payload runs in-process, so unlike the Sanity demo there is no webhook, signature or tunnel.
  - Stories are indexed from their **published** version. Saving a draft leaves search alone, and
    unpublishing removes the story.
  - An artwork change also refreshes its artist and movement, whose work counts and title lists
    include it.
  - Hook failures are logged but never block the editor's save.
  - The hooks are skipped when Interakt isn't configured, and for the seed (`context.seeding`).
- **Full sync** (`npm run interakt:sync`,
  [scripts/interakt-sync.ts](scripts/interakt-sync.ts)): builds every document
  ([src/interakt/indexer.ts](src/interakt/indexer.ts)), uploads them in batches of 250, then
  deletes anything in the index that Payload no longer has. Run it after `npm run seed`.

**Gotchas:**
- **Interakt's endpoints don't match its docs.** Ingestion is
  `POST /api/search-indexes/{id}/documents` (no `/v1`) with `Authorization: Bearer ik_…`, not
  `X-Api-Key`.
- **`GET …/documents` returns only `uniqueId` and `updatedAt` per document.** The full documents
  are stored; the listing is just a slim view.
- **Editing a stop's artwork doesn't cascade.** Changing an artwork's *title* does not refresh the
  stories, tours or exhibitions whose `artworkTitles` include it, so re-run `interakt:sync` after
  bulk edits.

### Search and chat

- **`/search`** ([src/components/search/SearchExperience.tsx](src/components/search/SearchExperience.tsx))
  calls the Interakt REST API directly, with the search experience token:
  - `POST /api/v1/search` for results and facets
  - `/autocomplete` for suggestions
  - `/summarize` for an AI summary, streamed over SSE
- The query is kept in `?q=`, so searches can be shared.
- Result links are made relative, so they work on any host.
- The client, the hooks and `DropinWidget` are ported from `../Interakt-Sanity`.
- **Drop-in widgets:**
  - The modal search widget in the header, and the floating "Ask Lumen" chat on every page.
  - Both are loaded from `${NEXT_PUBLIC_INTERAKT_BASE_URL}/embed/v1/widgets.js` and set up
    through `window.SearchDropinUI` / `window.ChatDropinUI`.
  - The `<script data-token>` snippet in the Interakt docs doesn't match what ships.

**Index gotcha:** number fields must **not** be marked *Searchable*. Interakt puts searchable
fields into Elasticsearch's text query, and a numeric field there fails every text query with
`failed to create query: For input string: "monet"`. Numeric queries like "1884" still work, which
makes it easy to miss. Keep `yearStart`, `yearEnd`, `birthYear`, `deathYear` and `artworkCount`
as filter/sort only.
