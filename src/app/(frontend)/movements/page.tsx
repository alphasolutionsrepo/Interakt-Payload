import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/Section'
import { routes } from '@/lib/format'
import { getMovements } from '@/lib/queries'
import { MOVEMENTS } from '@/lib/taxonomy'

export const metadata: Metadata = { title: 'Movements & periods' }

export default async function MovementsPage() {
  const movements = await getMovements()
  // Present them in the curated (roughly chronological) order rather than alphabetically.
  const order = MOVEMENTS.map((m) => m.value)
  const sorted = [...movements].sort((a, b) => order.indexOf(a.slug ?? '') - order.indexOf(b.slug ?? ''))

  return (
    <>
      <PageHeader eyebrow="Explore by" title="Movements & periods" intro="From the workshops of ancient Egypt to the first abstract paintings — the collection by style, culture and era." />
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {sorted.map((m) => (
          <Link key={m.id} href={routes.movement(m.slug ?? '')} className="group border-t border-line pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-2xl group-hover:text-accent">{m.title}</h2>
              <span className="text-sm text-muted">{m.artworks?.totalDocs ?? 0} works</span>
            </div>
            {m.period && <p className="mt-1 text-sm text-muted">{m.period}</p>}
            {m.description && <p className="mt-3 line-clamp-3 leading-relaxed text-ink/85">{m.description}</p>}
          </Link>
        ))}
      </div>
    </>
  )
}
