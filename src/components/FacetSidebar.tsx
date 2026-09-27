import Link from 'next/link'

import { type BrowseState, type FacetResult, toggleFilter, toQueryString } from '@/lib/facets'
import { routes } from '@/lib/format'

const SWATCH: Record<string, string> = {
  red: '#b3372c',
  orange: '#d9822b',
  yellow: '#e2c044',
  green: '#4f8a4a',
  blue: '#3b6ea8',
  purple: '#7a4d9a',
  brown: '#7a5234',
  black: '#1b1b1b',
  grey: '#9a968f',
  white: '#f4f1ea',
}

function Facet({ facet, state }: { facet: FacetResult; state: BrowseState }) {
  if (facet.buckets.length === 0) return null
  const isColor = facet.key === 'color'
  return (
    <div className="border-b border-line py-5 first:pt-0">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">{facet.label}</h3>
      <ul className={isColor ? 'flex flex-wrap gap-2' : 'space-y-1'}>
        {facet.buckets.map((b) => {
          const href = routes.collection(toQueryString(toggleFilter(state, facet.key, b.value)))
          if (isColor) {
            return (
              <li key={b.value}>
                <Link
                  href={href}
                  title={`${b.label} (${b.count})`}
                  aria-label={`${b.label} (${b.count})`}
                  aria-pressed={b.selected}
                  className={`block size-7 rounded-full border ${b.selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'border-line'} ${b.count === 0 && !b.selected ? 'opacity-30' : ''}`}
                  style={{ background: SWATCH[b.value] ?? b.value }}
                />
              </li>
            )
          }
          return (
            <li key={b.value}>
              <Link
                href={href}
                aria-pressed={b.selected}
                className={`flex items-center justify-between gap-3 rounded px-2 py-1 text-sm ${
                  b.selected ? 'bg-accent-soft text-ink' : 'text-ink/85 hover:bg-surface'
                } ${b.count === 0 && !b.selected ? 'opacity-40' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`size-3.5 shrink-0 rounded-[3px] border ${b.selected ? 'border-accent bg-accent' : 'border-muted/50'}`}
                    aria-hidden
                  />
                  {b.label}
                </span>
                <span className="text-xs tabular-nums text-muted">{b.count}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {facet.hidden > 0 && <p className="mt-2 px-2 text-xs text-muted">+ {facet.hidden} more</p>}
    </div>
  )
}

export function FacetSidebar({ facets, state }: { facets: FacetResult[]; state: BrowseState }) {
  const onViewHref = routes.collection(toQueryString({ ...state, onView: !state.onView, page: 1 }))
  const content = (
    <>
      <div className="border-b border-line pb-5">
        <Link href={onViewHref} aria-pressed={state.onView} className="flex items-center justify-between text-sm">
          <span>On view only</span>
          <span className={`relative h-5 w-9 rounded-full transition ${state.onView ? 'bg-accent' : 'bg-line'}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-surface shadow transition ${state.onView ? 'left-4.5' : 'left-0.5'}`} />
          </span>
        </Link>
      </div>
      <div className="pt-5">
        {facets.map((f) => (
          <Facet key={f.key} facet={f} state={state} />
        ))}
      </div>
    </>
  )
  return (
    <>
      <details className="mb-6 rounded border border-line bg-surface p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-medium">Filters</summary>
        <div className="mt-4">{content}</div>
      </details>
      <aside className="hidden lg:block">{content}</aside>
    </>
  )
}
