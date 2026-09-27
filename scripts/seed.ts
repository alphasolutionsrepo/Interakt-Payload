/**
 * `npm run seed` — loads data/aic (artworks, artists, exhibitions, images) and data/editorial
 * (stories, bios, movements, tours, Lumen exhibitions) into Payload through the Local API.
 *
 * Idempotent: every document is upserted by a stable key (aicId, slug or filename), so re-running
 * updates in place instead of duplicating. Run with `payload run`, which loads .env and the config.
 */
import fs from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'

import config from '@payload-config'
import { editorConfigFactory } from '@payloadcms/richtext-lexical'
import { getPayload, type Payload, type Where } from 'payload'
import sharp from 'sharp'

import { embeddedIds, markdownToLexical, parseFrontmatter } from '../src/lib/markdown'
import { MOVEMENTS, SUBJECTS } from '../src/lib/taxonomy'
import type {
  AicArtist,
  AicArtwork,
  AicExhibition,
  EditorialArtist,
  EditorialExhibition,
  EditorialMovement,
  EditorialTour,
} from './data-types'

const DATA = path.resolve('data')
const IMAGES = path.join(DATA, 'aic/images')
const CREDIT = 'Art Institute of Chicago, CC0'
const CONCURRENCY = 4
/** Seeded documents must keep the slugs we give them. */
const KEEP_SLUG = { generateSlug: false }

const readJson = async <T>(file: string) => JSON.parse(await fs.readFile(path.join(DATA, file), 'utf8')) as T

type Collection = Parameters<Payload['find']>[0]['collection']

/** Finds a document by `where`; updates it if present, otherwise creates it. Returns the id. */
async function upsert(payload: Payload, collection: Collection, where: Where, data: Record<string, unknown>) {
  const existing = await payload.find({ collection, where, limit: 1, depth: 0, pagination: false })
  const ctx = { context: { seeding: true } }
  if (existing.docs[0]) {
    const doc = await payload.update({ collection, id: existing.docs[0].id, data, depth: 0, ...ctx })
    return doc.id as number
  }
  const doc = await payload.create({ collection, data, depth: 0, ...ctx } as Parameters<Payload['create']>[0])
  return doc.id as number
}

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn))
}

async function main() {
  const payload = await getPayload({ config })
  const editorConfig = await editorConfigFactory.default({ config: payload.config })
  const log = (msg: string) => payload.logger.info(`[seed] ${msg}`)

  const artworks = await readJson<AicArtwork[]>('aic/artworks.json')
  const aicArtists = await readJson<AicArtist[]>('aic/artists.json')
  const aicExhibitions = await readJson<AicExhibition[]>('aic/exhibitions.json')
  const bios = await readJson<EditorialArtist[]>('editorial/artists.json')
  const movementTexts = await readJson<EditorialMovement[]>('editorial/movements.json')
  const tours = await readJson<EditorialTour[]>('editorial/tours.json')
  const lumenExhibitions = await readJson<EditorialExhibition[]>('editorial/exhibitions.json')

  // Artworks without a downloadable image are skipped (a couple of IIIF images are restricted).
  const hasImage = (a: AicArtwork) => {
    const file = path.join(IMAGES, `${a.aicId}.jpg`)
    return existsSync(file) && statSync(file).size > 0
  }
  const withImages = artworks.filter(hasImage)
  if (withImages.length < artworks.length) log(`skipping ${artworks.length - withImages.length} artworks without images`)

  // --- Media ----------------------------------------------------------------------------------
  const mediaByAic = new Map<number, number>()
  let created = 0
  await inBatches(withImages, CONCURRENCY, async (a) => {
    const filename = `aic-${a.aicId}.jpg`
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      await payload.update({ collection: 'media', id: existing.docs[0].id, data: { alt: a.altText, credit: CREDIT }, depth: 0, context: { seeding: true } })
      mediaByAic.set(a.aicId, existing.docs[0].id)
      return
    }
    // The originals are up to ~1700px wide; 1600 is plenty for the largest image size.
    const data = await sharp(path.join(IMAGES, `${a.aicId}.jpg`))
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
    const doc = await payload.create({
      collection: 'media',
      data: { alt: a.altText, credit: CREDIT },
      file: { data, mimetype: 'image/jpeg', name: filename, size: data.length },
      depth: 0,
      context: { seeding: true },
    })
    mediaByAic.set(a.aicId, doc.id)
    if (++created % 50 === 0) log(`media: ${created} uploaded`)
  })
  log(`media: ${mediaByAic.size} (${created} new)`)

  // --- Taxonomies -----------------------------------------------------------------------------
  const movementIds = new Map<string, number>()
  for (const m of MOVEMENTS) {
    const text = movementTexts.find((t) => t.slug === m.value)
    movementIds.set(
      m.value,
      await upsert(payload, 'movements', { slug: { equals: m.value } }, {
        title: m.label,
        slug: m.value,
        ...KEEP_SLUG,
        period: text?.period,
        description: text?.description,
      }),
    )
  }
  const subjectIds = new Map<string, number>()
  for (const s of SUBJECTS) {
    subjectIds.set(s.value, await upsert(payload, 'subjects', { slug: { equals: s.value } }, { title: s.label, slug: s.value, ...KEEP_SLUG }))
  }
  log(`movements: ${movementIds.size}, subjects: ${subjectIds.size}`)

  // --- Artists --------------------------------------------------------------------------------
  const bioByAic = new Map(bios.map((b) => [b.aicId, b]))
  const artistIds = new Map<number, number>()
  await inBatches(aicArtists, CONCURRENCY, async (a) => {
    const extra = bioByAic.get(a.aicId) as (EditorialArtist & Partial<AicArtist>) | undefined
    artistIds.set(
      a.aicId,
      await upsert(payload, 'artists', { aicId: { equals: a.aicId } }, {
        aicId: a.aicId,
        name: extra?.name ?? a.name,
        slug: a.slug,
        ...KEEP_SLUG,
        nationality: extra?.nationality ?? a.nationality,
        birthYear: extra?.birthYear ?? a.birthYear,
        deathYear: extra?.deathYear ?? a.deathYear,
        movements: a.movements.map((m) => movementIds.get(m)).filter(Boolean),
        bio: extra?.bio ? markdownToLexical(extra.bio, editorConfig, () => undefined) : undefined,
      }),
    )
  })
  log(`artists: ${artistIds.size} (${bios.length} with bios)`)

  // --- Artworks -------------------------------------------------------------------------------
  const artworkIds = new Map<number, number>()
  await inBatches(withImages, CONCURRENCY, async (a) => {
    const { aicId, artistAicId, movement, subjects, imageId: _i, imageWidth: _w, imageHeight: _h, altText: _alt, ...rest } = a
    artworkIds.set(
      aicId,
      await upsert(payload, 'artworks', { aicId: { equals: aicId } }, {
        ...rest,
        aicId,
        ...KEEP_SLUG,
        image: mediaByAic.get(aicId),
        artist: artistAicId ? artistIds.get(artistAicId) : null,
        movement: movement ? movementIds.get(movement) : null,
        subjects: subjects.map((s) => subjectIds.get(s)).filter(Boolean),
      }),
    )
  })
  log(`artworks: ${artworkIds.size}`)

  const resolveArtwork = (aicId: number) => artworkIds.get(aicId)
  const artworkRefs = (ids: number[]) => [...new Set(ids.map(resolveArtwork).filter((id): id is number => id != null))]
  const heroFor = (ids: number[]) => ids.map((id) => mediaByAic.get(id)).find(Boolean)

  // --- Exhibitions ----------------------------------------------------------------------------
  const exhibitionIds = new Map<string, number>()
  for (const e of aicExhibitions) {
    exhibitionIds.set(
      e.slug,
      await upsert(payload, 'exhibitions', { aicId: { equals: e.aicId } }, {
        aicId: e.aicId,
        title: e.title,
        slug: e.slug,
        ...KEEP_SLUG,
        venue: 'aic',
        summary: e.description,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        artworks: artworkRefs(e.artworkAicIds),
        heroImage: heroFor(e.artworkAicIds),
        sourceUrl: e.sourceUrl,
      }),
    )
  }
  for (const e of lumenExhibitions) {
    exhibitionIds.set(
      e.slug,
      await upsert(payload, 'exhibitions', { slug: { equals: e.slug } }, {
        title: e.title,
        slug: e.slug,
        ...KEEP_SLUG,
        venue: 'lumen',
        summary: e.summary,
        body: markdownToLexical(e.description, editorConfig, resolveArtwork),
        startDate: e.startDate,
        endDate: e.endDate,
        artworks: artworkRefs(e.artworkAicIds),
        heroImage: heroFor(e.artworkAicIds),
      }),
    )
  }
  log(`exhibitions: ${exhibitionIds.size}`)

  // --- Stories --------------------------------------------------------------------------------
  const storyDir = path.join(DATA, 'editorial/stories')
  const storyFiles = (await fs.readdir(storyDir)).filter((f) => f.endsWith('.md')).sort()
  const stories: { id: number; publishedAt: string }[] = []
  for (const file of storyFiles) {
    const { data: fm, body } = parseFrontmatter(await fs.readFile(path.join(storyDir, file), 'utf8'))
    const hero = Number(fm.hero)
    const related = ((fm.related as number[]) ?? []).map(Number)
    const id = await upsert(payload, 'stories', { slug: { equals: String(fm.slug) } }, {
      title: fm.title,
      slug: fm.slug,
      ...KEEP_SLUG,
      category: fm.category,
      author: fm.author,
      publishedAt: fm.publishedAt,
      excerpt: fm.excerpt,
      heroImage: mediaByAic.get(hero) ?? heroFor([...related, ...embeddedIds(body)]),
      body: markdownToLexical(body, editorConfig, resolveArtwork),
      relatedArtworks: artworkRefs(related),
      movements: ((fm.movements as string[]) ?? []).map((m) => movementIds.get(m)).filter(Boolean),
      subjects: ((fm.subjects as string[]) ?? []).map((s) => subjectIds.get(s)).filter(Boolean),
      _status: 'published',
    })
    stories.push({ id, publishedAt: String(fm.publishedAt) })
  }
  log(`stories: ${stories.length}`)

  // --- Tours ----------------------------------------------------------------------------------
  const tourIds: number[] = []
  for (const t of tours) {
    const stops = t.stops.filter((s) => artworkIds.has(s.aicId))
    tourIds.push(
      await upsert(payload, 'tours', { slug: { equals: t.slug } }, {
        title: t.title,
        slug: t.slug,
        ...KEEP_SLUG,
        theme: t.theme,
        durationMinutes: t.durationMinutes,
        intro: t.intro,
        heroImage: heroFor(stops.map((s) => s.aicId)),
        stops: stops.map((s) => ({ artwork: artworkIds.get(s.aicId), note: s.note })),
      }),
    )
  }
  log(`tours: ${tourIds.length}`)

  // --- Globals --------------------------------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10)
  const currentLumen = lumenExhibitions.find((e) => e.startDate <= today && e.endDate >= today) ?? lumenExhibitions[0]
  const HIGHLIGHTS = [27992, 87479, 111442, 56905, 69780, 28560, 20684, 75644, 125774, 189293, 22525, 106377, 15468, 177]
  await payload.updateGlobal({
    slug: 'homepage',
    context: { seeding: true },
    data: {
      hero: {
        artwork: artworkIds.get(27992) ?? [...artworkIds.values()][0],
        heading: 'Six hundred works. Five thousand years. Open to everyone.',
        text: 'Explore paintings, sculpture and objects from ancient Egypt to early modernism — every one of them in the public domain.',
      },
      featuredStory: stories.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0]?.id,
      featuredTour: tourIds[0],
      featuredExhibition: currentLumen ? exhibitionIds.get(currentLumen.slug) : undefined,
      highlights: artworkRefs(HIGHLIGHTS).slice(0, 12),
    },
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    context: { seeding: true },
    data: {
      siteName: 'Lumen',
      tagline: 'The Open Collection',
      footerCredit:
        'Artwork data and images courtesy of the Art Institute of Chicago, released under CC0. Lumen is a fictional demo site; stories, tours and Lumen exhibitions are original editorial content.',
    },
  })
  log('globals updated — done')
}

// `payload run` only awaits the module import, so the work must happen in top-level await.
try {
  await main()
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
