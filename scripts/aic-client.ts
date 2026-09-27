/**
 * Minimal Art Institute of Chicago API client.
 *
 * AIC asks API consumers to identify themselves with the `AIC-User-Agent` header. Its IIIF image
 * server goes further and returns 403 without it, which is why images are downloaded at fetch time
 * and uploaded into Payload rather than hotlinked.
 */

const API = 'https://api.artic.edu/api/v1'
const IIIF = 'https://www.artic.edu/iiif/2'
const HEADERS = { 'AIC-User-Agent': 'lumen-interakt-demo (rv@alpha-solutions.us)' }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function aicGet<T>(path: string, attempt = 1): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: HEADERS })
  if ((res.status === 429 || res.status >= 500) && attempt <= 4) {
    await sleep(1000 * 2 ** attempt)
    return aicGet(path, attempt + 1)
  }
  if (!res.ok) throw new Error(`AIC ${res.status} for ${path}`)
  return (await res.json()) as T
}

export async function downloadImage(imageId: string, width = 1686): Promise<Buffer> {
  const url = `${IIIF}/${imageId}/full/${width},/0/default.jpg`
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: HEADERS })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > 0) return buf
    }
    // Very large widths can exceed what IIIF will serve for small originals; fall back to 843.
    if (res.status === 403 && width !== 843) return downloadImage(imageId, 843)
    if (attempt >= 4) throw new Error(`IIIF ${res.status} for ${imageId}`)
    await sleep(1000 * 2 ** attempt)
  }
}

export { sleep }
