import type { FC, PropsWithChildren } from 'hono/jsx'
import SEO from './components/seo'
import AuthorSidebar from './components/author-sidebar'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, tf, langPath, otherLang, htmlLang } from '../i18n'
import zh from '../i18n/locales/zh'
import en from '../i18n/locales/en'

function flat(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k
    if (typeof v === 'function') {
      continue
    } else if (typeof v === 'object' && v !== null) {
      Object.assign(out, flat(v as Record<string, unknown>, key))
    } else {
      out[key] = String(v)
    }
  }
  return out
}

const zhFlat = JSON.stringify(flat(zh as Record<string, unknown>))
const enFlat = JSON.stringify(flat(en as Record<string, unknown>))

type LayoutProps = PropsWithChildren<{
  title: string
  description?: string
  url?: string
  image?: string
  type?: 'website' | 'article'
  authorProfile?: AuthorProfile
  lang: Lang
  currentPath?: string
}>

const Layout: FC<LayoutProps> = ({ title, description, url, image, type = 'website', authorProfile, lang, currentPath = '/', children }) => {
  const hasSidebar = !!(authorProfile && (authorProfile.avatar || authorProfile.bio || authorProfile.github || authorProfile.email))
  const toggleHref = langPath(currentPath, otherLang(lang))
  const year = new Date().getFullYear()

  return (
    <html lang={htmlLang(lang)}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="/css/style.css" />
        <script dangerouslySetInnerHTML={{ __html:
          'var __zh=' + zhFlat + ';var __en=' + enFlat + ';var __cur="' + lang + '";' +
          'function __t(k){var d=__cur==="zh"?__zh:__en;var v=d[k];if(!v)return "";if(v.startsWith("FN:"))try{return new Function("return "+v.slice(3))()}catch(e){return""}return v}' +
          'function __applyLang(l){__cur=l;' +
          'document.querySelectorAll("[data-t]").forEach(function(e){var v=__t(e.getAttribute("data-t"));if(v)e.textContent=v});' +
          'document.querySelectorAll("[data-placeholder]").forEach(function(e){var v=__t(e.getAttribute("data-placeholder"));if(v)e.setAttribute("placeholder",v)});' +
          'document.querySelectorAll("[data-thref]").forEach(function(e){var k=e.getAttribute("data-thref");var b=l==="en"?"/en":"";e.setAttribute("href",b+k)});' +
          'document.querySelectorAll("[data-comment-msg]").forEach(function(e){var o=l==="zh"?"en":"zh";e.setAttribute("data-comment-msg",e.getAttribute("data-comment-msg-"+l));e.setAttribute("data-comment-err",e.getAttribute("data-comment-err-"+l));e.setAttribute("data-comment-url",e.getAttribute("data-comment-url-"+l))});' +
          'document.querySelectorAll("[data-comment-count]").forEach(function(e){var v=e.getAttribute("data-comment-count-"+l);if(v)e.textContent=v});' +
          'var tb=document.querySelector(".lang-toggle-thumb");if(tb){tb.className="lang-toggle-thumb"+(l==="zh"?" lang-toggle-thumb-end":"");tb.textContent=l==="zh"? "\\u4e2d\\u6587":"EN"}' +
          'document.documentElement.lang=l==="zh"?"zh-CN":"en";' +
          '}'
        }} />
        <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/feed.xml" />
        {type === 'article' && (
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
            crossorigin="anonymous"
          />
        )}
        <SEO title={title} description={description} url={url} image={image} type={type} lang={lang} />
      </head>
      <body class="font-sans text-base leading-relaxed text-black bg-white antialiased min-h-screen flex flex-col">
        <header class="border-b border-black bg-white">
          <nav class="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-6">
            {hasSidebar ? (
              <div class="lg:flex lg:gap-16">
                <div class="flex-1 flex justify-between items-center">
                  <a href={langPath('/', lang)} data-thref="/" class="text-xl font-bold tracking-tight text-black hover:opacity-70 transition-all no-underline">mrwuliu</a>
                  <div class="flex items-center">
                    <div class="flex gap-6 text-lg uppercase tracking-widest ml-auto">
                      <a href={langPath('/writings', lang)} data-thref="/writings" data-t="nav.writings" class="hover:underline no-underline text-black">{t(lang, 'nav.writings')}</a>
                      <a href={langPath('/projects', lang)} data-thref="/projects" data-t="nav.projects" class="hover:underline no-underline text-black">{t(lang, 'nav.projects')}</a>
                      <a href={langPath('/tags-cloud', lang)} data-thref="/tags-cloud" data-t="nav.tags" class="hover:underline no-underline text-black">{t(lang, 'nav.tags')}</a>
                      <a href={langPath('/about', lang)} data-thref="/about" data-t="nav.about" class="hover:underline no-underline text-black">{t(lang, 'nav.about')}</a>
                    </div>
                    <a href={toggleHref} class="lang-toggle">
                      <span class="lang-toggle-option">EN</span>
                      <span class="lang-toggle-option">中文</span>
                      <span class={`lang-toggle-thumb${lang === 'en' ? '' : ' lang-toggle-thumb-end'}`}>{lang === 'en' ? 'EN' : '中文'}</span>
                    </a>
                  </div>
                </div>
                <div class="hidden lg:block w-40 shrink-0"></div>
              </div>
            ) : (
              <div class="flex justify-between items-center">
                <a href={langPath('/', lang)} data-thref="/" class="text-xl font-bold tracking-tight text-black hover:opacity-70 transition-all no-underline">mrwuliu</a>
                <div class="flex items-center">
                  <div class="flex gap-6 text-lg uppercase tracking-widest ml-auto">
                    <a href={langPath('/writings', lang)} data-thref="/writings" data-t="nav.writings" class="hover:underline no-underline text-black">{t(lang, 'nav.writings')}</a>
                    <a href={langPath('/projects', lang)} data-thref="/projects" data-t="nav.projects" class="hover:underline no-underline text-black">{t(lang, 'nav.projects')}</a>
                    <a href={langPath('/tags-cloud', lang)} data-thref="/tags-cloud" data-t="nav.tags" class="hover:underline no-underline text-black">{t(lang, 'nav.tags')}</a>
                    <a href={langPath('/about', lang)} data-thref="/about" data-t="nav.about" class="hover:underline no-underline text-black">{t(lang, 'nav.about')}</a>
                  </div>
                  <a href={toggleHref} class="lang-toggle">
                    <span class="lang-toggle-option">EN</span>
                    <span class="lang-toggle-option">中文</span>
                    <span class={`lang-toggle-thumb${lang === 'en' ? '' : ' lang-toggle-thumb-end'}`}>{lang === 'en' ? 'EN' : '中文'}</span>
                  </a>
                </div>
              </div>
            )}
          </nav>
        </header>
        <main class="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-12 flex-1 w-full">
          {hasSidebar ? (
            <div class="lg:flex lg:gap-16">
              <div class="flex-1 min-w-0">
                {children}
              </div>
              <aside class="w-full lg:w-40 shrink-0 mt-12 lg:mt-0">
                <div class="lg:sticky lg:top-24">
                  <AuthorSidebar profile={authorProfile} />
                </div>
              </aside>
            </div>
          ) : (
            <>{children}</>
          )}
        </main>
        <footer class="border-t border-black bg-white mt-auto">
          <p class="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-8 text-xs font-bold uppercase tracking-widest opacity-50 text-center" data-t="footer.copyright" data-t-zh={tf(lang, 'footer.copyright')(new Date().getFullYear())} data-t-en={tf(otherLang(lang), 'footer.copyright')(new Date().getFullYear())}>{tf(lang, 'footer.copyright')(new Date().getFullYear())}</p>
        </footer>
        <script dangerouslySetInnerHTML={{ __html:
          'document.addEventListener("click",function(e){' +
          'var tg=e.target.closest(".lang-toggle");' +
          'if(!tg)return;e.preventDefault();' +
          'var nl=__cur==="zh"?"en":"zh";' +
          '__applyLang(nl);' +
          'var fb=document.querySelector("[data-t=\\"footer.copyright\\"]");' +
          'if(fb)fb.textContent=fb.getAttribute("data-t-"+nl);' +
          'history.pushState(null,"",(nl==="en"?"/en":"")+location.pathname.replace(/^\\/en/,""));' +
          '});'
        }} />
      </body>
    </html>
  )
}

export default Layout
