import type { ReactNodeViewProps } from '@tiptap/react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { CODE_BLOCK_LANGUAGES, normalizeCodeBlockLanguage } from './codeBlockLanguages'
import MermaidNodeView from './MermaidNodeView'

export default function CodeBlockNodeView(props: ReactNodeViewProps) {
  const currentLang = normalizeCodeBlockLanguage((props.node.attrs.language as string) || '')
  const { updateAttributes } = props

  if (currentLang === 'mermaid') {
    return <MermaidNodeView {...props} />
  }

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
      <pre><NodeViewContent className="code-block-content" /></pre>
    </NodeViewWrapper>
  )
}
