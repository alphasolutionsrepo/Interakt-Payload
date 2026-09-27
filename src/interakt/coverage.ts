/**
 * Smallest subset of `docs` in which every field seen anywhere appears at least
 * once. Greedy: repeatedly take the document contributing the most new fields.
 *
 * Used to build the mapping sample for Interakt. Field coverage is what matters
 * there, not volume — a field Interakt never sees in the sample won't exist in
 * the mapping, and sparse fields (`culture` on some artworks, `venue` only on
 * exhibitions) are exactly the ones a naive "first N of each type" sample misses.
 *
 * Ported unchanged from ../Interakt-Sanity/src/interakt/coverage.ts.
 */
export function coveringSet<T extends Record<string, unknown>>(docs: T[]): T[] {
  const fieldsOf = (d: T) =>
    new Set(
      Object.entries(d)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k),
    )

  const missing = new Set<string>()
  for (const d of docs) for (const f of fieldsOf(d)) missing.add(f)

  const chosen: T[] = []
  const pool = [...docs]

  while (missing.size > 0 && pool.length > 0) {
    let bestIndex = 0
    let bestGain = -1

    pool.forEach((doc, i) => {
      let gain = 0
      for (const f of fieldsOf(doc)) if (missing.has(f)) gain++
      if (gain > bestGain) {
        bestGain = gain
        bestIndex = i
      }
    })

    if (bestGain <= 0) break

    const [picked] = pool.splice(bestIndex, 1)
    chosen.push(picked)
    for (const f of fieldsOf(picked)) missing.delete(f)
  }

  return chosen
}
