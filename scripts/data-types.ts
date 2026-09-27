/** Shapes of the committed seed data under data/. Shared by fetch-aic.ts and seed.ts. */

export type AicArtwork = {
  aicId: number
  title: string
  slug: string
  artistAicId?: number
  culture?: string
  artistDisplay?: string
  dateDisplay?: string
  yearStart?: number
  yearEnd?: number
  department?: string
  artworkType?: string
  movement?: string
  placeOfOrigin?: string
  country?: string
  region?: string
  medium?: string
  materials: string[]
  techniques: string[]
  subjects: string[]
  colorFamily?: string
  dominantColor?: string
  dimensions?: string
  creditLine?: string
  referenceNumber?: string
  isOnView: boolean
  gallery?: string
  description: string
  altText: string
  imageId: string
  imageWidth?: number
  imageHeight?: number
  sourceUrl: string
}

export type AicArtist = {
  aicId: number
  name: string
  slug: string
  birthYear?: number
  deathYear?: number
  nationality?: string
  movements: string[]
  artworkCount: number
}

export type AicExhibition = {
  aicId: number
  title: string
  slug: string
  startDate?: string
  endDate?: string
  description: string
  artworkAicIds: number[]
  sourceUrl: string
}

// --- Editorial content written for the demo (data/editorial/) --------------------------------

export type EditorialArtist = {
  /** Matches AicArtist.aicId. */
  aicId: number
  /** Display name override, e.g. "El Greco" instead of AIC's "Domenico Theotokópoulos, called El Greco". */
  name?: string
  bio: string
}

export type EditorialMovement = {
  slug: string
  period: string
  description: string
}

export type EditorialTour = {
  title: string
  slug: string
  theme: string
  durationMinutes: number
  intro: string
  stops: { aicId: number; note: string }[]
}

export type EditorialExhibition = {
  title: string
  slug: string
  startDate: string
  endDate: string
  summary: string
  /** Markdown with artwork embeds. */
  description: string
  artworkAicIds: number[]
}
