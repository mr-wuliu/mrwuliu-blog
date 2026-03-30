import { useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Mathematics from '@tiptap/extension-mathematics'
import 'katex/dist/katex.min.css'

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
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: '开始写作...' }),
      Mathematics,
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
      // Image upload failed — silently ignore to avoid console.log
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
    const tex = window.prompt('LaTeX expression:')
    if (!tex) return
    editor.chain().focus().insertContent(`$$${tex}$$`).run()
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
    { label: '❝', active: editor.isActive('blockquote'), onClick: () => editor.chain().focus().toggleBlockquote().run() },
    { label: '•', active: editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { label: '1.', active: editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { label: '—', onClick: () => editor.chain().focus().setHorizontalRule().run() },
    { label: '🔗', active: editor.isActive('link'), onClick: addLink },
    { label: '📷', onClick: () => fileInputRef.current?.click() },
    { label: '∑', onClick: addMathBlock },
  ]

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-1 bg-gray-800 border-b border-gray-700 px-2 py-1.5">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
              btn.active
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
        className="prose prose-invert max-w-none min-h-[400px] px-4 py-3 bg-gray-900 text-gray-100 focus:outline-none [&_.tiptap]:min-h-[400px] [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-500 [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
    </div>
  )
}
