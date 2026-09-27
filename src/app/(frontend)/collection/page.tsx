import type { Metadata } from 'next'
import Link from 'next/link'

import { ArtworkGrid } from '@/components/ArtworkCard'
import { FacetSidebar } from '@/components/FacetSidebar'
import { PageHeader } from '@/components/Section'
import { browse, facetDefs, parseBrowseState, type SortKey, toggleFilter, toQueryString } from '@/lib/facets'
import { routes } from '@/lib/format'
import { getArtworksByIds, getFacetRecords, getTaxonomyLookups } from '@/lib/queries'

export const metadata: Metadata = { title: 'Collection' }

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'newest', label: 'Newest' },
]

export default async function CollectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = parseBrowseState(await searchParams)
  const [records, taxonomy] = await Promise.all([getFacetRecords(), getTaxonomyLookups()])
  const defs = facetDefs(taxonomy)
  const result = browse(records, state, defs)
  const artworks = await getArtworksByIds(result.pageIds)

  const active = result.facets.flatMap((f) => f.buckets.filter((b) => b.selected).map((b) => ({ key: f.key, ...b })))
  const pageHref = (page: number) => routes.collection(toQueryString({ ...state, page }))

  return (
    <>
      <PageHeader
        eyebrow="The collection"
        title="Browse the collection"
        intro={`${records.length} public-domain works, from ancient Egypt to early modernism. Combine filters to narrow down.`}
      />
      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <FacetSidebar facets={result.facets} state={state} />
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{result.total}</span> {result.total === 1 ? 'work' : 'works'}
            </p>
            <div className="flex items-center gap-1 text-sm">
              <span className="mr-1 text-muted">Sort</span>
              {SORTS.map((s) => (
                <Link
                  key={s.value}
                  href={routes.collection(toQueryString({ ...state, sort: s.value, page: 1 }))}
                  className={`rounded-full px-3 py-1 ${state.sort === s.value ? 'bg-ink text-paper' : 'hover:bg-surface'}`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          {(active.length > 0 || state.onView) && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {active.map((a) => (
                <Link
                  key={`${a.key}:${a.value}`}
                  href={routes.collection(toQueryString(toggleFilter(state, a.key, a.value)))}
                  className="rounded-full bg-accent-soft px-3 py-1 text-sm hover:line-through"
                >
                  {a.label} ×
                </Link>
              ))}
              {state.onView && (
                <Link href={routes.collection(toQueryString({ ...state, onView: false, page: 1 }))} className="rounded-full bg-accent-soft px-3 py-1 text-sm hover:line-through">
                  On view ×
                </Link>
              )}
              <Link href={routes.collection(state.sort !== 'title' ? `?sort=${state.sort}` : '')} className="ml-1 text-sm text-accent hover:underline">
                Clear all
              </Link>
            </div>
          )}

          {artworks.length > 0 ? (
            <ArtworkGrid artworks={artworks} priorityCount={4} />
          ) : (
            <p className="py-20 text-center text-muted">No works match these filters.</p>
          )}

          {result.totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
              {result.page > 1 && (
                <Link href={pageHref(result.page - 1)} className="rounded-full border border-line px-4 py-1.5 hover:border-ink">
                  ← Previous
                </Link>
              )}
              <span className="px-3 text-muted">
                Page {result.page} of {result.totalPages}
              </span>
              {result.page < result.totalPages && (
                <Link href={pageHref(result.page + 1)} className="rounded-full border border-line px-4 py-1.5 hover:border-ink">
                  Next →
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </>
  )
}
