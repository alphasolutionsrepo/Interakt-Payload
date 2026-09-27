import type { Metadata } from 'next'

import { ExhibitionCard } from '@/components/Cards'
import { PageHeader, SectionHeading } from '@/components/Section'
import { exhibitionStatus } from '@/lib/format'
import { getExhibitions } from '@/lib/queries'

export const metadata: Metadata = { title: 'Exhibitions' }

export default async function ExhibitionsPage() {
  const all = await getExhibitions()
  const lumen = all.filter((e) => e.venue === 'lumen')
  const groups = [
    { title: 'Now showing', items: lumen.filter((e) => exhibitionStatus(e) === 'current') },
    { title: 'Coming soon', items: lumen.filter((e) => exhibitionStatus(e) === 'upcoming') },
    { title: 'Past exhibitions', items: lumen.filter((e) => exhibitionStatus(e) === 'past') },
  ]
  const archive = all.filter((e) => e.venue === 'aic')

  return (
    <>
      <PageHeader eyebrow="Visit" title="Exhibitions" intro="Online exhibitions drawn from the collection, and an archive of exhibitions at the Art Institute of Chicago that featured these works." />
      <div className="space-y-16">
        {groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.title}>
              <SectionHeading title={g.title} />
              <div className="grid gap-12 lg:grid-cols-2">
                {g.items.map((e) => (
                  <ExhibitionCard key={e.id} exhibition={e} />
                ))}
              </div>
            </section>
          ))}
        {archive.length > 0 && (
          <section>
            <SectionHeading title="From the archive" eyebrow="Art Institute of Chicago" />
            <div className="grid gap-12 lg:grid-cols-2">
              {archive.map((e) => (
                <ExhibitionCard key={e.id} exhibition={e} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
