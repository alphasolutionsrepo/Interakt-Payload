export interface IngestTarget {
  baseUrl: string
  indexId: string
  ingestionKey: string
}

export type ServerConfig = IngestTarget & { siteUrl: string }

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

/** Server-side only. The ingestion key must never reach the browser. Throws if unconfigured. */
export function serverConfig(): ServerConfig {
  return {
    baseUrl: required(process.env.INTERAKT_BASE_URL, 'INTERAKT_BASE_URL').replace(/\/$/, ''),
    indexId: required(process.env.INTERAKT_INDEX_ID, 'INTERAKT_INDEX_ID'),
    ingestionKey: required(process.env.INTERAKT_INGESTION_KEY, 'INTERAKT_INGESTION_KEY'),
    siteUrl: siteUrl(),
  }
}

/** For hooks: `null` when Interakt isn't configured, so the CMS keeps working without it. */
export function optionalServerConfig(): ServerConfig | null {
  try {
    return serverConfig()
  } catch {
    return null
  }
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003').replace(/\/$/, '')
