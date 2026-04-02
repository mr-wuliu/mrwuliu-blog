import zh from './locales/zh'
import en from './locales/en'

export type Lang = 'zh' | 'en'

const translations = { zh, en } as const

export function t(lang: Lang, key: string): string {
  const keys = key.split('.')
  let value: unknown = translations[lang]
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k]
  }
  return typeof value === 'string' ? value : key
}

export function tf(lang: Lang, key: string): (...args: unknown[]) => string {
  const keys = key.split('.')
  let value: unknown = translations[lang]
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k]
  }
  if (typeof value === 'function') {
    return (...args: unknown[]) => value(...args) as string
  }
  return () => key
}

export function langPath(path: string, lang: Lang): string {
  if (lang === 'en') return `/en${path}`
  return path
}

export function formatDateLang(isoDate: string | null, lang: Lang): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (lang === 'zh') {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}年${month}月${day}日`
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function otherLang(lang: Lang): Lang {
  return lang === 'zh' ? 'en' : 'zh'
}

export function langLabel(lang: Lang): string {
  return lang === 'zh' ? 'EN' : '中文'
}

export function htmlLang(lang: Lang): string {
  return lang === 'zh' ? 'zh-CN' : 'en'
}
