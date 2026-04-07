import { useState, useEffect, useRef, useMemo } from 'react'
import type { ReactNodeViewProps } from '@tiptap/react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import mermaid from 'mermaid'
import { CODE_BLOCK_LANGUAGES, normalizeCodeBlockLanguage } from './codeBlockLanguages'

let mermaidInitialized = false
let instanceCounter = 0

function ensureMermaidInit() {
  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' })
    mermaidInitialized = true
  }
}

export default function MermaidNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const currentLang = normalizeCodeBlockLanguage((node.attrs.language as string) || '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef<string>(`mermaid-${++instanceCounter}`)

  const code = useMemo(() => {
    let text = ''
    node.content.forEach((child) => {
      text += child.text
    })
    return text
  }, [node])

  useEffect(() => {
    ensureMermaidInit()
  }, [])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (!code.trim()) {
      setSvg(null)
      setError(null)
      return
    }

    timerRef.current = setTimeout(async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(idRef.current, code)
        setSvg(renderedSvg)
        setError(null)
      } catch (err) {
        setSvg(null)
        setError(err instanceof Error ? err.message : String(err))
      }
    }, 300)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [code])

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <select
        className="code-block-lang-select"
        contentEditable={false}
        value={currentLang}
        onChange={(e) => updateAttributes({ language: normalizeCodeBlockLanguage(e.target.value) || null })}
      >
        {CODE_BLOCK_LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      <pre>
        <NodeViewContent className="code-block-content" />
      </pre>
      <div className="mermaid-preview" contentEditable={false}>
        <div className="mermaid-preview-label">MERMAID</div>
        {error ? (
          <div className="mermaid-preview-error">{error}</div>
        ) : svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : code.trim() ? (
          <div className="mermaid-preview-loading">Rendering...</div>
        ) : (
          <div className="mermaid-preview-empty">Enter Mermaid diagram code above</div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
