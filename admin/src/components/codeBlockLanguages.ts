export const CODE_BLOCK_LANGUAGES = [
  { label: 'Plain Text', value: '' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'PHP', value: 'php' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell/Bash', value: 'bash' },
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'XML', value: 'xml' },
  { label: 'Mermaid', value: 'mermaid' },
]

const LANGUAGE_ALIAS_MAP: Record<string, string> = {
  text: '',
  plaintext: '',
  plain: '',
  txt: '',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  kt: 'kotlin',
  rs: 'rust',
}

const SUPPORTED_LANGUAGES = new Set<string>(CODE_BLOCK_LANGUAGES.map((language) => language.value))

export function normalizeCodeBlockLanguage(language: string): string {
  const normalized = language.trim().toLowerCase()

  if (!normalized) {
    return ''
  }

  const alias = LANGUAGE_ALIAS_MAP[normalized]
  if (alias !== undefined) {
    return alias
  }

  if (SUPPORTED_LANGUAGES.has(normalized)) {
    return normalized
  }

  return ''
}
