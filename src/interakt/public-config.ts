/**
 * Browser-safe Interakt settings. Experience tokens are public, read-only and origin-restricted
 * (an experience with no allowed origins accepts any origin), unlike the server-only ingestion key
 * in ./config.ts.
 */
export const publicConfig = {
  baseUrl: (process.env.NEXT_PUBLIC_INTERAKT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  searchToken: process.env.NEXT_PUBLIC_INTERAKT_SEARCH_TOKEN ?? '',
  chatToken: process.env.NEXT_PUBLIC_INTERAKT_CHAT_TOKEN ?? '',
}
