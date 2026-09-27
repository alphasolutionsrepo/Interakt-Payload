import type { Metadata } from 'next'

import { TourCard } from '@/components/Cards'
import { PageHeader } from '@/components/Section'
import { getTours } from '@/lib/queries'

export const metadata: Metadata = { title: 'Tours' }

export default async function ToursPage() {
  const tours = await getTours()
  return (
    <>
      <PageHeader eyebrow="Walk" title="Guided tours" intro="Themed walks through the collection that cross centuries and continents. Each takes 20–30 minutes." />
      <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((t) => (
          <TourCard key={t.id} tour={t} />
        ))}
      </div>
    </>
  )
}
