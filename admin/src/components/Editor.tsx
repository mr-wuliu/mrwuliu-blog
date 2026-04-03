import { useRef, useCallback } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { Mathematics, BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { InputRule } from '@tiptap/core'
import { Plugin, TextSelection } from '@tiptap/pm/state'
import 'katex/dist/katex.min.css'
import BlockMathView from './math/BlockMathView'
import InlineMathView from './math/InlineMathView'
import { normalizeCodeBlockLanguage } from './codeBlockLanguages'
import CodeBlockNodeView from './CodeBlockNodeView'

const lowlight = createLowlight(common)
const INDENT = '    '
const PAIR_CHARS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
}
const CLOSING_CHARS = new Set<string>(Object.values(PAIR_CHARS))
const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  python: ['def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while', 'return', 'try', 'except', 'with', 'as', 'lambda', 'print'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'enum', 'static', 'final', 'void', 'new', 'if', 'else', 'for', 'while', 'try', 'catch', 'return'],
  javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'async', 'await', 'import', 'export', 'class', 'new', 'try', 'catch'],
  typescript: ['function', 'const', 'let', 'interface', 'type', 'enum', 'implements', 'extends', 'if', 'else', 'for', 'while', 'return', 'async', 'await', 'import', 'export'],
  go: ['func', 'package', 'import', 'type', 'struct', 'interface', 'if', 'else', 'for', 'range', 'switch', 'case', 'defer', 'go', 'return'],
  rust: ['fn', 'let', 'mut', 'struct', 'enum', 'impl', 'trait', 'if', 'else', 'for', 'while', 'match', 'use', 'pub', 'return', 'Result', 'Option'],
}

const CustomMathematics = Mathematics.extend({
  addExtensions() {
    const { inlineOptions, blockOptions, katexOptions } = this.options

    const TyporaBlockMath = BlockMath.extend({
      addInputRules() {
        return [
          new InputRule({
            find: /^\$\$([^$]+)\$\$$/,
            handler: ({ state, range, match }) => {
              const [, latex] = match
              state.tr.replaceWith(range.from, range.to, this.type.create({ latex }))
            },
          }),
        ]
      },

      addCommands() {
        return {
          insertBlockMath:
            (options: { latex: string; pos?: number }) =>
            ({ commands, editor }) => {
              const { latex, pos } = options
              return commands.insertContentAt(pos ?? editor.state.selection.from, {
                type: this.name,
                attrs: { latex },
              })
            },
          deleteBlockMath:
            (options?: { pos?: number }) =>
            ({ editor, tr }) => {
              const pos = options?.pos ?? editor.state.selection.$from.pos
              const node = editor.state.doc.nodeAt(pos)
              if (!node || node.type.name !== this.name) {
                return false
              }
              tr.delete(pos, pos + node.nodeSize)
              return true
            },
          updateBlockMath:
            (options?: { latex: string; pos?: number }) =>
            ({ editor, tr }) => {
              const latex = options?.latex
              let pos = options?.pos
              if (pos === undefined) {
                pos = editor.state.selection.$from.pos
              }
              const node = editor.state.doc.nodeAt(pos)
              if (!node || node.type.name !== this.name) {
                return false
              }
              tr.setNodeMarkup(pos, this.type, {
                ...node.attrs,
                latex: latex || node.attrs.latex,
              })
              return true
            },
        }
      },

      addKeyboardShortcuts() {
        return {
          Enter: ({ editor }) => {
            const { $from } = editor.state.selection
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
            if (textBefore.endsWith('$$')) {
              return editor.chain()
                .deleteRange({ from: $from.pos - 2, to: $from.pos })
                .insertContent({ type: this.name, attrs: { latex: '' } })
                .run()
            }
            return false
          },
        }
      },

      addNodeView() {
        return ReactNodeViewRenderer(BlockMathView, {
          stopEvent: ({ event }) => {
            const target = event.target as HTMLElement
            return target.tagName === 'TEXTAREA' || target.tagName === 'INPUT'
          },
        })
      },
    })

    const TyporaInlineMath = InlineMath.extend({
      addInputRules() {
        return [
          new InputRule({
            find: /(?<!\$)\$([^$\n]+?)\$(?!\$)/,
            handler: ({ state, range, match }) => {
              const [, latex] = match
              state.tr.replaceWith(range.from, range.to, this.type.create({ latex }))
            },
          }),
        ]
      },

      addNodeView() {
        return ReactNodeViewRenderer(InlineMathView, {
          stopEvent: ({ event }) => {
            const target = event.target as HTMLElement
            return target.tagName === 'TEXTAREA' || target.tagName === 'INPUT'
          },
        })
      },
    })

    return [
      TyporaBlockMath.configure({ ...blockOptions, katexOptions }),
      TyporaInlineMath.configure({ ...inlineOptions, katexOptions }),
    ]
  },
})

interface EditorProps {
  content: string
  onChange: (html: string) => void
}

export default function Editor({ content, onChange }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }).extend({
        addProseMirrorPlugins() {
          const basePlugins = this.parent?.() ?? []
          return [
            ...basePlugins,
            new Plugin({
              props: {
                handleKeyDown: (view, event) => {
                  const { state } = view
                  const { selection } = state
                  const { $from, $to, empty } = selection
                  const inCodeBlock = $from.parent.type.name === this.name && $to.parent.type.name === this.name

                  if (!inCodeBlock) {
                    return false
                  }

                  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'a') {
                    event.preventDefault()
                    const from = $from.start()
                    const to = $from.end()
                    const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to))
                    view.dispatch(tr)
                    return true
                  }

                  if (event.key === 'Tab') {
                    event.preventDefault()
                    const tr = state.tr
                    if (event.shiftKey && empty) {
                      const lineStart = selection.from - ($from.parentOffset - ($from.parent.textContent.lastIndexOf('\n', $from.parentOffset - 1) + 1))
                      const leading = state.doc.textBetween(lineStart, Math.min(lineStart + INDENT.length, selection.from), '\n', '\n')
                      if (leading === INDENT) {
                        tr.delete(lineStart, lineStart + INDENT.length)
                      } else if (leading.startsWith(' ')) {
                        const spaces = Math.min(leading.length, INDENT.length)
                        tr.delete(lineStart, lineStart + spaces)
                      } else {
                        return true
                      }
                    } else {
                      tr.insertText(INDENT, selection.from, selection.to)
                    }
                    view.dispatch(tr)
                    return true
                  }

                  if ((event.ctrlKey || event.metaKey) && event.key === ' ') {
                    event.preventDefault()
                    const language = normalizeCodeBlockLanguage(($from.parent.attrs.language as string) || '')
                    const keywordPool = LANGUAGE_KEYWORDS[language] ?? []
                    if (!keywordPool.length) {
                      return true
                    }

                    const codeText = $from.parent.textContent
                    const before = codeText.slice(0, $from.parentOffset)
                    const match = before.match(/([A-Za-z_][A-Za-z0-9_]*)$/)
                    const prefix = match?.[1] ?? ''
                    const suggestions = keywordPool
                      .filter((keyword) => keyword.startsWith(prefix) && keyword !== prefix)
                      .slice(0, 8)

                    if (!suggestions.length) {
                      return true
                    }

                    const suggestion = window.prompt(
                      `Auto complete (${language || 'text'}): ${suggestions.join(', ')}`,
                      suggestions[0]
                    )

                    if (!suggestion) {
                      return true
                    }

                    const from = selection.from - prefix.length
                    const tr = state.tr.insertText(suggestion, from, selection.from)
                    view.dispatch(tr)
                    return true
                  }

                  if (event.key === 'Enter' && empty) {
                    event.preventDefault()
                    const codeText = $from.parent.textContent
                    const offset = $from.parentOffset
                    const before = codeText.slice(0, offset)
                    const after = codeText.slice(offset)
                    const currentLine = before.split('\n').pop() ?? ''
                    const nextLine = after.split('\n')[0] ?? ''
                    const baseIndent = currentLine.match(/^\s*/)?.[0] ?? ''
                    const shouldIndentMore =
                      /(?:\{|\[|\(|:)\s*$/.test(currentLine.trimEnd())
                    const shouldDedent =
                      /^\s*[\]\})]/.test(nextLine)
                    let indent = baseIndent

                    if (shouldIndentMore) {
                      indent += INDENT
                    }
                    if (shouldDedent && indent.length >= INDENT.length) {
                      indent = indent.slice(0, -INDENT.length)
                    }

                    const tr = state.tr
                    tr.insertText(`\n${indent}`, selection.from, selection.to)
                    view.dispatch(tr)
                    return true
                  }

                  if (empty && CLOSING_CHARS.has(event.key)) {
                    const from = selection.from
                    const nextChar = state.doc.textBetween(from, from + 1, '\n', '\n')

                    if (nextChar === event.key) {
                      event.preventDefault()
                      const tr = state.tr.setSelection(TextSelection.create(state.doc, from + 1))
                      view.dispatch(tr)
                      return true
                    }
                  }

                  const closeChar = PAIR_CHARS[event.key]
                  if (closeChar && !event.metaKey && !event.ctrlKey && !event.altKey) {
                    event.preventDefault()
                    const tr = state.tr
                    const from = selection.from
                    const to = selection.to
                    const selectedText = state.doc.textBetween(from, to, '\n', '\n')

                    if (empty) {
                      tr.insertText(`${event.key}${closeChar}`, from, to)
                      tr.setSelection(TextSelection.create(tr.doc, from + 1))
                    } else {
                      tr.insertText(`${event.key}${selectedText}${closeChar}`, from, to)
                      tr.setSelection(TextSelection.create(tr.doc, to + 2))
                    }

                    view.dispatch(tr)
                    return true
                  }

                  if (event.key === 'Backspace' && empty) {
                    const from = selection.from
                    if (from <= 1) {
                      return false
                    }
                    const beforeChar = state.doc.textBetween(from - 1, from, '\n', '\n')
                    const afterChar = state.doc.textBetween(from, from + 1, '\n', '\n')
                    const paired = PAIR_CHARS[beforeChar]

                    if (paired && paired === afterChar) {
                      event.preventDefault()
                      const tr = state.tr.delete(from - 1, from + 1)
                      view.dispatch(tr)
                      return true
                    }
                  }

                  return false
                },
              },
            }),
          ]
        },
        addKeyboardShortcuts() {
          return {
            Enter: ({ editor }) => {
              const { state } = editor
              const { $from, empty } = state.selection

              if (!empty || $from.parent.type.name !== 'paragraph') {
                return false
              }

              const paragraphText = $from.parent.textContent
              const match = paragraphText.match(/^```([a-zA-Z0-9+#._-]*)$/)
              if (!match) {
                return false
              }

              const rawLanguage = typeof match[1] === 'string' ? match[1] : ''
              const language = normalizeCodeBlockLanguage(rawLanguage)
              const nodePos = $from.before()
              const contentFrom = $from.start()
              const contentTo = $from.end()

              const tr = state.tr
              tr.delete(contentFrom, contentTo)
              tr.setNodeMarkup(nodePos, this.type, { language: language || null })
              tr.setSelection(TextSelection.near(tr.doc.resolve(nodePos + 1)))
              editor.view.dispatch(tr)
              return true
            },
          }
        },
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockNodeView)
        },
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: '开始写作...' }),
      CustomMathematics,
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  const handleImageUpload = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/images', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(err.error || 'Upload failed')
    }
    const data: { id: string; url: string } = await response.json()
    return data.url
  }, [])

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    try {
      const url = await handleImageUpload(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch {
      // Image upload failed
    }
    e.target.value = ''
  }, [editor, handleImageUpload])

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL:')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const addMathBlock = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertBlockMath({ latex: '' }).run()
  }, [editor])

  if (!editor) return null

  type Btn = {
    label: string
    active?: boolean
    onClick: () => void
    disabled?: boolean
  }

  const buttons: Btn[] = [
    { label: 'H1', active: editor.isActive('heading', { level: 1 }), onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'H2', active: editor.isActive('heading', { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'H3', active: editor.isActive('heading', { level: 3 }), onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'B', active: editor.isActive('bold'), onClick: () => editor.chain().focus().toggleBold().run() },
    { label: 'I', active: editor.isActive('italic'), onClick: () => editor.chain().focus().toggleItalic().run() },
    { label: '</>', active: editor.isActive('code'), onClick: () => editor.chain().focus().toggleCode().run() },
    { label: '{ }', active: editor.isActive('codeBlock'), onClick: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: '❝', active: editor.isActive('blockquote'), onClick: () => editor.chain().focus().toggleBlockquote().run() },
    { label: '•', active: editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { label: '1.', active: editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { label: '—', onClick: () => editor.chain().focus().setHorizontalRule().run() },
    { label: '🔗', active: editor.isActive('link'), onClick: addLink },
    { label: '📷', onClick: () => fileInputRef.current?.click() },
    { label: '∑', onClick: addMathBlock },
  ]
  return (
    <div className="border border-black rounded-none overflow-hidden">
      <div className="flex flex-wrap gap-1 bg-white border-b border-black px-2 py-1.5">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={`px-2 py-1 text-xs font-mono rounded-none transition-colors ${
              btn.active
                ? 'bg-black text-white'
                : 'text-black hover:bg-black hover:text-white'
            } ${btn.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {btn.label}
          </button>
        ))}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      <EditorContent
        editor={editor}
        className="prose max-w-none min-h-[400px] px-4 py-3 bg-white text-black focus:outline-none [&_.tiptap]:min-h-[400px] [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-black [&_.tiptap_p.is-editor-empty:first-child::before]:opacity-30 [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
    </div>
  )
}
