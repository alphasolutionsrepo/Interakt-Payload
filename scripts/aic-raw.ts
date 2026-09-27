/**
 * Stage 1 of the data pipeline: pull the raw AIC records we need into data/aic/raw/ (gitignored).
 * fetch-aic.ts runs this when the cache is missing, then normalizes into the committed JSON.
 *
 * Selection: public-domain works that have an image and a CC0 `short_description`.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import { aicGet, sleep } from './aic-client'

export const RAW_DIR = path.resolve('data/aic/raw')

export const ARTWORK_FIELDS = [
  'id',
  'title',
  'artist_id',
  'artist_title',
  'artist_display',
  'date_start',
  'date_end',
  'date_display',
  'place_of_origin',
  'medium_display',
  'dimensions',
  'credit_line',
  'main_reference_number',
  'department_title',
  'artwork_type_title',
  'classification_title',
  'style_title',
  'style_titles',
  'subject_titles',
  'material_titles',
  'technique_titles',
  'theme_titles',
  'image_id',
  'is_on_view',
  'gallery_title',
  'color',
  'short_description',
  'thumbnail',
].join(',')

type Page<T> = { data: T[]; pagination: { total: number } }

async function fetchArtworks() {
  const must = [
    'query[bool][must][][term][is_public_domain]=true',
    'query[bool][must][][exists][field]=image_id',
    'query[bool][must][][exists][field]=short_description',
  ].join('&')
  const all: Record<string, unknown>[] = []
  for (let page = 1; ; page++) {
    const res = await aicGet<Page<Record<string, unknown>>>(
      `/artworks/search?${must}&fields=${ARTWORK_FIELDS}&limit=100&page=${page}`,
    )
    all.push(...res.data)
    console.log(`artworks: ${all.length}/${res.pagination.total}`)
    if (all.length >= res.pagination.total || res.data.length === 0) break
    await sleep(300)
  }
  return all
}

async function fetchAgents(ids: number[]) {
  const out: Record<string, unknown>[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const res = await aicGet<{ data: Record<string, unknown>[] }>(
      `/agents?ids=${batch.join(',')}&fields=id,title,birth_date,death_date,description,is_artist&limit=50`,
    )
    out.push(...res.data)
    await sleep(300)
  }
  console.log(`agents: ${out.length}`)
  return out
}

async function fetchExhibitions(artworkIds: Set<number>) {
  // The exhibitions endpoint is large (6k+); scan it and keep those that share works with our set.
  const keep: Record<string, unknown>[] = []
  for (let page = 1; page <= 70; page++) {
    const res = await aicGet<Page<Record<string, unknown>>>(
      `/exhibitions?fields=id,title,short_description,description,aic_start_at,aic_end_at,artwork_ids,status&limit=100&page=${page}`,
    )
    for (const ex of res.data) {
      const ids = (ex.artwork_ids as number[] | undefined) ?? []
      const overlap = ids.filter((id) => artworkIds.has(id)).length
      if (overlap >= 3) keep.push({ ...ex, overlap })
    }
    if (res.data.length < 100) break
    await sleep(300)
  }
  console.log(`exhibitions with >=3 overlapping works: ${keep.length}`)
  return keep
}

export async function fetchRaw() {
  await fs.mkdir(RAW_DIR, { recursive: true })
  const artworks = await fetchArtworks()
  await fs.writeFile(path.join(RAW_DIR, 'artworks.json'), JSON.stringify(artworks, null, 2))

  const agentIds = [...new Set(artworks.map((a) => a.artist_id).filter(Boolean) as number[])]
  const agents = await fetchAgents(agentIds)
  await fs.writeFile(path.join(RAW_DIR, 'agents.json'), JSON.stringify(agents, null, 2))

  const exhibitions = await fetchExhibitions(new Set(artworks.map((a) => a.id as number)))
  await fs.writeFile(path.join(RAW_DIR, 'exhibitions.json'), JSON.stringify(exhibitions, null, 2))
}
