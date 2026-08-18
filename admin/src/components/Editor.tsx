import { useRef, useCallback, useEffect, useState } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { common, createLowlight } from 'lowlight'
import { Mathematics, BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { Extension, InputRule } from '@tiptap/core'
import type { Editor as TipTapEditor } from '@tiptap/core'
import { Plugin, TextSelection } from '@tiptap/pm/state'
import 'katex/dist/katex.min.css'
import BlockMathView from './math/BlockMathView'
import InlineMathView from './math/InlineMathView'
import { normalizeCodeBlockLanguage } from './codeBlockLanguages'
import CodeBlockNodeView from './CodeBlockNodeView'
import { api } from '../lib/api'

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

function promptTableSize() {
  const rowsInput = window.prompt('Table rows', '4')
  if (rowsInput === null) return null

  const colsInput = window.prompt('Table columns', '3')
  if (colsInput === null) return null

  const rows = Number.parseInt(rowsInput, 10)
  const cols = Number.parseInt(colsInput, 10)
  if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows < 1 || cols < 1) {
    return null
  }

  return {
    rows: Math.min(rows, 50),
    cols: Math.min(cols, 20),
  }
}

// Alt text for inserted images: strip any path segments, then the extension.
function altFromFileName(file: File): string {
  return (file.name.split(/[\\/]/).pop() ?? file.name).replace(/\.[^.]+$/, '')
}

async function uploadImage(file: File): Promise<string> {
  const data = await api.upload<{ id: string; url: string }>('/images', file)
  return data.url
}

const TableShortcut = Extension.create({
  name: 'table-shortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-t': () => {
        const size = promptTableSize()
        if (!size) return true
        return this.editor.chain().focus().insertTable({ rows: size.rows, cols: size.cols, withHeaderRow: true }).run()
      },
    }
  },
})

const ImagePaste = Extension.create({
  name: 'image-paste',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items
            if (!items) return false

            for (const item of items) {
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile()
                if (!file) continue

                // Capture the paste position before the async upload; the doc
                // may change while uploading, so clamp before inserting.
                const pastePos = view.state.selection.from
                uploadImage(file)
                  .then((url) => {
                    const pos = Math.min(pastePos, view.state.doc.content.size)
                    const node = view.state.schema.nodes.image.create({ src: url, alt: altFromFileName(file) })
                    view.dispatch(view.state.tr.insert(pos, node).scrollIntoView())
                  })
                  .catch((err: unknown) => {
                    console.error('Image paste upload failed', err)
                    window.alert(`Image upload failed${err instanceof Error && err.message ? `: ${err.message}` : ''}`)
                  })
                return true
              }
            }
            return false
          },
        },
      }),
    ]
  },
})

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
            // Tight inline-math delimiters only: content between the `$`s must
            // be non-empty and must not start or end with whitespace, so prose
            // like "$5 and $10" is not treated as math. `$$...$$` display math
            // is excluded by the lookaround guards.
            find: /(?<!\$)\$([^\s$](?:[^$\n]*[^\s$])?)\$(?!\$)/,
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
  onEditorReady?: (editor: TipTapEditor) => void
}

export default function Editor({ content, onChange, onEditorReady }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showTableTools, setShowTableTools] = useState(false)
  const [, forceRender] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
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
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableShortcut,
      Link.configure({ openOnClick: false }),
      Image,
      ImagePaste,
      Placeholder.configure({ placeholder: '开始写作...' }),
      CustomMathematics,
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    try {
      const url = await uploadImage(file)
      editor.chain().focus().setImage({ src: url, alt: altFromFileName(file) }).run()
    } catch (err) {
      console.error('Image upload failed', err)
      window.alert(`Image upload failed${err instanceof Error && err.message ? `: ${err.message}` : ''}`)
    }
    e.target.value = ''
  }, [editor])

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

  const addTable = useCallback(() => {
    if (!editor) return
    const size = promptTableSize()
    if (!size) return
    editor.chain().focus().insertTable({ rows: size.rows, cols: size.cols, withHeaderRow: true }).run()
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const sync = () => {
      const inTable =
        editor.isActive('table')
        || editor.isActive('tableRow')
        || editor.isActive('tableCell')
        || editor.isActive('tableHeader')
      setShowTableTools(inTable)
      forceRender(n => n + 1)
    }
    sync()
    editor.on('selectionUpdate', sync)
    editor.on('transaction', sync)

    return () => {
      editor.off('selectionUpdate', sync)
      editor.off('transaction', sync)
    }
  }, [editor])

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  if (!editor) return null

  type Btn = {
    label: string
    ariaLabel: string
    active?: boolean
    onClick: () => void
    disabled?: boolean
  }

  const buttons: Btn[] = [
    { label: 'H1', ariaLabel: 'Heading 1', active: editor.isActive('heading', { level: 1 }), onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'H2', ariaLabel: 'Heading 2', active: editor.isActive('heading', { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'H3', ariaLabel: 'Heading 3', active: editor.isActive('heading', { level: 3 }), onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'H4', ariaLabel: 'Heading 4', active: editor.isActive('heading', { level: 4 }), onClick: () => editor.chain().focus().toggleHeading({ level: 4 }).run() },
    { label: 'H5', ariaLabel: 'Heading 5', active: editor.isActive('heading', { level: 5 }), onClick: () => editor.chain().focus().toggleHeading({ level: 5 }).run() },
    { label: 'H6', ariaLabel: 'Heading 6', active: editor.isActive('heading', { level: 6 }), onClick: () => editor.chain().focus().toggleHeading({ level: 6 }).run() },
    { label: 'B', ariaLabel: 'Bold', active: editor.isActive('bold'), onClick: () => editor.chain().focus().toggleBold().run() },
    { label: 'I', ariaLabel: 'Italic', active: editor.isActive('italic'), onClick: () => editor.chain().focus().toggleItalic().run() },
    { label: '</>', ariaLabel: 'Inline code', active: editor.isActive('code'), onClick: () => editor.chain().focus().toggleCode().run() },
    { label: '{ }', ariaLabel: 'Code block', active: editor.isActive('codeBlock'), onClick: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: '❝', ariaLabel: 'Blockquote', active: editor.isActive('blockquote'), onClick: () => editor.chain().focus().toggleBlockquote().run() },
    { label: '•', ariaLabel: 'Bullet list', active: editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { label: '1.', ariaLabel: 'Ordered list', active: editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { label: '—', ariaLabel: 'Horizontal rule', onClick: () => editor.chain().focus().setHorizontalRule().run() },
    { label: '🔗', ariaLabel: 'Link', active: editor.isActive('link'), onClick: addLink },
    { label: '📷', ariaLabel: 'Insert image', onClick: () => fileInputRef.current?.click() },
    { label: 'Tbl', ariaLabel: 'Insert table', active: editor.isActive('table'), onClick: addTable },
    { label: '∑', ariaLabel: 'Math block', onClick: addMathBlock },
  ]
  const tableButtons: Btn[] = editor.isActive('table') ? [
    { label: '+R', ariaLabel: 'Add row', onClick: () => editor.chain().focus().addRowAfter().run() },
    { label: '-R', ariaLabel: 'Delete row', onClick: () => editor.chain().focus().deleteRow().run() },
    { label: '+C', ariaLabel: 'Add column', onClick: () => editor.chain().focus().addColumnAfter().run() },
    { label: '-C', ariaLabel: 'Delete column', onClick: () => editor.chain().focus().deleteColumn().run() },
    { label: 'Hdr', ariaLabel: 'Toggle header row', onClick: () => editor.chain().focus().toggleHeaderRow().run() },
    { label: 'DelTbl', ariaLabel: 'Delete table', onClick: () => editor.chain().focus().deleteTable().run() },
  ] : []
  const currentHeadingLevel = (() => {
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive('heading', { level: i })) return i
    }
    return null
  })()

  return (
    <div className="relative border border-black rounded-none">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 bg-white border-b border-black px-2 py-1.5">
        {currentHeadingLevel !== null && (
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-40 mr-1 select-none">H{currentHeadingLevel}</span>
        )}
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.onClick}
            disabled={btn.disabled}
            aria-label={btn.ariaLabel}
            title={btn.ariaLabel}
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

      <div className="overflow-x-hidden">
      <EditorContent
        editor={editor}
        className="prose max-w-none min-h-[400px] px-4 py-3 bg-white text-black focus:outline-none [&_.tiptap]:min-h-[400px] [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-black [&_.tiptap_p.is-editor-empty:first-child::before]:opacity-30 [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
      </div>
      {showTableTools && (
        <div className="fixed right-4 bottom-4 z-40 bg-white border border-black shadow-sm p-2 w-[220px]">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Table Tools</div>
          <div className="grid grid-cols-3 gap-1">
            {tableButtons.map((btn) => (
              <button
                key={`float-table-${btn.label}`}
                type="button"
                onClick={btn.onClick}
                disabled={btn.disabled}
                aria-label={btn.ariaLabel}
                title={btn.ariaLabel}
                className={`px-2 py-1 text-xs font-mono border border-black transition-colors ${
                  btn.active
                    ? 'bg-black text-white'
                    : 'text-black hover:bg-black hover:text-white'
                } ${btn.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
