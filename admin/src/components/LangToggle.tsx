import { useTranslation } from 'react-i18next'

export default function LangToggle() {
  const { i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')

  const toggle = () => {
    const newLang = isZh ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
    localStorage.setItem('admin-lang', newLang)
  }

  return (
    <button type="button" onClick={toggle} className="lang-toggle" aria-label="Language toggle">
      <span className={`lang-toggle-option${!isZh ? ' lang-toggle-option-active' : ''}`}>EN</span>
      <span className={`lang-toggle-option${isZh ? ' lang-toggle-option-active' : ''}`}>中文</span>
      <span className={`lang-toggle-thumb${isZh ? ' lang-toggle-thumb-end' : ''}`}>
        {isZh ? '中文' : 'EN'}
      </span>
    </button>
  )
}
