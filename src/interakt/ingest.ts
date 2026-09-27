/**
 * Interakt ingestion API client. Ported from ../Interakt-Sanity/src/interakt/ingest.ts.
 *
 * Ingestion is server-to-server only: these endpoints send no CORS headers, and the key can write
 * and delete. Note the path has no `/v1` segment and auth is `Authorization: Bearer ik_…` — the
 * Interakt integration docs show `/api/v1/search-indexes/...` and an `X-Api-Key` header; neither
 * exists in the shipped backend.
 */
import type { IngestTarget } from './config'
import type { InteraktDocument } from './toDocument'

export interface UploadSummary {
  total: number
  indexed: number
  failed: number
}

function endpoint(target: IngestTarget, suffix = ''): string {
  return `${target.baseUrl}/api/search-indexes/${target.indexId}/documents${suffix}`
}

function headers(target: IngestTarget): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${target.ingestionKey}`,
  }
}

/**
 * POST with 429 handling. The bulk endpoint allows 60 requests/min and the full-upload endpoint
 * only 30, so a backfill that ignores Retry-After stalls partway through rather than failing
 * outright — which is worse, because it looks like it worked.
 */
async function postWithRetry(url: string, target: IngestTarget, body: unknown, attempt = 0): Promise<Response> {
  const res = await fetch(url, { method: 'POST', headers: headers(target), body: JSON.stringify(body) })

  if (res.status === 429 && attempt < 5) {
    const wait = Number(res.headers.get('Retry-After') ?? 60)
    console.warn(`Rate limited by Interakt; waiting ${wait}s`)
    await new Promise((r) => setTimeout(r, wait * 1000))
    return postWithRetry(url, target, body, attempt + 1)
  }

  if (!res.ok) throw new Error(`Interakt ${res.status} ${res.statusText}: ${await res.text()}`)
  return res
}

/**
 * Full upload. Always regenerates embeddings. Caps: 10,000 documents / 10 MB per request.
 */
export async function uploadDocuments(
  target: IngestTarget,
  documents: InteraktDocument[],
  sourceFileName?: string,
): Promise<UploadSummary & { errors: unknown[] }> {
  if (documents.length === 0) return { total: 0, indexed: 0, failed: 0, errors: [] }

  const res = await postWithRetry(endpoint(target), target, { documents, sourceFileName })
  const json = await res.json()
  const summary = json?.data?.summary

  return {
    total: summary?.total ?? documents.length,
    indexed: summary?.indexed ?? 0,
    failed: summary?.failed ?? 0,
    errors: json?.data?.errors ?? [],
  }
}

/**
 * Every document id currently in the index. The provider refuses deep pagination, so the walk is
 * capped at the documented 10,000-document ceiling.
 */
export async function listDocumentIds(target: IngestTarget): Promise<string[]> {
  const PAGE_SIZE = 100
  const MAX_PAGES = 100
  const ids: string[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${endpoint(target)}?page=${page}&pageSize=${PAGE_SIZE}`, { headers: headers(target) })
    if (!res.ok) throw new Error(`Interakt ${res.status} listing documents: ${await res.text()}`)

    const data = (await res.json())?.data ?? {}
    const docs: { id?: string }[] = data.documents ?? []
    for (const doc of docs) if (doc.id) ids.push(String(doc.id))

    const totalPages = Number(data.pagination?.totalPages ?? 1)
    if (docs.length === 0 || page >= totalPages) break
    if (page === MAX_PAGES) console.warn(`Stopped listing at ${ids.length} documents (paging cap).`)
  }

  return ids
}

export type BulkOperation =
  | { action: 'upload'; document: InteraktDocument; documentId?: string }
  | { action: 'merge'; documentId: string; document: Partial<InteraktDocument> }
  | { action: 'delete'; documentId: string }

/**
 * Mixed batch, up to 10,000 operations. The right endpoint for hook traffic: a `delete` here is
 * idempotent, whereas `DELETE /documents/:id` returns 404 for an already-removed document.
 */
export async function bulkWrite(target: IngestTarget, operations: BulkOperation[]): Promise<unknown> {
  if (operations.length === 0) return null
  const res = await postWithRetry(endpoint(target, '/bulk'), target, { operations })
  return res.json()
}
