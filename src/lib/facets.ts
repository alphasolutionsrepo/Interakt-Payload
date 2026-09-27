/**
 * Faceted browsing for /collection, computed in memory.
 *
 * Payload has no aggregation API, and at ~600 artworks it's simplest (and fast) to load the facet
 * fields for every work once, filter and count here, then fetch full documents only for the page
 * being shown. Counts are disjunctive: a facet's counts apply every *other* active filter, so you
 * can see how many results each additional value would add.
 */
import { ARTWORK_TYPES, COLOR_FAMILIES, DEPARTMENTS, ERAS, REGIONS, type Option } from './taxonomy'

/** The facet-relevant slice of an artwork, with relationships already resolved to slugs/labels. */
export type FacetRecord = {
  id: number
  title: string
  yearStart: number | null
  department: string | null
  artworkType: string | null
  era: string | null
  region: string | null
  country: string | null
  colorFamily: string | null
  movement: string | null
  artist: string | null
  subjects: string[]
  isOnView: boolean
}

export type FacetKey = 'department' | 'type' | 'movement' | 'era' | 'region' | 'country' | 'color' | 'subject' | 'artist'

export type FacetDef = {
  key: FacetKey
  label: string
  values: (r: FacetRecord) => (string | null)[]
  /** Fixed option order and labels; facets without one are ordered by count. */
  options?: readonly Option[]
  limit?: number
}

export type SortKey = 'title' | 'oldest' | 'newest'

export type BrowseState = {
  filters: Partial<Record<FacetKey, string[]>>
  onView: boolean
  sort: SortKey
  page: number
}

export const PAGE_SIZE = 36

export function facetDefs(labels: { movements: Option[]; subjects: Option[]; artists: Option[] }): FacetDef[] {
  return [
    { key: 'movement', label: 'Movement & period', values: (r) => [r.movement], options: labels.movements },
    { key: 'type', label: 'Type', values: (r) => [r.artworkType], options: ARTWORK_TYPES },
    { key: 'subject', label: 'Subject', values: (r) => r.subjects, options: labels.subjects, limit: 12 },
    { key: 'era', label: 'Era', values: (r) => [r.era], options: ERAS },
    { key: 'region', label: 'Region', values: (r) => [r.region], options: REGIONS },
    { key: 'color', label: 'Colour', values: (r) => [r.colorFamily], options: COLOR_FAMILIES },
    { key: 'department', label: 'Department', values: (r) => [r.department], options: DEPARTMENTS },
    { key: 'artist', label: 'Artist', values: (r) => [r.artist], options: labels.artists, limit: 10 },
    { key: 'country', label: 'Country', values: (r) => [r.country], limit: 10 },
  ]
}

const FACET_KEYS: FacetKey[] = ['department', 'type', 'movement', 'era', 'region', 'country', 'color', 'subject', 'artist']

type Params = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseBrowseState(params: Params): BrowseState {
  const filters: BrowseState['filters'] = {}
  for (const key of FACET_KEYS) {
    const raw = first(params[key])
    const values = raw?.split(',').map((v) => v.trim()).filter(Boolean)
    if (values?.length) filters[key] = [...new Set(values)]
  }
  const sort = first(params.sort)
  const page = Number.parseInt(first(params.page) ?? '1', 10)
  return {
    filters,
    onView: first(params.onView) === '1',
    sort: sort === 'oldest' || sort === 'newest' ? sort : 'title',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

/** Serializes state back to a query string, e.g. for facet links. Page resets unless given. */
export function toQueryString(state: BrowseState): string {
  const q = new URLSearchParams()
  for (const key of FACET_KEYS) {
    const values = state.filters[key]
    if (values?.length) q.set(key, values.join(','))
  }
  if (state.onView) q.set('onView', '1')
  if (state.sort !== 'title') q.set('sort', state.sort)
  if (state.page > 1) q.set('page', String(state.page))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function toggleFilter(state: BrowseState, key: FacetKey, value: string): BrowseState {
  const current = state.filters[key] ?? []
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  return { ...state, page: 1, filters: { ...state.filters, [key]: next } }
}

function matches(r: FacetRecord, state: BrowseState, defs: FacetDef[], except?: FacetKey) {
  if (state.onView && !r.isOnView) return false
  for (const def of defs) {
    if (def.key === except) continue
    const selected = state.filters[def.key]
    if (!selected?.length) continue
    const values = def.values(r)
    if (!selected.some((s) => values.includes(s))) return false
  }
  return true
}

export type FacetResult = {
  key: FacetKey
  label: string
  buckets: { value: string; label: string; count: number; selected: boolean }[]
  /** Buckets beyond the display limit (still includes selected ones in `buckets`). */
  hidden: number
}

export function browse(records: FacetRecord[], state: BrowseState, defs: FacetDef[]) {
  const hits = records.filter((r) => matches(r, state, defs))

  const sorted = [...hits].sort((a, b) => {
    if (state.sort === 'title') return a.title.localeCompare(b.title)
    const ya = a.yearStart ?? Number.POSITIVE_INFINITY
    const yb = b.yearStart ?? Number.POSITIVE_INFINITY
    return state.sort === 'oldest' ? ya - yb : (b.yearStart ?? -Infinity) - (a.yearStart ?? -Infinity)
  })

  const facets: FacetResult[] = defs.map((def) => {
    const counts = new Map<string, number>()
    for (const r of records) {
      if (!matches(r, state, defs, def.key)) continue
      for (const v of new Set(def.values(r))) if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    const selected = new Set(state.filters[def.key] ?? [])
    let buckets = [...counts.entries()].map(([value, count]) => ({
      value,
      count,
      selected: selected.has(value),
      label: def.options?.find((o) => o.value === value)?.label ?? value,
    }))
    // Keep selected values visible even when they currently have zero results.
    for (const value of selected) {
      if (!counts.has(value)) buckets.push({ value, count: 0, selected: true, label: def.options?.find((o) => o.value === value)?.label ?? value })
    }
    const fixedOrder = def.options && !def.limit
    buckets.sort((a, b) =>
      fixedOrder
        ? def.options!.findIndex((o) => o.value === a.value) - def.options!.findIndex((o) => o.value === b.value)
        : b.count - a.count || a.label.localeCompare(b.label),
    )
    let hidden = 0
    if (def.limit && buckets.length > def.limit) {
      const visible = buckets.slice(0, def.limit)
      const extraSelected = buckets.slice(def.limit).filter((b) => b.selected)
      hidden = buckets.length - def.limit - extraSelected.length
      buckets = [...visible, ...extraSelected]
    }
    return { key: def.key, label: def.label, buckets, hidden }
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(state.page, totalPages)
  return {
    total: sorted.length,
    page,
    totalPages,
    pageIds: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => r.id),
    facets,
  }
}
