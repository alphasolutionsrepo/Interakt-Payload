/** Helpers for working with Lexical JSON outside the editor. */

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }
type LexicalDoc = { root?: LexicalNode } | null | undefined

/** Flattens Lexical rich text to plain text (block nodes are skipped). */
export function lexicalToPlainText(doc: LexicalDoc): string {
  const out: string[] = []
  const walk = (node: LexicalNode) => {
    if (node.type === 'block') return
    if (typeof node.text === 'string') out.push(node.text)
    node.children?.forEach(walk)
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'listitem' || node.type === 'quote') out.push('\n')
  }
  if (doc?.root) walk(doc.root)
  return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim()
}

export function readingMinutes(doc: LexicalDoc, wordsPerMinute = 220): number {
  const words = lexicalToPlainText(doc).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / wordsPerMinute))
}
