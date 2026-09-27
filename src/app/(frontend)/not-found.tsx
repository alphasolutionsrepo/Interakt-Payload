import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">404</p>
      <h1 className="mt-2 font-serif text-4xl">Nothing hangs here</h1>
      <p className="mt-4 text-muted">The page you were looking for isn’t in the collection.</p>
      <Link href="/collection" className="mt-8 inline-block text-accent hover:underline">
        Browse the collection →
      </Link>
    </div>
  )
}
