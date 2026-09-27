import Link from 'next/link'

export function SectionHeading({ title, href, linkLabel = 'View all', eyebrow }: { title: string; href?: string; linkLabel?: string; eyebrow?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-3">
      <div>
        {eyebrow && <p className="mb-1 text-xs uppercase tracking-[0.18em] text-muted">{eyebrow}</p>}
        <h2 className="font-serif text-2xl sm:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm text-accent hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string | null }) {
  return (
    <div className="mb-10 max-w-3xl">
      {eyebrow && <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted">{eyebrow}</p>}
      <h1 className="font-serif text-4xl leading-tight sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>}
    </div>
  )
}
