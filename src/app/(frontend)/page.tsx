import Link from 'next/link'

import { ArtImage } from '@/components/ArtImage'
import { ArtworkGrid, attribution } from '@/components/ArtworkCard'
import { ExhibitionCard, StoryCard, TourCard } from '@/components/Cards'
import { SectionHeading } from '@/components/Section'
import type { Artwork, Exhibition, Story, Tour } from '@/payload-types'
import { asMedia, populated, routes } from '@/lib/format'
import { findArtworks, getHomepage, getMovements, getStories } from '@/lib/queries'

export default async function HomePage() {
  const [home, stories, movements, onView] = await Promise.all([
    getHomepage(),
    getStories({ limit: 4 }),
    getMovements(),
    findArtworks({ isOnView: { equals: true }, artworkType: { equals: 'sculpture' } }, { limit: 8, sort: '-yearStart' }),
  ])
  const hero = populated<Artwork>(home.hero?.artwork)
  const featuredStory = populated<Story>(home.featuredStory)
  const featuredTour = populated<Tour>(home.featuredTour)
  const featuredExhibition = populated<Exhibition>(home.featuredExhibition)
  const highlights = (home.highlights ?? []).map((a) => populated<Artwork>(a)).filter((a): a is Artwork => Boolean(a))
  const moreStories = stories.filter((s) => s.id !== featuredStory?.id).slice(0, 3)

  return (
    <div className="space-y-24">
      {hero && (
        <section className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <Link href={routes.artwork(hero.slug ?? '')} className="block overflow-hidden rounded-sm">
            <ArtImage media={asMedia(hero.image)} size="hero" priority sizes="(min-width: 1024px) 60vw, 100vw" className="h-auto w-full" />
          </Link>
          <div>
            <h1 className="font-serif text-4xl leading-[1.1] sm:text-5xl">{home.hero.heading}</h1>
            {home.hero.text && <p className="mt-5 text-lg leading-relaxed text-muted">{home.hero.text}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/collection" className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper hover:opacity-90">
                Explore the collection
              </Link>
              <Link href="/tours" className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-ink">
                Take a tour
              </Link>
            </div>
            <p className="mt-8 text-sm text-muted">
              On the cover: <span className="italic">{hero.title}</span>, {attribution(hero)}
              {hero.dateDisplay ? `, ${hero.dateDisplay}` : ''}
            </p>
          </div>
        </section>
      )}

      {highlights.length > 0 && (
        <section>
          <SectionHeading eyebrow="From the collection" title="Highlights" href="/collection" linkLabel="Browse everything" />
          <ArtworkGrid artworks={highlights} />
        </section>
      )}

      {(featuredStory || moreStories.length > 0) && (
        <section>
          <SectionHeading eyebrow="Read" title="Stories" href="/stories" />
          <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
            {featuredStory && <StoryCard story={featuredStory} large />}
            <div className="grid gap-8">
              {moreStories.slice(0, 2).map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHeading eyebrow="Explore by" title="Movements & periods" href="/movements" />
        <div className="flex flex-wrap gap-2">
          {movements
            .filter((m) => (m.artworks?.totalDocs ?? 0) > 0)
            .map((m) => (
              <Link
                key={m.id}
                href={routes.movement(m.slug ?? '')}
                className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink"
              >
                {m.title} <span className="text-muted">{m.artworks?.totalDocs}</span>
              </Link>
            ))}
        </div>
      </section>

      {(featuredExhibition || featuredTour) && (
        <section className="grid gap-16 lg:grid-cols-2">
          {featuredExhibition && (
            <div>
              <SectionHeading eyebrow="Visit" title="Exhibition" href="/exhibitions" />
              <ExhibitionCard exhibition={featuredExhibition} />
            </div>
          )}
          {featuredTour && (
            <div>
              <SectionHeading eyebrow="Walk" title="Guided tour" href="/tours" />
              <TourCard tour={featuredTour} />
            </div>
          )}
        </section>
      )}

      {onView.length > 0 && (
        <section>
          <SectionHeading eyebrow="In three dimensions" title="Sculpture on view" href="/collection?type=sculpture&onView=1" />
          <ArtworkGrid artworks={onView} />
        </section>
      )}
    </div>
  )
}
