import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArtImage } from '@/components/ArtImage'
import { ArtworkGrid, attribution } from '@/components/ArtworkCard'
import { SectionHeading } from '@/components/Section'
import type { Artist, Movement, Subject } from '@/payload-types'
import { asMedia, lifespan, populated, routes } from '@/lib/format'
import { findArtworks, getArtworkBySlug } from '@/lib/queries'
import { ARTWORK_TYPES, COLOR_FAMILIES, DEPARTMENTS, ERAS, labelFor, REGIONS } from '@/lib/taxonomy'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artwork = await getArtworkBySlug((await params).slug)
  if (!artwork) return {}
  return { title: `${artwork.title}, ${attribution(artwork)}`, description: artwork.description ?? undefined }
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 border-b border-line py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

const FacetLink = ({ param, value, label }: { param: string; value?: string | null; label?: string | null }) =>
  value ? (
    <Link href={routes.collection(`?${param}=${encodeURIComponent(value)}`)} className="text-accent hover:underline">
      {label ?? value}
    </Link>
  ) : null

export default async function ArtworkPage({ params }: Props) {
  const artwork = await getArtworkBySlug((await params).slug)
  if (!artwork) notFound()

  const artist = populated<Artist>(artwork.artist)
  const movement = populated<Movement>(artwork.movement)
  const subjects = (artwork.subjects ?? []).map((s) => populated<Subject>(s)).filter((s): s is Subject => Boolean(s))
  const image = asMedia(artwork.image)

  const [byArtist, byMovement] = await Promise.all([
    artist ? findArtworks({ and: [{ artist: { equals: artist.id } }, { id: { not_equals: artwork.id } }] }, { limit: 8, sort: 'yearStart' }) : [],
    movement
      ? findArtworks(
          { and: [{ movement: { equals: movement.id } }, { id: { not_equals: artwork.id } }, ...(artist ? [{ artist: { not_equals: artist.id } }] : [])] },
          { limit: 8, sort: '-isOnView' },
        )
      : [],
  ])

  return (
    <article className="space-y-20">
      <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex justify-center rounded-sm bg-surface p-4 sm:p-8">
            <ArtImage media={image} size="hero" priority sizes="(min-width: 1024px) 60vw, 100vw" className="h-auto max-h-[78vh] w-auto" />
          </div>
          {image?.credit && <p className="mt-2 text-xs text-muted">Image: {image.credit}</p>}
        </div>

        <div>
          {movement && (
            <Link href={routes.movement(movement.slug ?? '')} className="text-xs uppercase tracking-[0.16em] text-accent hover:underline">
              {movement.title}
            </Link>
          )}
          <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">{artwork.title}</h1>
          <p className="mt-3 text-lg">
            {artist ? (
              <Link href={routes.artist(artist.slug ?? '')} className="hover:text-accent">
                {artist.name}
              </Link>
            ) : (
              attribution(artwork)
            )}
            {artist && (artist.nationality || artist.birthYear) && (
              <span className="text-muted">
                {' '}
                ({[artist.nationality, lifespan(artist.birthYear, artist.deathYear)].filter(Boolean).join(', ')})
              </span>
            )}
          </p>
          <p className="text-muted">{artwork.dateDisplay}</p>

          {artwork.description && <p className="mt-6 text-[17px] leading-relaxed">{artwork.description}</p>}

          {artwork.isOnView && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm">
              <span className="size-2 rounded-full bg-accent" /> On view{artwork.gallery ? ` · ${artwork.gallery}` : ''}
            </p>
          )}

          <dl className="mt-8 border-t border-line">
            <Fact label="Medium">{artwork.medium}</Fact>
            <Fact label="Dimensions">{artwork.dimensions}</Fact>
            <Fact label="Type">
              <FacetLink param="type" value={artwork.artworkType} label={labelFor(ARTWORK_TYPES, artwork.artworkType)} />
            </Fact>
            <Fact label="Period">
              {artwork.century}
              {/* The 19th/20th-century eras would just repeat the century label. */}
              {artwork.era && !artwork.era.endsWith('-century') && (
                <>
                  {' · '}
                  <FacetLink param="era" value={artwork.era} label={labelFor(ERAS, artwork.era)} />
                </>
              )}
            </Fact>
            <Fact label="Origin">
              {[artwork.placeOfOrigin, artwork.country !== artwork.placeOfOrigin ? artwork.country : null].filter(Boolean).join(', ')}
              {artwork.region && (
                <>
                  {' · '}
                  <FacetLink param="region" value={artwork.region} label={labelFor(REGIONS, artwork.region)} />
                </>
              )}
            </Fact>
            <Fact label="Department">
              <FacetLink param="department" value={artwork.department} label={labelFor(DEPARTMENTS, artwork.department)} />
            </Fact>
            <Fact label="Colour">
              {artwork.colorFamily && (
                <span className="inline-flex items-center gap-2">
                  <span className="size-3.5 rounded-full border border-line" style={{ background: artwork.dominantColor ?? undefined }} />
                  <FacetLink param="color" value={artwork.colorFamily} label={labelFor(COLOR_FAMILIES, artwork.colorFamily)} />
                </span>
              )}
            </Fact>
            <Fact label="Subjects">
              {subjects.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <Link key={s.id} href={routes.collection(`?subject=${s.slug}`)} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink">
                      {s.title}
                    </Link>
                  ))}
                </span>
              )}
            </Fact>
            <Fact label="Credit">{artwork.creditLine}</Fact>
            <Fact label="Source">
              {artwork.sourceUrl && (
                <a href={artwork.sourceUrl} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                  Art Institute of Chicago{artwork.referenceNumber ? ` · ${artwork.referenceNumber}` : ''}
                </a>
              )}
            </Fact>
          </dl>
        </div>
      </div>

      {byArtist.length > 0 && artist && (
        <section>
          <SectionHeading title={`More by ${artist.name}`} href={routes.artist(artist.slug ?? '')} linkLabel="Artist page" />
          <ArtworkGrid artworks={byArtist} />
        </section>
      )}
      {byMovement.length > 0 && movement && (
        <section>
          <SectionHeading title={`More from ${movement.title}`} href={routes.collection(`?movement=${movement.slug}`)} />
          <ArtworkGrid artworks={byMovement} />
        </section>
      )}
    </article>
  )
}
