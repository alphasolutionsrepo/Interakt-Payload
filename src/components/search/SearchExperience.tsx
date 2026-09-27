'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useAiSummary, useAutocomplete, useInteraktSearch } from '@/hooks/useInteraktSearch'
import { publicConfig } from '@/interakt/public-config'
import type { DisplayConfig, Facet, SearchHit } from '@/interakt/search-client'

const EXAMPLES = [
  'paintings of snow and winter light',
  'what did the Egyptians bury with their dead?',
  'blue works on view',
  'which tour includes La Grande Jatte?',
  'women artists of Impressionism',
]

/** Facet fields worth surfacing, in display order. The rest of the index's facets are ignored. */
const FACET_LABELS: Record<string, string> = {
  typeLabel: 'Type',
  movements: 'Movement & period',
  artworkType: 'Object type',
  subjects: 'Subject',
  era: 'Era',
  region: 'Region',
  colorFamily: 'Colour',
  artist: 'Artist',
  culture: 'Culture',
  nationality: 'Nationality',
  department: 'Department',
  category: 'Story category',
  venue: 'Venue',
  theme: 'Tour theme',
}

/** Result links point at NEXT_PUBLIC_SITE_URL; make them relative so they work on any host. */
function localHref(url: string | undefined) {
  if (!url) return undefined
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search}`
  } catch {
    return url
  }
}

/**
 * Field roles come from the experience's display configuration rather than being hardcoded, so
 * changing what a result shows is an admin-side change, not a code change.
 */
function pickByRole(hit: SearchHit, display: DisplayConfig | undefined, role: string): string | undefined {
  const field = display?.displayFields?.find((f) => f.role === role)?.fieldName
  const value = field ? hit.fields[field] : undefined
  return value == null ? undefined : String(value)
}

function ResultRow({ hit, display }: { hit: SearchHit; display?: DisplayConfig }) {
  const f = hit.fields
  const title = pickByRole(hit, display, 'title') ?? String(f.title ?? hit.id)
  const summary = pickByRole(hit, display, 'description') ?? String(f.summary ?? '')
  const image = pickByRole(hit, display, 'image') ?? (f.imageUrl as string | undefined)
  const href = localHref(pickByRole(hit, display, 'link') ?? (f.url as string | undefined))
  const byline = [f.artist ?? f.culture ?? f.author, f.dateDisplay ?? f.period].filter(Boolean).map(String).join(', ')

  const body = (
    <div className="flex gap-5">
      <div className="size-24 shrink-0 overflow-hidden rounded-sm bg-line sm:size-28">
        {image ? (
          // Image URLs come from the index, so a plain <img> avoids next/image's allow-list.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={String(f.imageAlt ?? '')} className="h-full w-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.16em] text-accent">
          {[f.typeLabel, f.category ?? f.theme ?? (Array.isArray(f.movements) ? f.movements[0] : undefined)].filter(Boolean).map(String).join(' · ')}
        </p>
        <h3 className="mt-1 font-serif text-lg leading-snug group-hover:text-accent">{title}</h3>
        {byline ? <p className="text-sm text-muted">{byline}</p> : null}
        {summary ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink/80">{summary}</p> : null}
      </div>
    </div>
  )

  return (
    <li className="border-b border-line py-5 first:pt-0">
      {href ? (
        <Link href={href} className="group block">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  )
}

function FacetPanel({
  facets,
  selection,
  onToggle,
  onClear,
}: {
  facets: Facet[]
  selection: Record<string, string[]>
  onToggle: (field: string, value: string) => void
  onClear: () => void
}) {
  const order = Object.keys(FACET_LABELS)
  const visible = facets.filter((f) => FACET_LABELS[f.field]).sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field))
  if (visible.length === 0) return null
  const hasSelection = Object.keys(selection).length > 0

  return (
    <aside className="w-full shrink-0 lg:w-60">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Refine</h2>
        {hasSelection ? (
          <button onClick={onClear} className="text-sm text-accent hover:underline">
            Clear all
          </button>
        ) : null}
      </div>
      <div className="space-y-6">
        {visible.map((facet) => (
          <div key={facet.field}>
            <h3 className="mb-2 text-sm font-medium">{FACET_LABELS[facet.field]}</h3>
            <ul className="space-y-1">
              {facet.buckets.slice(0, 8).map((bucket) => {
                const value = String(bucket.key)
                const checked = selection[facet.field]?.includes(value) ?? false
                return (
                  <li key={value}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => onToggle(facet.field, value)} className="accent-[var(--accent)]" />
                      <span className="flex-1 truncate">{value}</span>
                      <span className="text-xs tabular-nums text-muted">{bucket.count}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}

export function SearchExperience({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const { query, setQuery, selection, toggleFacet, clearFacets, page, setPage, results, loading, error } =
    useInteraktSearch(initialQuery)
  const { suggestions, fetchSuggestions, clear: clearSuggestions } = useAutocomplete()
  const { summary, streaming } = useAiSummary(results, query)
  const [focused, setFocused] = useState(false)

  // Keep ?q= in the URL (without a navigation) so searches can be shared and reloaded.
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = query.trim()
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search', { scroll: false })
    }, 400)
    return () => clearTimeout(timer)
  }, [query, router])

  if (!publicConfig.searchToken) {
    return (
      <div className="rounded border border-dashed border-line p-6 text-sm text-muted">
        <p className="mb-2 font-medium text-ink">Search isn&apos;t configured yet.</p>
        <p>
          Create a Search Experience in Interakt over the Lumen index and set <code className="font-mono">NEXT_PUBLIC_INTERAKT_SEARCH_TOKEN</code>.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-8 max-w-3xl">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            fetchSuggestions(e.target.value)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search artworks, artists, stories, tours… or ask a question"
          className="w-full rounded-full border border-line bg-surface px-6 py-4 text-lg outline-none placeholder:text-muted focus:border-ink"
        />
        {focused && suggestions.length > 0 ? (
          <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  className="w-full px-6 py-2.5 text-left text-sm hover:bg-accent-soft"
                  onMouseDown={() => {
                    setQuery(s)
                    clearSuggestions()
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {!query ? (
        <div className="text-sm text-muted">
          <p className="mb-3">Try a keyword, or ask a question in plain language:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => setQuery(e)} className="rounded-full border border-line bg-surface px-4 py-2 text-ink hover:border-ink">
                {e}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="rounded border border-line bg-surface p-4 text-sm text-muted">{error}</p> : null}

      {summary || streaming ? (
        <div className="mb-10 max-w-3xl rounded-sm border-l-2 border-accent bg-accent-soft/60 px-6 py-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-accent">
            AI summary {streaming ? '· writing…' : null}
          </p>
          <p className="whitespace-pre-wrap font-serif text-[17px] leading-relaxed">{summary}</p>
        </div>
      ) : null}

      {results ? (
        <div className="flex flex-col gap-10 lg:flex-row">
          <FacetPanel facets={results.facets} selection={selection} onToggle={toggleFacet} onClear={clearFacets} />
          <div className="min-w-0 flex-1">
            <p className="mb-5 text-sm text-muted">
              <span className="font-medium text-ink">{results.total}</span> result{results.total === 1 ? '' : 's'}
              {results.took != null ? ` in ${results.took}ms` : null}
              {loading ? ' · updating…' : null}
            </p>
            {results.hits.length === 0 ? <p className="py-10 text-muted">Nothing found. Try fewer words or clear a filter.</p> : null}
            <ul>
              {results.hits.map((hit) => (
                <ResultRow key={hit.id} hit={hit} display={results.displayConfig} />
              ))}
            </ul>
            {results.totalPages > 1 ? (
              <div className="mt-8 flex items-center gap-3 text-sm">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border border-line px-4 py-1.5 hover:border-ink disabled:opacity-40">
                  ← Previous
                </button>
                <span className="text-muted">
                  Page {page} of {results.totalPages}
                </span>
                <button disabled={page >= results.totalPages} onClick={() => setPage(page + 1)} className="rounded-full border border-line px-4 py-1.5 hover:border-ink disabled:opacity-40">
                  Next →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
