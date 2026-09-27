import Link from 'next/link'

import { DropinWidget } from './interakt/DropinWidget'

const NAV = [
  { href: '/collection', label: 'Collection' },
  { href: '/artists', label: 'Artists' },
  { href: '/stories', label: 'Stories' },
  { href: '/exhibitions', label: 'Exhibitions' },
  { href: '/tours', label: 'Tours' },
  { href: '/search', label: 'Search' },
]

export function SiteHeader({ siteName, tagline }: { siteName: string; tagline?: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl tracking-tight">{siteName}</span>
          {tagline && <span className="hidden text-xs uppercase tracking-[0.18em] text-muted sm:inline">{tagline}</span>}
        </Link>
        <div className="flex min-w-0 items-center gap-4">
          <nav className="-mx-2 flex overflow-x-auto text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap px-2 py-1 text-muted hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>
          {/* Interakt's drop-in search: the same index as /search, with no application code. */}
          <DropinWidget kind="search" config={{ mode: 'modal', theme: 'auto' }} className="hidden md:block md:w-56" />
        </div>
      </div>
    </header>
  )
}
