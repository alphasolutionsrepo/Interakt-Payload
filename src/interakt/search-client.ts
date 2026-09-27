/** Interakt search REST client (browser). Ported from ../Interakt-Sanity/src/interakt/search-client.ts. */
import { publicConfig } from './public-config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchFilter {
  field: string
  operator: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'
  value: unknown
}

export interface SearchRequest {
  query: string
  page?: number
  pageSize?: number
  searchType?: 'lexical' | 'semantic' | 'hybrid' | 'auto'
  filters?: SearchFilter[]
  sort?: { field: string; direction: 'asc' | 'desc' }[]
}

export interface SearchHit {
  id: string
  score?: number
  fields: Record<string, unknown>
}

export interface FacetBucket {
  key: string | number
  count: number
}

export interface Facet {
  field: string
  buckets: FacetBucket[]
}

export type DisplayFieldRole =
  | 'title'
  | 'subtitle'
  | 'description'
  | 'image'
  | 'price'
  | 'badge'
  | 'secondary'
  | 'link'

export interface DisplayConfig {
  displayFields?: { fieldName: string; role: DisplayFieldRole; label?: string; order?: number }[]
}

export interface SearchResults {
  hits: SearchHit[]
  total: number
  page: number
  totalPages: number
  facets: Facet[]
  took?: number
  displayConfig?: DisplayConfig
}

// ---------------------------------------------------------------------------
// Request plumbing
// ---------------------------------------------------------------------------

class InteraktError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`${publicConfig.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Token': publicConfig.searchToken,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new InteraktError(
      res.status === 403
        ? `Interakt rejected this origin. Add ${typeof window !== 'undefined' ? window.location.origin : 'this site'} to the experience's allowed origins.`
        : `Interakt ${res.status}: ${detail.slice(0, 200)}`,
      res.status,
    )
  }
  return res
}

/**
 * Two response shapes exist in the wild: the token-only `/api/v1/search` route
 * returns hits with a `source` object and facets as an array, while the
 * slug-scoped route returns `fields` and facets keyed by field name with
 * `doc_count` buckets. Normalising here keeps the UI from caring which it got.
 */
export function normalizeSearchResponse(data: Record<string, unknown>): SearchResults {
  const rawHits = (data.results ?? []) as Record<string, unknown>[]
  const hits: SearchHit[] = rawHits.map((r) => ({
    id: String(r.id ?? ''),
    score: typeof r.score === 'number' ? r.score : undefined,
    fields: (r.fields ?? r.source ?? {}) as Record<string, unknown>,
  }))

  let facets: Facet[] = []
  const rawFacets = data.facets
  if (Array.isArray(rawFacets)) {
    facets = rawFacets.map((f: Record<string, unknown>) => ({
      field: String(f.field),
      buckets: ((f.buckets ?? []) as Record<string, unknown>[]).map((b) => ({
        key: (b.key ?? '') as string | number,
        count: Number(b.count ?? b.doc_count ?? 0),
      })),
    }))
  } else if (rawFacets && typeof rawFacets === 'object') {
    facets = Object.entries(rawFacets as Record<string, { buckets?: Record<string, unknown>[] }>).map(
      ([field, value]) => ({
        field,
        buckets: (value?.buckets ?? []).map((b) => ({
          key: (b.key ?? '') as string | number,
          count: Number(b.count ?? b.doc_count ?? 0),
        })),
      }),
    )
  }

  const pagination = (data.pagination ?? {}) as Record<string, number>
  const total =
    typeof data.total === 'object' && data.total !== null
      ? Number((data.total as Record<string, unknown>).value ?? 0)
      : Number(pagination.totalItems ?? pagination.totalResults ?? data.total ?? hits.length)

  return {
    hits,
    total,
    page: Number(pagination.page ?? 1),
    totalPages: Number(pagination.totalPages ?? 1),
    facets: facets.filter((f) => f.buckets.length > 0),
    took: typeof data.took === 'number' ? data.took : undefined,
    displayConfig: data.displayConfig as DisplayConfig | undefined,
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function search(req: SearchRequest, signal?: AbortSignal): Promise<SearchResults> {
  // pageSize is deliberately omitted unless set, so the experience's own
  // configured default wins.
  const res = await post('/api/v1/search', req, signal)
  const json = await res.json()
  return normalizeSearchResponse((json.data ?? json) as Record<string, unknown>)
}

export async function autocomplete(query: string, signal?: AbortSignal): Promise<string[]> {
  const res = await post('/api/v1/autocomplete', { query, maxSuggestions: 8 }, signal)
  const json = await res.json()
  const data = (json.data ?? json) as { suggestions?: unknown[] }
  return (data.suggestions ?? []).map((s) =>
    typeof s === 'string' ? s : String((s as { text?: string })?.text ?? ''),
  )
}

/**
 * Streams an AI summary of results the caller already has. Returns the full
 * text; `onChunk` fires as it arrives.
 *
 * The endpoint is POST-and-SSE, so EventSource (GET-only) can't be used.
 */
export async function streamSummary(
  params: { query: string; hits: SearchHit[]; totalResults: number; instruction?: string },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await post(
    '/api/v1/summarize',
    {
      query: params.query,
      results: params.hits.slice(0, 10).map((h) => ({
        id: h.id,
        index: { id: 'default', name: 'default' },
        fields: h.fields,
      })),
      totalResults: params.totalResults,
      instruction: params.instruction,
    },
    signal,
  )

  if (!res.body) return ''

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') continue

      // Parse and handle separately: a `throw` inside the try would be caught
      // by the partial-frame handler below and silently discarded, turning a
      // server-reported error into an apparently successful empty summary.
      let event: Record<string, unknown>
      try {
        event = JSON.parse(payload)
      } catch {
        // A partial frame — wait for the rest.
        continue
      }

      if (event.type === 'error') {
        throw new Error(
          String(event.error ?? event.message ?? 'Interakt summary stream failed'),
        )
      }

      // `content` and `text` both appear depending on the route.
      const chunk = event.content ?? event.text
      if (event.type === 'content' && typeof chunk === 'string') {
        full += chunk
        onChunk(full)
      }
    }
  }

  return full
}
