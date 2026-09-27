import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import React from 'react'

import { DropinWidget } from '@/components/interakt/DropinWidget'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { getSiteSettings } from '@/lib/queries'

import './globals.css'

/**
 * Chat images are too large: the assistant writes Markdown images into its replies (`.ik-msg img`,
 * which the widget doesn't style at all, so they render at their natural 800px and overflow the
 * bubble), and result cards stretch images to the full panel width at 4:3. Cap both, and show the
 * whole work (contain) rather than a crop.
 */
const CHAT_CSS = `
  .ik-msg img { display: block; max-width: 100%; max-height: 180px; width: auto; height: auto; object-fit: contain; border-radius: 6px; margin: 8px 0; }
  .ik-card-image { max-height: 170px; object-fit: contain; }
  .ik-grid-cell .ik-card-image, .ik-grid-cell-img { max-height: 110px; object-fit: contain; }
  .ik-list-row .ik-card-image { width: 56px; height: 56px; object-fit: cover; }
`

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings()
  return {
    title: { default: `${site.siteName} — ${site.tagline ?? ''}`, template: `%s — ${site.siteName}` },
    description: 'An open online collection of public-domain artworks, with stories, tours and exhibitions.',
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteSettings()
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <SiteHeader siteName={site.siteName} tagline={site.tagline} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-10 sm:px-6">{children}</main>
        <SiteFooter siteName={site.siteName} credit={site.footerCredit} />
        <DropinWidget kind="chat" config={{ launcher: 'floating', placement: 'bottom-right', title: 'Ask Lumen' }} shadowCss={CHAT_CSS} />
      </body>
    </html>
  )
}
