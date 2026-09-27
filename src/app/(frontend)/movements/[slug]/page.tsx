import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArtworkGrid } from '@/components/ArtworkCard'
import { StoryCard } from '@/components/Cards'
import { PageHeader, SectionHeading } from '@/components/Section'
import { routes } from '@/lib/format'
import { findArtworks, getMovementBySlug, getStories } from '@/lib/queries'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const movement = await getMovementBySlug((await params).slug)
  return movement ? { title: movement.title, description: movement.description ?? undefined } : {}
}

export default async function MovementPage({ params }: Props) {
  const movement = await getMovementBySlug((await params).slug)
  if (!movement) notFound()
  const [works, stories] = await Promise.all([
    findArtworks({ movement: { equals: movement.id } }, { limit: 24, sort: 'yearStart' }),
    getStories({ where: { movements: { contains: movement.id } }, limit: 3 }),
  ])

  return (
    <div className="space-y-16">
      <PageHeader eyebrow={movement.period ?? 'Movement'} title={movement.title} intro={movement.description} />
      <section>
        <SectionHeading title="Works" href={routes.collection(`?movement=${movement.slug}`)} linkLabel="Filter in the collection" />
        <ArtworkGrid artworks={works} priorityCount={4} />
      </section>
      {stories.length > 0 && (
        <section>
          <SectionHeading title="Related stories" href="/stories" />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
