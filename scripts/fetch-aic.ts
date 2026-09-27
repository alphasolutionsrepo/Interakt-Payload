/**
 * `npm run data:fetch` — builds the committed seed data from the Art Institute of Chicago API.
 *
 *   1. Raw records → data/aic/raw/ (gitignored; fetched only when missing or with --refresh)
 *   2. Normalized   → data/aic/{artworks,artists,exhibitions}.json (committed)
 *   3. Images       → data/aic/images/<aicId>.jpg (gitignored; existing files are skipped)
 *
 * All data used is CC0. We deliberately keep only `short_description` (CC0), not the CC-BY
 * `description` field.
 */
import fs from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'

import { downloadImage, sleep } from './aic-client'
import { RAW_DIR, fetchRaw } from './aic-raw'
import {
  artworkTypeFor,
  cleanText,
  colorFamily,
  countryFor,
  departmentFor,
  hslToHex,
  isCulture,
  movementFor,
  nationalityFrom,
  regionFor,
  slugify,
  subjectsFor,
  subjectsFromText,
} from '../src/lib/normalize'
import type { AicArtist, AicArtwork, AicExhibition } from './data-types'

const OUT_DIR = path.resolve('data/aic')
const IMG_DIR = path.join(OUT_DIR, 'images')

/** Generic AIC material/technique terms that make useless facet values. */
const GENERIC_TERMS = new Set([
  'inorganic material', 'organic material', 'painting', 'paint', 'plant material', 'metal',
  'nonferrous metal', 'colorant', 'pigment', 'rock', 'metamorphic rock', 'sedimentary rock',
  'carbonate rock', 'painting techniques', 'painting (image making)', 'image making',
  'processes and techniques', 'material', 'ferrous metal', 'igneous rock', 'fiber',
])

/**
 * Known errors in the source data. 831 (an Islamic glass bracelet) carries the description of the
 * Antinous portrait bust, so its description is dropped.
 */
const BAD_DESCRIPTIONS = new Set([831])

const readJson = async <T>(file: string) => JSON.parse(await fs.readFile(file, 'utf8')) as T

const cleanTerms = (terms?: string[] | null) =>
  [...new Set((terms ?? []).filter((t) => !GENERIC_TERMS.has(t.toLowerCase())).map((t) => t.replace(/\s*\(.*?\)\s*/g, '').trim()))]
    .filter(Boolean)
    .slice(0, 6)

const year = (d?: string | number | null) => {
  if (d == null) return undefined
  const n = typeof d === 'number' ? d : parseInt(String(d), 10)
  return Number.isFinite(n) ? n : undefined
}

async function main() {
  const refresh = process.argv.includes('--refresh')
  if (refresh || !existsSync(path.join(RAW_DIR, 'artworks.json'))) await fetchRaw()

  const rawArtworks = await readJson<any[]>(path.join(RAW_DIR, 'artworks.json'))
  const rawAgents = await readJson<any[]>(path.join(RAW_DIR, 'agents.json'))
  const rawExhibitions = await readJson<any[]>(path.join(RAW_DIR, 'exhibitions.json'))

  rawArtworks.sort((a, b) => a.id - b.id)
  const agentsById = new Map(rawAgents.map((a) => [a.id, a]))

  // --- Artworks -------------------------------------------------------------------------------
  const usedSlugs = new Set<string>()
  const artworks: AicArtwork[] = rawArtworks.map((r) => {
    const title = cleanText(r.title)
    let slug = slugify(title) || `artwork-${r.id}`
    if (usedSlugs.has(slug)) slug = `${slug}-${r.id}`
    usedSlugs.add(slug)

    const department = departmentFor(r.department_title)
    const country = countryFor(r.place_of_origin)
    const artistIsPerson = r.artist_id && !isCulture(r.artist_title)
    const description = BAD_DESCRIPTIONS.has(r.id) ? '' : cleanText(r.short_description)
    let subjects = subjectsFor(r.subject_titles)
    if (subjects.length === 0) subjects = subjectsFromText(`${title} ${description}`)

    return {
      aicId: r.id,
      title,
      slug,
      artistAicId: artistIsPerson ? r.artist_id : undefined,
      culture: artistIsPerson ? undefined : (r.artist_title ?? undefined),
      artistDisplay: cleanText(r.artist_display) || undefined,
      dateDisplay: cleanText(r.date_display) || undefined,
      yearStart: r.date_start ?? undefined,
      yearEnd: r.date_end ?? undefined,
      department,
      artworkType: artworkTypeFor(r.artwork_type_title),
      movement: movementFor({
        styles: r.style_titles ?? [],
        department,
        country,
        year: r.date_start,
        artist: r.artist_title,
      }),
      placeOfOrigin: r.place_of_origin ?? undefined,
      country,
      region: regionFor(country),
      medium: cleanText(r.medium_display) || undefined,
      materials: cleanTerms(r.material_titles),
      techniques: cleanTerms(r.technique_titles),
      subjects,
      colorFamily: r.color ? colorFamily(r.color) : undefined,
      dominantColor: r.color ? hslToHex(r.color) : undefined,
      dimensions: cleanText(r.dimensions) || undefined,
      creditLine: cleanText(r.credit_line) || undefined,
      referenceNumber: r.main_reference_number ?? undefined,
      isOnView: Boolean(r.is_on_view),
      gallery: r.gallery_title ?? undefined,
      description,
      altText: cleanText(r.thumbnail?.alt_text) || title,
      imageId: r.image_id,
      imageWidth: r.thumbnail?.width,
      imageHeight: r.thumbnail?.height,
      sourceUrl: `https://www.artic.edu/artworks/${r.id}`,
    }
  })

  // --- Artists (individuals and makers only; cultures stay on the artwork) --------------------
  const artistWorks = new Map<number, AicArtwork[]>()
  for (const a of artworks) {
    if (!a.artistAicId) continue
    artistWorks.set(a.artistAicId, [...(artistWorks.get(a.artistAicId) ?? []), a])
  }
  const usedArtistSlugs = new Set<string>()
  const artists: AicArtist[] = [...artistWorks.entries()]
    .map(([id, works]) => {
      const agent = agentsById.get(id)
      const name = cleanText(agent?.title ?? rawArtworks.find((r) => r.artist_id === id)?.artist_title)
      let slug = slugify(name)
      if (usedArtistSlugs.has(slug)) slug = `${slug}-${id}`
      usedArtistSlugs.add(slug)
      const movementCounts = new Map<string, number>()
      for (const w of works) if (w.movement) movementCounts.set(w.movement, (movementCounts.get(w.movement) ?? 0) + 1)
      return {
        aicId: id,
        name,
        slug,
        birthYear: year(agent?.birth_date),
        deathYear: year(agent?.death_date),
        nationality: nationalityFrom(rawArtworks.find((r) => r.artist_id === id)?.artist_display),
        movements: [...movementCounts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m),
        artworkCount: works.length,
      }
    })
    .sort((a, b) => b.artworkCount - a.artworkCount || a.name.localeCompare(b.name))

  // --- Exhibitions (real AIC exhibitions that share works with our set) -----------------------
  const ourIds = new Set(artworks.map((a) => a.aicId))
  const exhibitions: AicExhibition[] = rawExhibitions
    .filter((e) => cleanText(e.short_description))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 12)
    .map((e) => ({
      aicId: e.id,
      title: cleanText(e.title),
      slug: slugify(cleanText(e.title)),
      startDate: e.aic_start_at ?? undefined,
      endDate: e.aic_end_at ?? undefined,
      description: cleanText(e.short_description),
      artworkAicIds: (e.artwork_ids as number[]).filter((id) => ourIds.has(id)),
      sourceUrl: `https://www.artic.edu/exhibitions/${e.id}`,
    }))

  await fs.mkdir(IMG_DIR, { recursive: true })
  await fs.writeFile(path.join(OUT_DIR, 'artworks.json'), JSON.stringify(artworks, null, 2) + '\n')
  await fs.writeFile(path.join(OUT_DIR, 'artists.json'), JSON.stringify(artists, null, 2) + '\n')
  await fs.writeFile(path.join(OUT_DIR, 'exhibitions.json'), JSON.stringify(exhibitions, null, 2) + '\n')

  // --- Images ---------------------------------------------------------------------------------
  let downloaded = 0
  let skipped = 0
  const failed: number[] = []
  for (const a of artworks) {
    const file = path.join(IMG_DIR, `${a.aicId}.jpg`)
    if (existsSync(file) && statSync(file).size > 0) {
      skipped++
      continue
    }
    try {
      await fs.writeFile(file, await downloadImage(a.imageId))
      downloaded++
      if (downloaded % 25 === 0) console.log(`images: ${downloaded} downloaded`)
      await sleep(150)
    } catch (err) {
      failed.push(a.aicId)
      console.warn(`image failed for ${a.aicId}: ${(err as Error).message}`)
    }
  }

  // --- Report ---------------------------------------------------------------------------------
  const dist = (pick: (a: AicArtwork) => string | string[] | undefined) => {
    const m = new Map<string, number>()
    for (const a of artworks) for (const v of ([] as (string | undefined)[]).concat(pick(a))) m.set(v ?? '(none)', (m.get(v ?? '(none)') ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')
  }
  console.log(`\nartworks ${artworks.length}, artists ${artists.length}, exhibitions ${exhibitions.length}`)
  console.log(`images: ${downloaded} downloaded, ${skipped} already present, ${failed.length} failed ${failed.length ? JSON.stringify(failed) : ''}`)
  console.log(`\ndepartment: ${dist((a) => a.department)}`)
  console.log(`type: ${dist((a) => a.artworkType)}`)
  console.log(`movement: ${dist((a) => a.movement)}`)
  console.log(`region: ${dist((a) => a.region)}`)
  console.log(`color: ${dist((a) => a.colorFamily)}`)
  console.log(`subjects: ${dist((a) => a.subjects)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
