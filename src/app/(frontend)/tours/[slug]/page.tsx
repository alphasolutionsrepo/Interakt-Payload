import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArtImage } from '@/components/ArtImage'
import { attribution } from '@/components/ArtworkCard'
import type { Artwork } from '@/payload-types'
import { asMedia, populated, routes } from '@/lib/format'
import { getTourBySlug } from '@/lib/queries'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = await getTourBySlug((await params).slug)
  return tour ? { title: tour.title, description: tour.intro } : {}
}

export default async function TourPage({ params }: Props) {
  const tour = await getTourBySlug((await params).slug)
  if (!tour) notFound()

  return (
    <article>
      <header className="mx-auto mb-16 max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-accent">
          {tour.theme} · {tour.stops?.length ?? 0} stops · {tour.durationMinutes} minutes
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{tour.title}</h1>
        <p className="mt-5 text-xl leading-relaxed text-muted">{tour.intro}</p>
      </header>

      <ol className="space-y-20">
        {(tour.stops ?? []).map((stop, i) => {
          const artwork = populated<Artwork>(stop.artwork)
          if (!artwork) return null
          return (
            <li key={stop.id ?? i} className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
              <Link href={routes.artwork(artwork.slug ?? '')} className={`flex justify-center rounded-sm bg-surface p-6 ${i % 2 ? 'md:order-2' : ''}`}>
                <ArtImage media={asMedia(artwork.image)} size="card" priority={i < 2} sizes="(min-width: 768px) 45vw, 100vw" className="h-auto max-h-[60vh] w-auto" />
              </Link>
              <div>
                <p className="font-serif text-5xl text-accent/70">{String(i + 1).padStart(2, '0')}</p>
                <h2 className="mt-2 font-serif text-2xl leading-snug">
                  <Link href={routes.artwork(artwork.slug ?? '')} className="hover:text-accent">
                    {artwork.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {attribution(artwork)}
                  {artwork.dateDisplay ? `, ${artwork.dateDisplay}` : ''}
                </p>
                <p className="mt-5 text-[17px] leading-relaxed">{stop.note}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </article>
  )
}
