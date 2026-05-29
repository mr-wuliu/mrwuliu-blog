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
  publishedTime?: string
  modifiedTime?: string
  authorName?: string
  extraHead?: unknown
}>

const Layout: FC<LayoutProps> = ({
  title,
  description,
  url,
  image,
  type = 'website',
  authorProfile,
  lang,
  currentPath = '/',
  publishedTime,
  modifiedTime,
  authorName,
  extraHead,
  children,
}) => {
  const hasSidebar = !!(authorProfile && (authorProfile.avatar || authorProfile.bio || authorProfile.github || authorProfile.email))
  const toggleHref = langPath(currentPath, otherLang(lang))
  const year = new Date().getFullYear()

  return (
    <html lang={htmlLang(lang)}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html:
          '(function(){' +
          'var ts=["default","coffee"];' +
          'function ok(t){return ts.indexOf(t)!==-1}' +
          'var p=new URLSearchParams(location.search).get("theme");' +
          'var s="default";' +
          'if(ok(p))s=p;else{try{var v=localStorage.getItem("theme");if(ok(v))s=v}catch(e){}}' +
          'document.documentElement.setAttribute("data-theme",s);' +
          '})();'
        }} />
        <link rel="stylesheet" href="/css/tailwind.css" />
        <link rel="stylesheet" href="/css/style.css" />
        <script dangerouslySetInnerHTML={{ __html:
          'var __zh=' + zhFlat + ';var __en=' + enFlat + ';var __cur="' + lang + '";' +
          'function __t(k){var d=__cur==="zh"?__zh:__en;var v=d[k];if(!v)return "";if(v.startsWith("FN:"))try{return new Function("return "+v.slice(3))()}catch(e){return""}return v}' +
          'function __applyLang(l){__cur=l;' +
          'document.querySelectorAll("[data-t]").forEach(function(e){var v=__t(e.getAttribute("data-t"));if(v)e.textContent=v});' +
          'document.querySelectorAll("[data-placeholder]").forEach(function(e){var v=__t(e.getAttribute("data-placeholder"));if(v)e.setAttribute("placeholder",v)});' +
          'document.querySelectorAll("[data-thref]").forEach(function(e){var k=e.getAttribute("data-thref");var b=l==="en"?"/en":"";e.setAttribute("href",b+k)});' +
          'document.querySelectorAll("[data-comment-msg]").forEach(function(e){var o=l==="en"?"en":"zh";e.setAttribute("data-comment-msg",e.getAttribute("data-comment-msg-"+l));e.setAttribute("data-comment-err",e.getAttribute("data-comment-err-"+l));e.setAttribute("data-comment-url",e.getAttribute("data-comment-url-"+l))});' +
          'document.querySelectorAll("[data-comment-count]").forEach(function(e){var v=e.getAttribute("data-comment-count-"+l);if(v)e.textContent=v});' +
          'document.querySelectorAll(".lang-toggle").forEach(function(tg){' +
          'var tb=tg.querySelector(".lang-toggle-thumb");if(tb){tb.className="lang-toggle-thumb"+(l==="zh"?" lang-toggle-thumb-end":"");tb.textContent=l==="zh"? "\\u4e2d\\u6587":"EN"}' +
          'tg.querySelectorAll(".lang-toggle-option").forEach(function(op){op.classList.remove("lang-toggle-option-active")});' +
          'var ao=tg.querySelector(".lang-toggle-option[data-lang=\\"" + l + "\\"]");if(ao)ao.classList.add("lang-toggle-option-active");' +
          '});' +
          'document.documentElement.lang=l==="zh"?"zh-CN":"en";' +
          '}'
        }} />
        {lang === 'zh' ? (
          <link rel="alternate" type="application/rss+xml" title="RSS Feed (中文)" href="/feed.xml" />
        ) : (
          <link rel="alternate" type="application/rss+xml" title="RSS Feed (English)" href="/en/feed.xml" />
        )}
        {type === 'article' && (
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
            crossorigin="anonymous"
          />
        )}
        {type === 'article' && (
          <link
            rel="preconnect"
            href="https://fonts.googleapis.com"
          />
        )}
        {type === 'article' && (
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossorigin="anonymous"
          />
        )}
        {type === 'article' && (
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap"
          />
        )}
        <SEO
          title={title}
          description={description}
          url={url}
          image={image}
          type={type}
          lang={lang}
          currentPath={currentPath}
          publishedTime={publishedTime}
          modifiedTime={modifiedTime}
          authorName={authorName}
        />
        {extraHead}
      </head>
      <body class="font-sans text-base leading-relaxed text-black bg-white antialiased min-h-screen flex flex-col">
        <header class="border-b border-black bg-white">
          <nav class="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-4">
            {hasSidebar ? (
              <div class="lg:flex lg:gap-16">
                <div class="flex-1 flex justify-between items-center">
                  <a href={langPath('/', lang)} data-thref="/" class="text-xl font-bold tracking-tight text-black hover:opacity-70 transition-all no-underline">mrwuliu</a>
                  <div class="flex items-center gap-6 ml-auto">
                    <div class="flex gap-6 text-lg uppercase tracking-widest shrink-0">
                      <a href={langPath('/writings', lang)} data-thref="/writings" data-t="nav.writings" class="hover:underline no-underline text-black">{t(lang, 'nav.writings')}</a>
                      <a href={langPath('/series', lang)} data-thref="/series" data-t="nav.series" class="hover:underline no-underline text-black">{t(lang, 'nav.series')}</a>
                      <a href={langPath('/projects', lang)} data-thref="/projects" data-t="nav.projects" class="hover:underline no-underline text-black">{t(lang, 'nav.projects')}</a>
                      <a href={langPath('/tags-cloud', lang)} data-thref="/tags-cloud" data-t="nav.tags" class="hover:underline no-underline text-black">{t(lang, 'nav.tags')}</a>
                      <a href={langPath('/about', lang)} data-thref="/about" data-t="nav.about" class="hover:underline no-underline text-black">{t(lang, 'nav.about')}</a>
                      <a href={langPath('/friends', lang)} data-thref="/friends" data-t="nav.friends" class="hover:underline no-underline text-black">{t(lang, 'nav.friends')}</a>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                      <select class="theme-select" aria-label="Theme">
                        <option value="default">Default</option>
                        <option value="coffee">Coffee</option>
                      </select>
                      <a href={toggleHref} class="lang-toggle">
                        <span class={`lang-toggle-option${lang === 'en' ? ' lang-toggle-option-active' : ''}`} data-lang="en">EN</span>
                        <span class={`lang-toggle-option${lang === 'zh' ? ' lang-toggle-option-active' : ''}`} data-lang="zh">中文</span>
                        <span class={`lang-toggle-thumb${lang === 'en' ? '' : ' lang-toggle-thumb-end'}`}>{lang === 'en' ? 'EN' : '中文'}</span>
                      </a>
                    </div>
                  </div>
                </div>
                <div class="hidden lg:block w-40 shrink-0"></div>
              </div>
            ) : (
              <div class="flex justify-between items-center">
                <a href={langPath('/', lang)} data-thref="/" class="text-xl font-bold tracking-tight text-black hover:opacity-70 transition-all no-underline">mrwuliu</a>
                <div class="flex items-center gap-6 ml-auto">
                  <div class="flex gap-6 text-lg uppercase tracking-widest shrink-0">
                    <a href={langPath('/writings', lang)} data-thref="/writings" data-t="nav.writings" class="hover:underline no-underline text-black">{t(lang, 'nav.writings')}</a>
                    <a href={langPath('/series', lang)} data-thref="/series" data-t="nav.series" class="hover:underline no-underline text-black">{t(lang, 'nav.series')}</a>
                    <a href={langPath('/projects', lang)} data-thref="/projects" data-t="nav.projects" class="hover:underline no-underline text-black">{t(lang, 'nav.projects')}</a>
                    <a href={langPath('/tags-cloud', lang)} data-thref="/tags-cloud" data-t="nav.tags" class="hover:underline no-underline text-black">{t(lang, 'nav.tags')}</a>
                    <a href={langPath('/about', lang)} data-thref="/about" data-t="nav.about" class="hover:underline no-underline text-black">{t(lang, 'nav.about')}</a>
                    <a href={langPath('/friends', lang)} data-thref="/friends" data-t="nav.friends" class="hover:underline no-underline text-black">{t(lang, 'nav.friends')}</a>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <select class="theme-select" aria-label="Theme">
                      <option value="default">Default</option>
                      <option value="coffee">Coffee</option>
                    </select>
                    <a href={toggleHref} class="lang-toggle">
                      <span class={`lang-toggle-option${lang === 'en' ? ' lang-toggle-option-active' : ''}`} data-lang="en">EN</span>
                      <span class={`lang-toggle-option${lang === 'zh' ? ' lang-toggle-option-active' : ''}`} data-lang="zh">中文</span>
                      <span class={`lang-toggle-thumb${lang === 'en' ? '' : ' lang-toggle-thumb-end'}`}>{lang === 'en' ? 'EN' : '中文'}</span>
                    </a>
                  </div>
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
          <p class="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-5 text-xs font-bold uppercase tracking-widest opacity-50 text-center" data-t="footer.copyright" data-t-zh={tf(lang, 'footer.copyright')(new Date().getFullYear())} data-t-en={tf(otherLang(lang), 'footer.copyright')(new Date().getFullYear())}>{tf(lang, 'footer.copyright')(new Date().getFullYear())}</p>
        </footer>
        <script dangerouslySetInnerHTML={{ __html:
          'var __themes=["default","coffee"];' +
          'function __okTheme(t){return __themes.indexOf(t)!==-1}' +
          'function __getTheme(){' +
          'var p=new URLSearchParams(location.search).get("theme");if(__okTheme(p))return p;' +
          'try{var s=localStorage.getItem("theme");if(__okTheme(s))return s}catch(e){}' +
          'return "default";' +
          '}' +
          'function __applyTheme(t){' +
          'var th=__okTheme(t)?t:"default";' +
          'document.documentElement.setAttribute("data-theme",th);' +
          'document.body.setAttribute("data-theme",th);' +
          'document.querySelectorAll(".theme-select").forEach(function(s){s.value=th});' +
          '}' +
          '__applyTheme(__getTheme());' +
          'document.querySelectorAll(".theme-select").forEach(function(s){s.addEventListener("change",function(){' +
          'var th=__okTheme(this.value)?this.value:"default";' +
          '__applyTheme(th);' +
          'try{localStorage.setItem("theme",th)}catch(e){}' +
          'var u=new URL(location.href);' +
          'if(th==="default")u.searchParams.delete("theme");else u.searchParams.set("theme",th);' +
          'history.replaceState(null,"",u.pathname+(u.search?u.search:"")+u.hash);' +
          '})});' +
          'var __langPages={},__langPromises={};' +
          'function __fetchLang(url){' +
          'if(__langPages[url])return Promise.resolve(__langPages[url]);' +
          'if(__langPromises[url])return __langPromises[url];' +
          'var p=fetch(url).then(function(r){return r.text()}).then(function(h){__langPages[url]=h;delete __langPromises[url];return h}).catch(function(){delete __langPromises[url]});' +
          '__langPromises[url]=p;return p' +
          '}' +
          'function __prefetchLang(url){__fetchLang(url)}' +
          'document.addEventListener("pointerover",function(e){' +
          'var tg=e.target.closest(".lang-toggle");' +
          'if(tg&&tg.href)__prefetchLang(tg.href);' +
          '},true);' +
          'document.addEventListener("mousedown",function(e){' +
          'var tg=e.target.closest(".lang-toggle");' +
          'if(tg&&tg.href)__prefetchLang(tg.href);' +
          '},true);' +
          'function __applyLangPage(html,href,nl){' +
          'var doc=new DOMParser().parseFromString(html,"text/html");' +
          'var cm=document.querySelector("main");' +
          'if(cm){var nm=doc.querySelector("main");if(nm){cm.innerHTML=nm.innerHTML;' +
          'cm.querySelectorAll("script").forEach(function(s){var ns=document.createElement("script");ns.textContent=s.textContent;if(s.parentNode)s.parentNode.replaceChild(ns,s)})}}' +
          '__cur=nl;' +
          'document.documentElement.lang=nl==="zh"?"zh-CN":"en";' +
          'var fb=document.querySelector("[data-t=\\"footer.copyright\\"]");' +
          'if(fb)fb.textContent=fb.getAttribute("data-t-"+nl);' +
          'if(doc.title)document.title=doc.title;' +
          'var tgl=document.querySelector(".lang-toggle");' +
          'var nt=doc.querySelector(".lang-toggle");if(nt&&tgl)tgl.href=nt.href;' +
          'history.pushState(null,"",href);window.scrollTo(0,0);' +
          'if(!window.__langPopState){window.__langPopState=true;window.addEventListener("popstate",function(){location.reload()})}' +
          '}' +
          'function __animateToggle(l){' +
          'document.querySelectorAll(".lang-toggle").forEach(function(tg){' +
          'var tb=tg.querySelector(".lang-toggle-thumb");if(tb){tb.className="lang-toggle-thumb"+(l==="zh"?" lang-toggle-thumb-end":"");tb.textContent=l==="zh"? "\\u4e2d\\u6587":"EN"}' +
          'tg.querySelectorAll(".lang-toggle-option").forEach(function(op){op.classList.remove("lang-toggle-option-active")});' +
          'var ao=tg.querySelector(".lang-toggle-option[data-lang=\\"" + l + "\\"]");if(ao)ao.classList.add("lang-toggle-option-active");' +
          '});' +
          '}' +
          'document.addEventListener("click",function(e){' +
          'var tg=e.target.closest(".lang-toggle");' +
          'if(!tg)return;e.preventDefault();' +
          'var href=tg.href,nl=__cur==="zh"?"en":"zh";' +
          '__langPages[location.pathname+location.search]=document.documentElement.outerHTML;' +
          '__cur=nl;' +
          '__animateToggle(nl);' +
          '__fetchLang(href).then(function(html){' +
          'if(html){__applyLangPage(html,href,nl);' +
          'document.querySelectorAll("[data-t]").forEach(function(e){var v=__t(e.getAttribute("data-t"));if(v)e.textContent=v});' +
          'document.querySelectorAll("[data-placeholder]").forEach(function(e){var v=__t(e.getAttribute("data-placeholder"));if(v)e.setAttribute("placeholder",v)});' +
          'document.querySelectorAll("[data-thref]").forEach(function(e){var k=e.getAttribute("data-thref");var b=nl==="en"?"/en":"";e.setAttribute("href",b+k)});' +
          'document.querySelectorAll("[data-comment-msg]").forEach(function(e){e.setAttribute("data-comment-msg",e.getAttribute("data-comment-msg-"+nl));e.setAttribute("data-comment-err",e.getAttribute("data-comment-err-"+nl));e.setAttribute("data-comment-url",e.getAttribute("data-comment-url-"+nl))});' +
'document.querySelectorAll("[data-comment-count]").forEach(function(e){var v=e.getAttribute("data-comment-count-"+nl);if(v)e.textContent=v})}' +
          '});' +
          '});'
        }} />
      </body>
    </html>
  )
}

export default Layout
