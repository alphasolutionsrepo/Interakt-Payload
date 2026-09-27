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
| `npm run generate:types` | Regenerate `src/payload-types.ts` |
| `npm run generate:importmap` | Regenerate the admin import map after adding custom components |
| `npm run typecheck` / `lint` | |
| `npm run test:int` | Vitest: normalizer, Markdown → Lexical, facets (needs Postgres running) |

## Database

In development Payload **pushes the schema** automatically. Before deploying anywhere, generate
migrations with `npm run payload migrate:create`. The data lives in the `pgdata` Docker volume,
and uploaded images in `/media` (gitignored).

## Phase 2: Interakt

- Port `ingest.ts`, `search-client.ts`, `useInteraktSearch.ts` and `DropinWidget.tsx` from `../Interakt-Sanity`.
- Payload `afterChange` / `afterDelete` hooks replace the Sanity webhook, so no tunnel is needed.
- Documents are built from the clean facet fields, plus Lexical → plain text (`lexicalToPlainText`) for bodies.
- Skip story drafts (`_status !== 'published'`).
