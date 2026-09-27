/**
 * Keeps the Interakt index in sync as editors work. Replaces the Sanity demo's webhook: Payload
 * runs in-process, so there is no signature to verify and no tunnel to set up.
 *
 *  - Skipped when `context.seeding` or `context.skipInterakt` is set (the seed runs thousands of
 *    writes; run `npm run interakt:sync` afterwards instead) and when Interakt isn't configured.
 *  - Never fails the editor's save: errors are logged, and the backfill reconciles later.
 *  - Stories are indexed from their *published* version, so saving a draft of a published story
 *    doesn't pull it from search, and unpublishing removes it.
 *  - An artwork change also refreshes its artist and movement, whose documents include the
 *    artwork's title and the work count.
 */
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload, PayloadRequest } from 'payload'

import { optionalServerConfig } from './config'
import { bulkWrite, type BulkOperation } from './ingest'
import { buildDocument, documentId, type IndexedCollection } from './indexer'

type Ref = { collection: IndexedCollection; id: number }

const relId = (v: unknown): number | undefined =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? Number((v as { id: number }).id) : undefined

function skip(context: Record<string, unknown>) {
  return Boolean(context.seeding || context.skipInterakt)
}

async function sync(payload: Payload, refs: Ref[], req: PayloadRequest) {
  const config = optionalServerConfig()
  if (!config) return
  try {
    const operations: BulkOperation[] = []
    for (const ref of refs) {
      const doc = await buildDocument(payload, ref.collection, ref.id, config.siteUrl, req)
      operations.push(doc ? { action: 'upload', document: doc } : { action: 'delete', documentId: documentId(ref.collection, ref.id) })
    }
    await bulkWrite(config, operations)
    payload.logger.info(`[interakt] ${operations.map((o) => `${o.action} ${'document' in o ? o.document.id : o.documentId}`).join(', ')}`)
  } catch (err) {
    payload.logger.error({ err }, `[interakt] sync failed for ${refs.map((r) => documentId(r.collection, r.id)).join(', ')}`)
  }
}

/** Artworks also refresh their (current and previous) artist and movement. */
export function relatedRefs(collection: IndexedCollection, doc: Record<string, unknown>, previousDoc?: Record<string, unknown>): Ref[] {
  if (collection !== 'artworks') return []
  const refs: Ref[] = []
  for (const [field, target] of [['artist', 'artists'], ['movement', 'movements']] as const) {
    for (const source of [doc, previousDoc]) {
      const id = relId(source?.[field])
      if (id && !refs.some((r) => r.collection === target && r.id === id)) refs.push({ collection: target, id })
    }
  }
  return refs
}

export const interaktAfterChange =
  (collection: IndexedCollection): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req, context }) => {
    if (skip(context)) return doc
    await sync(req.payload, [{ collection, id: doc.id }, ...relatedRefs(collection, doc, previousDoc)], req)
    return doc
  }

export const interaktAfterDelete =
  (collection: IndexedCollection): CollectionAfterDeleteHook =>
  async ({ doc, req, context }) => {
    if (skip(context)) return doc
    const config = optionalServerConfig()
    if (!config) return doc
    try {
      await bulkWrite(config, [{ action: 'delete', documentId: documentId(collection, doc.id) }])
      req.payload.logger.info(`[interakt] delete ${documentId(collection, doc.id)}`)
    } catch (err) {
      req.payload.logger.error({ err }, `[interakt] delete failed for ${documentId(collection, doc.id)}`)
    }
    // The artist/movement lose a work; refresh them (after the delete, so counts are right).
    const related = relatedRefs(collection, doc)
    if (related.length) await sync(req.payload, related, req)
    return doc
  }
