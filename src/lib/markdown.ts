/**
 * Editorial content is authored as Markdown with a small frontmatter block and artwork embeds:
 *
 *   {{artwork:27992}}                  wide embed
 *   {{artwork:27992|inset}}            inset embed
 *   {{artwork:27992|wide|Caption}}     with a custom caption
 *
 * The seed converts it into Lexical JSON, turning each embed into an `artworkEmbed` block node.
 */
import { convertMarkdownToLexical } from '@payloadcms/richtext-lexical'
import type { SanitizedServerEditorConfig } from '@payloadcms/richtext-lexical'

export type Frontmatter = Record<string, string | number | (string | number)[]>

/** Parses `key: value` frontmatter. Values starting with `[` are JSON arrays; numeric values become numbers. */
export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: source }
  const data: Frontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0 || !line.trim()) continue
    const key = line.slice(0, i).trim()
    const raw = line.slice(i + 1).trim()
    if (raw.startsWith('[')) data[key] = JSON.parse(raw)
    else if (/^-?\d+(\.\d+)?$/.test(raw)) data[key] = Number(raw)
    else data[key] = raw.replace(/^["'](.*)["']$/, '$1')
  }
  return { data, body: match[2] }
}

export type Embed = { aicId: number; size: 'wide' | 'inset'; caption?: string }
export type Segment = { kind: 'markdown'; text: string } | { kind: 'embed'; embed: Embed }

const EMBED_LINE = /^\s*\{\{artwork:(\d+)(?:\|(wide|inset))?(?:\|([^}]*))?\}\}\s*$/

/** Splits a Markdown body into prose chunks and artwork embeds (which must sit on their own line). */
export function splitEmbeds(markdown: string): Segment[] {
  const segments: Segment[] = []
  let buffer: string[] = []
  const flush = () => {
    const text = buffer.join('\n').trim()
    if (text) segments.push({ kind: 'markdown', text })
    buffer = []
  }
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(EMBED_LINE)
    if (!m) {
      buffer.push(line)
      continue
    }
    flush()
    segments.push({
      kind: 'embed',
      embed: { aicId: Number(m[1]), size: (m[2] as Embed['size']) ?? 'wide', caption: m[3]?.trim() || undefined },
    })
  }
  flush()
  return segments
}

/** All artwork ids embedded in a Markdown body. */
export const embeddedIds = (markdown: string) =>
  splitEmbeds(markdown).flatMap((s) => (s.kind === 'embed' ? [s.embed.aicId] : []))

type LexicalState = ReturnType<typeof convertMarkdownToLexical>

/**
 * Converts Markdown with embeds to Lexical. `resolveArtwork` maps an AIC id to the Payload artwork
 * id; embeds that don't resolve are dropped.
 */
export function markdownToLexical(
  markdown: string,
  editorConfig: SanitizedServerEditorConfig,
  resolveArtwork: (aicId: number) => number | string | undefined,
): LexicalState {
  const children: unknown[] = []
  for (const segment of splitEmbeds(markdown)) {
    if (segment.kind === 'markdown') {
      const state = convertMarkdownToLexical({ editorConfig, markdown: segment.text })
      children.push(...state.root.children)
      continue
    }
    const artwork = resolveArtwork(segment.embed.aicId)
    if (artwork == null) continue
    children.push({
      type: 'block',
      version: 2,
      format: '',
      fields: {
        id: `embed-${segment.embed.aicId}-${children.length}`,
        blockName: '',
        blockType: 'artworkEmbed',
        artwork,
        size: segment.embed.size,
        ...(segment.embed.caption ? { caption: segment.embed.caption } : {}),
      },
    })
  }
  return {
    root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children },
  } as unknown as LexicalState
}
