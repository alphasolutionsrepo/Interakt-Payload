import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/Section'
import { lifespan, routes } from '@/lib/format'
import { getArtists } from '@/lib/queries'

export const metadata: Metadata = { title: 'Artists' }

export default async function ArtistsPage() {
  const artists = await getArtists()
  const withBio = artists.filter((a) => a.bio)
  const byLetter = new Map<string, typeof artists>()
  for (const a of artists) {
    const letter = a.name.normalize('NFKD').charAt(0).toUpperCase()
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), a])
  }

  return (
    <>
      <PageHeader eyebrow="People" title="Artists" intro={`${artists.length} artists and makers represented in the collection.`} />

      <section className="mb-16">
        <h2 className="mb-5 font-serif text-2xl">Featured artists</h2>
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {withBio.map((a) => (
            <Link key={a.id} href={routes.artist(a.slug ?? '')} className="group flex items-baseline justify-between gap-3 border-b border-line py-2">
              <span className="font-serif text-lg group-hover:text-accent">{a.name}</span>
              <span className="text-xs text-muted">{a.artworks?.totalDocs}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-5 font-serif text-2xl">A–Z</h2>
        <div className="columns-1 gap-10 sm:columns-2 lg:columns-3">
          {[...byLetter.entries()].map(([letter, list]) => (
            <div key={letter} className="mb-6 break-inside-avoid">
              <p className="mb-1 font-serif text-xl text-accent">{letter}</p>
              <ul className="space-y-1 text-sm">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link href={routes.artist(a.slug ?? '')} className="hover:text-accent">
                      {a.name}
                    </Link>
                    <span className="text-muted"> {lifespan(a.birthYear, a.deathYear)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
