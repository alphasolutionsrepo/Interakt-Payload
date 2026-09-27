import Link from 'next/link'

export function SiteFooter({ siteName, credit }: { siteName: string; credit?: string | null }) {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm text-muted sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="max-w-xl space-y-3">
          <p className="font-serif text-lg text-ink">{siteName}</p>
          {credit && <p>{credit}</p>}
        </div>
        <div className="flex gap-10">
          <ul className="space-y-1.5">
            <li><Link href="/collection" className="hover:text-ink">Collection</Link></li>
            <li><Link href="/movements" className="hover:text-ink">Movements</Link></li>
            <li><Link href="/artists" className="hover:text-ink">Artists</Link></li>
          </ul>
          <ul className="space-y-1.5">
            <li><Link href="/stories" className="hover:text-ink">Stories</Link></li>
            <li><Link href="/exhibitions" className="hover:text-ink">Exhibitions</Link></li>
            <li><Link href="/tours" className="hover:text-ink">Tours</Link></li>
            <li><Link href="/admin" className="hover:text-ink">Admin</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
