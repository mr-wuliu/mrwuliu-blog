import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { ReactNodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import katex from 'katex'

export default function BlockMathView({ node, updateAttributes, deleteNode, editor, getPos }: ReactNodeViewProps) {
  const latex = node.attrs.latex as string
  const [isEditing, setIsEditing] = useState(latex === '')
  const [draft, setDraft] = useState(latex)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const didHandleClose = useRef(false)

  // Sync draft from external changes (undo/redo) when not editing
  useEffect(() => {
    if (!isEditing) {
      setDraft(latex)
    }
  }, [latex, isEditing])

  // Auto-enter editing mode for empty latex
  useEffect(() => {
    if (latex === '' && !isEditing) {
      setIsEditing(true)
    }
  }, [latex, isEditing])

  // Reset close guard and focus textarea when entering edit mode
  useEffect(() => {
    if (!isEditing) return
    didHandleClose.current = false
    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [isEditing])

  const commitEdit = useCallback(() => {
    if (didHandleClose.current) return
    if (draft === '') {
      didHandleClose.current = true
      const pos = getPos()
      deleteNode()
      if (pos != null) {
        setTimeout(() => {
          editor.chain().focus().setTextSelection(pos).run()
        }, 0)
      }
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
      const pos = getPos()
      deleteNode()
      if (pos != null) {
        setTimeout(() => {
          editor.chain().focus().setTextSelection(pos).run()
        }, 0)
      }
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
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isComposingRef.current) return

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        commitEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        revertEdit()
      } else if (e.key === 'Backspace' && draft === '' && textareaRef.current?.selectionStart === 0) {
        e.preventDefault()
        didHandleClose.current = true
        const pos = getPos()
        deleteNode()
        if (pos != null) {
          setTimeout(() => {
            editor.chain().focus().setTextSelection(pos).run()
          }, 0)
        }
      }
    },
    [commitEdit, revertEdit, draft, deleteNode],
  )

  const renderedHtml = useMemo(() => {
    if (!isEditing) {
      try {
        return katex.renderToString(latex, { displayMode: true, throwOnError: false })
      } catch {
        return null
      }
    }
    return null
  }, [latex, isEditing])

  const previewHtml = useMemo(() => {
    if (!isEditing || !draft) return null
    try {
      return katex.renderToString(draft, { displayMode: true, throwOnError: false })
    } catch {
      return null
    }
  }, [draft, isEditing])

  if (isEditing) {
    return (
      <NodeViewWrapper as="div" data-type="block-math">
        <textarea
          ref={textareaRef}
          className="math-edit-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true }}
          onCompositionEnd={() => { isComposingRef.current = false }}
          onBlur={commitEdit}
          placeholder="Type LaTeX here..."
        />
        {draft && (
          <div className="math-preview">
            {previewHtml ? (
              <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <span className="math-preview-error">{draft}</span>
            )}
          </div>
        )}
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper as="div" data-type="block-math" onClick={() => setIsEditing(true)}>
      {renderedHtml ? (
        <span dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      ) : (
        <span className="math-preview-error">{latex || '(empty math)'}</span>
      )}
    </NodeViewWrapper>
  )
}
