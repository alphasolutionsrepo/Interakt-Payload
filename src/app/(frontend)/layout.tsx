import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import React from 'react'

import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { getSiteSettings } from '@/lib/queries'

import './globals.css'

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
      </body>
    </html>
  )
}
