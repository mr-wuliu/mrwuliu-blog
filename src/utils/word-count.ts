// CJK ideographs, kana, and hangul: each character counts as one word.
const CJK_CHARS = /[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g

/**
 * CJK-aware word count: whitespace-delimited words count as one word each,
 * CJK characters count individually. Expects plain text — strip HTML at the
 * call site.
 */
export function countWords(text: string): number {
  const cjkCharCount = text.match(CJK_CHARS)?.length ?? 0
  const nonCjkWordCount = text.replace(CJK_CHARS, ' ').split(/\s+/).filter(Boolean).length
  return nonCjkWordCount + cjkCharCount
}
