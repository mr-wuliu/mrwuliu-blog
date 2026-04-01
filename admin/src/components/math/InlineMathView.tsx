import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { ReactNodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import katex from 'katex'

export default function InlineMathView({ node, updateAttributes, deleteNode, editor, getPos }: ReactNodeViewProps) {
  const latex = node.attrs.latex as string
  const [isEditing, setIsEditing] = useState(latex === '')
  const [draft, setDraft] = useState(latex)
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)
  const didHandleClose = useRef(false)

  // Sync draft from external changes (undo/redo) when not editing
  useEffect(() => {
    if (!isEditing) {
      setDraft(latex)
    }
  }, [latex, isEditing])

  // Reset close guard and focus input when entering edit mode
  useEffect(() => {
    if (!isEditing) return
    didHandleClose.current = false
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [isEditing])

  const commitEdit = useCallback(() => {
    if (didHandleClose.current) return
    if (draft === '') {
      didHandleClose.current = true
      deleteNode()
      return
    }
    didHandleClose.current = true
    const pos = getPos()
    const size = node.nodeSize
    updateAttributes({ latex: draft })
    setIsEditing(false)
    setTimeout(() => {
      if (pos != null) {
        editor.chain().focus().setTextSelection(pos + size).run()
      }
    }, 0)
  }, [draft, updateAttributes, deleteNode, editor, getPos, node])

  const revertEdit = useCallback(() => {
    if (latex === '') {
      didHandleClose.current = true
      deleteNode()
      return
    }
    didHandleClose.current = true
    const pos = getPos()
    const size = node.nodeSize
    setDraft(latex)
    setIsEditing(false)
    setTimeout(() => {
      if (pos != null) {
        editor.chain().focus().setTextSelection(pos + size).run()
      }
    }, 0)
  }, [latex, deleteNode, editor, getPos, node])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isComposingRef.current) return

      if (e.key === 'Enter') {
        e.preventDefault()
        commitEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        revertEdit()
      } else if (e.key === 'Backspace' && draft === '') {
        e.preventDefault()
        didHandleClose.current = true
        deleteNode()
      }
    },
    [commitEdit, revertEdit, draft, deleteNode],
  )

  const renderedHtml = useMemo(() => {
    if (!isEditing) {
      try {
        return katex.renderToString(latex, { displayMode: false, throwOnError: false })
      } catch {
        return null
      }
    }
    return null
  }, [latex, isEditing])

  if (isEditing) {
    return (
      <NodeViewWrapper as="span" data-type="inline-math">
        <input
          ref={inputRef}
          className="math-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true }}
          onCompositionEnd={() => { isComposingRef.current = false }}
          onBlur={commitEdit}
          placeholder="LaTeX..."
        />
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper as="span" data-type="inline-math" onClick={() => setIsEditing(true)}>
      {renderedHtml ? (
        <span dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      ) : (
        <span className="math-preview-error">{latex || '?'}</span>
      )}
    </NodeViewWrapper>
  )
}
