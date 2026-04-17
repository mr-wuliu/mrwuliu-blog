import { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { useTranslation } from 'react-i18next'

interface HeadingItem {
  level: number
  text: string
  pos: number
  id: string
}

interface TableOfContentsProps {
  editor: Editor | null
}

function extractHeadings(editor: Editor): HeadingItem[] {
  const headings: HeadingItem[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level as number
      if (level >= 1 && level <= 3) {
        headings.push({
          level,
          text: node.textContent,
          pos,
          id: `toc-${pos}`,
        })
      }
    }
  })
  return headings
}

export default function TableOfContents({ editor }: TableOfContentsProps) {
  const { t } = useTranslation()
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const updateHeadings = useCallback(() => {
    if (!editor) return
    setHeadings(extractHeadings(editor))
  }, [editor])

  // Subscribe to editor content changes
  useEffect(() => {
    if (!editor) return
    updateHeadings()
    editor.on('update', updateHeadings)
    editor.on('transaction', updateHeadings)
    return () => {
      editor.off('update', updateHeadings)
      editor.off('transaction', updateHeadings)
    }
  }, [editor, updateHeadings])

  // Track active heading based on cursor position
  useEffect(() => {
    if (!editor || headings.length === 0) return

    const syncActive = () => {
      const { from } = editor.state.selection
      let closest: HeadingItem | null = null
      for (const heading of headings) {
        if (heading.pos <= from) {
          closest = heading
        } else {
          break
        }
      }
      setActiveId(closest?.id ?? null)
    }

    syncActive()
    editor.on('transaction', syncActive)
    return () => {
      editor.off('transaction', syncActive)
    }
  }, [editor, headings])

  const scrollToHeading = useCallback((pos: number) => {
    if (!editor) return
    editor.commands.setTextSelection(pos)
    editor.commands.scrollIntoView()
  }, [editor])

  if (!editor) return null

  return (
    <div className="px-4 py-6">
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">
        {t('editPost.toc')}
      </div>

      {headings.length === 0 ? (
        <p className="text-xs opacity-30">{t('editPost.tocEmpty')}</p>
      ) : (
        <nav>
          <ul className="space-y-0.5">
            {headings.map((heading) => (
              <li key={heading.id}>
                <button
                  type="button"
                  onClick={() => scrollToHeading(heading.pos)}
                  title={heading.text}
                  className={[
                    'w-full text-left text-sm truncate block cursor-pointer',
                    'transition-opacity hover:opacity-100',
                    heading.level === 1 ? 'pl-0 font-bold' : '',
                    heading.level === 2 ? 'pl-3 font-normal' : '',
                    heading.level === 3 ? 'pl-6 font-normal opacity-60' : '',
                    activeId === heading.id
                      ? 'opacity-100 border-l-2 border-black -ml-0.5'
                      : 'opacity-50',
                  ].join(' ')}
                >
                  {heading.text || '\u2014'}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
