'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  autocomplete,
  search,
  streamSummary,
  type SearchFilter,
  type SearchHit,
  type SearchResults,
} from '@/interakt/search-client'

/** facet field -> selected values */
export type FacetSelection = Record<string, string[]>

const DEBOUNCE_MS = 250

function toFilters(selection: FacetSelection): SearchFilter[] {
  return Object.entries(selection).flatMap(([field, values]) =>
    values.map((value) => ({ field, operator: 'eq' as const, value })),
  )
}

/**
 * State is keyed by the exact inputs that produced it, and what the UI reads is
 * derived by comparing that key against the current inputs.
 *
 * The obvious alternative — storing `results` and clearing it in an effect when
 * the query changes — has two faults. A response that arrives after the inputs
 * moved on still lands in state, so results and query disagree; and resetting
 * state synchronously inside an effect triggers cascading renders.
 * Deriving removes both: stale responses fail the key comparison and are
 * ignored, and nothing needs clearing.
 */
interface SearchState {
  key: string
  results: SearchResults | null
  error: string | null
}

export function useInteraktSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [selection, setSelection] = useState<FacetSelection>({})
  const [page, setPage] = useState(1)
  const [state, setState] = useState<SearchState>({ key: '', results: null, error: null })

  const key = query.trim() ? JSON.stringify({ q: query.trim(), s: selection, p: page }) : ''

  useEffect(() => {
    if (!key) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      const filters = toFilters(selection)
      search(
        {
          query: query.trim(),
          page,
          searchType: 'auto',
          filters: filters.length ? filters : undefined,
        },
        controller.signal,
      )
        .then((results) => setState({ key, results, error: null }))
        .catch((err: Error) => {
          if (err.name === 'AbortError') return
          setState({ key, results: null, error: err.message })
        })
    }, DEBOUNCE_MS)

    // Aborting here, rather than at the start of the next request, is what
    // stops an in-flight response from landing during the debounce window.
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, query, selection, page])

  const toggleFacet = useCallback((field: string, value: string) => {
    setPage(1)
    setSelection((prev) => {
      const current = prev[field] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      const updated = { ...prev, [field]: next }
      if (next.length === 0) delete updated[field]
      return updated
    })
  }, [])

  const clearFacets = useCallback(() => setSelection({}), [])

  const updateQuery = useCallback((q: string) => {
    setPage(1)
    setQuery(q)
  }, [])

  const settled = state.key === key

  return {
    query,
    setQuery: updateQuery,
    selection,
    toggleFacet,
    clearFacets,
    page,
    setPage,
    results: settled ? state.results : null,
    error: settled ? state.error : null,
    loading: key !== '' && !settled,
  }
}

/**
 * Suggestions are stored with the query they belong to, and only surfaced while
 * that query is still the current one. Otherwise the previous query's
 * suggestions stay on screen under the new one until the next response lands —
 * offering completions for text the reader has already moved past.
 */
export function useAutocomplete(debounceMs = 200) {
  const [state, setState] = useState<{ query: string; items: string[] }>({
    query: '',
    items: [],
  })
  const [current, setCurrent] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
  }, [])

  const fetchSuggestions = useCallback(
    (query: string) => {
      cancel()
      const trimmed = query.trim()
      setCurrent(trimmed)

      if (trimmed.length < 2) return

      const controller = new AbortController()
      abortRef.current = controller
      timerRef.current = setTimeout(() => {
        autocomplete(trimmed, controller.signal)
          .then((items) => setState({ query: trimmed, items: items.filter(Boolean) }))
          .catch(() => setState({ query: trimmed, items: [] }))
      }, debounceMs)
    },
    [cancel, debounceMs],
  )

  useEffect(() => cancel, [cancel])

  const clear = useCallback(() => {
    cancel()
    setCurrent('')
  }, [cancel])

  return {
    suggestions: state.query === current && current.length >= 2 ? state.items : [],
    fetchSuggestions,
    clear,
  }
}

interface SummaryState {
  key: string
  text: string
  done: boolean
}

/**
 * Streams an AI summary of the given results.
 *
 * Keyed on the query *and* the hit ids, so a summary can never be shown against
 * a different set of results than the one it was generated from.
 */
export function useAiSummary(results: SearchResults | null, query: string) {
  const [state, setState] = useState<SummaryState>({ key: '', text: '', done: false })

  const hits: SearchHit[] = results?.hits ?? []
  const key =
    query.trim() && hits.length > 0
      ? JSON.stringify({ q: query.trim(), ids: hits.map((h) => h.id) })
      : ''

  const total = results?.total ?? 0

  useEffect(() => {
    if (!key) return

    const controller = new AbortController()
    const { q, ids } = JSON.parse(key) as { q: string; ids: string[] }
    const subject = hits.filter((h) => ids.includes(h.id))

    streamSummary(
      { query: q, hits: subject, totalResults: total },
      (text) => setState({ key, text, done: false }),
      controller.signal,
    )
      .then((text) => setState({ key, text, done: true }))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        // The experience may simply have AI summaries turned off, which is a
        // configuration state rather than something to show the reader.
        setState({ key, text: '', done: true })
      })

    return () => controller.abort()
    // `hits` and `total` are derived from the same response as `key`.
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const matches = state.key === key
  return {
    summary: matches ? state.text : '',
    streaming: key !== '' && !(matches && state.done),
  }
}
