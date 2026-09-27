/**
 * `npm run interakt:sync` — full Payload → Interakt sync.
 *
 *   npm run interakt:sync
 *   npm run interakt:sync -- --allow-empty    (permit purging the index)
 *
 * Safe to re-run: ids are `<type>-<payload id>`, so a second run updates in place. Run it after
 * `npm run seed` (the seed skips the live hooks).
 *
 * It reconciles rather than only uploading: anything in the index that is no longer in Payload
 * (deleted, or a story that was unpublished while the hooks were off) is deleted.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { serverConfig } from '../src/interakt/config'
import { bulkWrite, listDocumentIds, uploadDocuments } from '../src/interakt/ingest'
import { buildAll } from '../src/interakt/indexer'

const BATCH_SIZE = 250
const DELETE_BATCH_SIZE = 500

async function main() {
  const allowEmpty = process.argv.includes('--allow-empty')
  const target = serverConfig()
  const payload = await getPayload({ config })

  const docs = await buildAll(payload, target.siteUrl)
  const byType = docs.reduce<Record<string, number>>((m, d) => ({ ...m, [d.type]: (m[d.type] ?? 0) + 1 }), {})
  console.log(`Built ${docs.length} documents: ${Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(', ')}`)

  // Reconciling on an empty result would wipe the index; that almost always means a wrong
  // DATABASE_URL rather than a genuinely empty CMS.
  if (docs.length === 0 && !allowEmpty) {
    console.error('Payload returned no documents. Refusing to reconcile (it would empty the index). Use --allow-empty if intended.')
    process.exitCode = 1
    return
  }

  let indexed = 0
  let failed = 0
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE)
    process.stdout.write(`Indexing ${i + 1}–${i + batch.length}… `)
    const summary = await uploadDocuments(target, batch, `payload-sync-${Date.now()}.json`)
    indexed += summary.indexed
    failed += summary.failed
    console.log(`indexed=${summary.indexed} failed=${summary.failed}`)
    for (const err of summary.errors.slice(0, 5)) console.error('  ingest error:', JSON.stringify(err))
  }

  process.stdout.write('Checking for stale documents… ')
  const current = new Set(docs.map((d) => d.id))
  const existing = await listDocumentIds(target)
  const stale = existing.filter((id) => !current.has(id))
  console.log(`${existing.length} in index, ${stale.length} stale`)

  for (let i = 0; i < stale.length; i += DELETE_BATCH_SIZE) {
    const batch = stale.slice(i, i + DELETE_BATCH_SIZE)
    await bulkWrite(target, batch.map((documentId) => ({ action: 'delete' as const, documentId })))
    for (const id of batch) console.log(`  deleted ${id}`)
  }

  console.log(`\nDone. indexed=${indexed} failed=${failed} deleted=${stale.length}`)
  if (failed > 0) process.exitCode = 1
}

// `payload run` only awaits the module import, so the work must happen in top-level await.
try {
  await main()
  process.exit(process.exitCode ?? 0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
