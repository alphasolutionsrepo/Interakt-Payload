import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArtImage } from '@/components/ArtImage'
import { ArtworkGrid } from '@/components/ArtworkCard'
import { RichText } from '@/components/RichText'
import { SectionHeading } from '@/components/Section'
import type { Artwork } from '@/payload-types'
import { asMedia, exhibitionDates, exhibitionStatus, populated } from '@/lib/format'
import { getExhibitionBySlug } from '@/lib/queries'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await getExhibitionBySlug((await params).slug)
  return e ? { title: e.title, description: e.summary } : {}
}

const STATUS = { current: 'Now showing', upcoming: 'Coming soon', past: 'Past exhibition' } as const

export default async function ExhibitionPage({ params }: Props) {
  const exhibition = await getExhibitionBySlug((await params).slug)
  if (!exhibition) notFound()
  const works = (exhibition.artworks ?? []).map((a) => populated<Artwork>(a)).filter((a): a is Artwork => Boolean(a))
  const isArchive = exhibition.venue === 'aic'

  return (
    <article className="space-y-16">
      <header className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">
            {isArchive ? 'From the archive · Art Institute of Chicago' : STATUS[exhibitionStatus(exhibition)]}
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{exhibition.title}</h1>
          <p className="mt-3 text-muted">{exhibitionDates(exhibition)}</p>
          <p className="mt-6 text-lg leading-relaxed">{exhibition.summary}</p>
          {isArchive && exhibition.sourceUrl && (
            <a href={exhibition.sourceUrl} target="_blank" rel="noreferrer" className="mt-6 inline-block text-sm text-accent hover:underline">
              About this exhibition at artic.edu →
            </a>
          )}
        </div>
        <ArtImage media={asMedia(exhibition.heroImage)} size="hero" priority sizes="(min-width: 1024px) 50vw, 100vw" className="h-auto max-h-[70vh] w-auto rounded-sm" />
      </header>

      {exhibition.body && (
        <div className="mx-auto max-w-2xl">
          <RichText data={exhibition.body} />
        </div>
      )}

      {works.length > 0 && (
        <section className="clear-both">
          <SectionHeading title={isArchive ? `Works from this exhibition in the collection (${works.length})` : `In the exhibition (${works.length})`} />
          <ArtworkGrid artworks={works} />
        </section>
      )}
    </article>
  )
}
