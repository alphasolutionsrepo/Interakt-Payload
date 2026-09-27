import { editorConfigFactory } from '@payloadcms/richtext-lexical'
import { describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { lexicalToPlainText, readingMinutes } from '@/lib/lexical'
import { embeddedIds, markdownToLexical, parseFrontmatter, splitEmbeds } from '@/lib/markdown'

describe('parseFrontmatter', () => {
  it('parses strings, numbers and JSON arrays', () => {
    const { data, body } = parseFrontmatter(
      '---\ntitle: How Monet Painted: Weather\nhero: 16568\nrelated: [1, 2]\nmovements: ["impressionism"]\n---\nBody text',
    )
    expect(data).toEqual({ title: 'How Monet Painted: Weather', hero: 16568, related: [1, 2], movements: ['impressionism'] })
    expect(body).toBe('Body text')
  })

  it('returns the whole source as body without frontmatter', () => {
    expect(parseFrontmatter('Just text')).toEqual({ data: {}, body: 'Just text' })
  })
})

describe('splitEmbeds', () => {
  it('splits prose and embeds with size and caption', () => {
    const md = 'Intro para.\n\n{{artwork:27992}}\n\nMiddle.\n{{artwork:87479|inset}}\n{{artwork:111442|wide|The Child’s Bath}}\nEnd.'
    expect(splitEmbeds(md)).toEqual([
      { kind: 'markdown', text: 'Intro para.' },
      { kind: 'embed', embed: { aicId: 27992, size: 'wide', caption: undefined } },
      { kind: 'markdown', text: 'Middle.' },
      { kind: 'embed', embed: { aicId: 87479, size: 'inset', caption: undefined } },
      { kind: 'embed', embed: { aicId: 111442, size: 'wide', caption: 'The Child’s Bath' } },
      { kind: 'markdown', text: 'End.' },
    ])
    expect(embeddedIds(md)).toEqual([27992, 87479, 111442])
  })

  it('ignores embeds that are not on their own line', () => {
    expect(splitEmbeds('See {{artwork:1}} inline')).toEqual([{ kind: 'markdown', text: 'See {{artwork:1}} inline' }])
  })
})

describe('markdownToLexical', () => {
  it('converts prose and resolves embeds into artworkEmbed blocks', async () => {
    const editorConfig = await editorConfigFactory.default({ config: await config })
    const state = markdownToLexical(
      '## Heading\n\nA paragraph with **bold**.\n\n{{artwork:1|inset}}\n\n{{artwork:999}}\n\nAfter.',
      editorConfig,
      (aicId) => (aicId === 1 ? 42 : undefined),
    )
    const types = state.root.children.map((c) => c.type)
    expect(types).toEqual(['heading', 'paragraph', 'block', 'paragraph'])
    const block = state.root.children[2] as unknown as { fields: Record<string, unknown> }
    expect(block.fields).toMatchObject({ blockType: 'artworkEmbed', artwork: 42, size: 'inset' })
    expect(lexicalToPlainText(state)).toBe('Heading\nA paragraph with bold.\nAfter.')
    expect(readingMinutes(state)).toBe(1)
  })
})
