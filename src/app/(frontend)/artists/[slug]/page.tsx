import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArtworkGrid } from '@/components/ArtworkCard'
import { RichText } from '@/components/RichText'
import { SectionHeading } from '@/components/Section'
import type { Artwork, Movement } from '@/payload-types'
import { lifespan, populated, routes } from '@/lib/format'
import { lexicalToPlainText } from '@/lib/lexical'
import { getArtistBySlug } from '@/lib/queries'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtistBySlug((await params).slug)
  if (!artist) return {}
  return { title: artist.name, description: lexicalToPlainText(artist.bio).slice(0, 160) || undefined }
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getArtistBySlug((await params).slug)
  if (!artist) notFound()

  const works = (artist.artworks?.docs ?? []).map((a) => populated<Artwork>(a)).filter((a): a is Artwork => Boolean(a))
  const movements = (artist.movements ?? []).map((m) => populated<Movement>(m)).filter((m): m is Movement => Boolean(m))

  return (
    <div className="space-y-16">
      <header className="grid gap-10 lg:grid-cols-[2fr_3fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Artist</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">{artist.name}</h1>
          <p className="mt-3 text-lg text-muted">
            {[artist.nationality, lifespan(artist.birthYear, artist.deathYear)].filter(Boolean).join(', ')}
          </p>
          {movements.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {movements.map((m) => (
                <Link key={m.id} href={routes.movement(m.slug ?? '')} className="rounded-full border border-line px-3 py-1 text-sm hover:border-ink">
                  {m.title}
                </Link>
              ))}
            </div>
          )}
        </div>
        {artist.bio ? (
          <RichText data={artist.bio} />
        ) : (
          <p className="text-muted">
            {works.length} {works.length === 1 ? 'work' : 'works'} by this artist {works.length === 1 ? 'is' : 'are'} in the collection.
          </p>
        )}
      </header>

      <section>
        <SectionHeading title={`In the collection (${artist.artworks?.docs?.length ?? 0})`} />
        <ArtworkGrid artworks={works} priorityCount={4} />
      </section>
    </div>
  )
}
