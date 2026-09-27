import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * Content is cross-linked everywhere (artwork cards on stories, tours, the homepage…), so any
 * change revalidates the whole site rather than tracking individual paths.
 * Skipped for the seed script, which runs outside Next.js and sets `context.seeding`.
 */
function revalidateSite(context: Record<string, unknown>) {
  if (context.seeding) return
  try {
    revalidatePath('/', 'layout')
  } catch {
    // Outside a Next.js request (e.g. a Local API script) there is nothing to revalidate.
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, context }) => {
  revalidateSite(context)
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, context }) => {
  revalidateSite(context)
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, context }) => {
  revalidateSite(context)
  return doc
}
