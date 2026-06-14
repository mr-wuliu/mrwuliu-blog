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
  tags?: string[]
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
  tags,
  authorProfile,
  lang,
  currentPath = '/',
  publishedTime,
  modifiedTime,
  authorName,
  extraHead,
  children,
}) => {
  const hasSidebar = !!(authorProfile && (authorProfile.avatar || authorProfile.bio || authorProfile.github || authorProfile.email || authorProfile.wechat || authorProfile.xiaohongshu))
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
        <link rel="alternate" type="application/rss+xml" title="RSS Feed (中文)" href="/feed.xml" />
        <link rel="alternate" type="application/rss+xml" title="RSS Feed (English)" href="/en/feed.xml" />
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
          tags={tags}
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
            {/* Mobile: Logo + Hamburger */}
            <div class="flex items-center justify-between gap-4 lg:hidden">
              <a href={langPath('/', lang)} data-thref="/" class="text-xl font-bold tracking-tight text-black hover:opacity-70 transition-all no-underline">mrwuliu</a>
              <button type="button" class="mobile-menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu" id="mobile-menu-btn">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>

            {/* Mobile: Dropdown menu */}
            <div id="mobile-menu" class="mobile-menu lg:hidden">
              <div class="pt-4 border-t border-black mt-4">
                <div class="mobile-menu-controls">
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
                <div class="user-auth-mobile">
                  <a href={langPath('/login', lang)} data-thref="/login" data-t="nav.login" class="mobile-menu-link user-auth-login">{t(lang, 'nav.login')}</a>
                </div>
                <a href={langPath('/writings', lang)} data-thref="/writings" data-t="nav.writings" class="mobile-menu-link">{t(lang, 'nav.writings')}</a>
                <a href={langPath('/series', lang)} data-thref="/series" data-t="nav.series" class="mobile-menu-link">{t(lang, 'nav.series')}</a>
                <a href={langPath('/projects', lang)} data-thref="/projects" data-t="nav.projects" class="mobile-menu-link">{t(lang, 'nav.projects')}</a>
                <a href={langPath('/tags-cloud', lang)} data-thref="/tags-cloud" data-t="nav.tags" class="mobile-menu-link">{t(lang, 'nav.tags')}</a>
                <a href={langPath('/about', lang)} data-thref="/about" data-t="nav.about" class="mobile-menu-link">{t(lang, 'nav.about')}</a>
                <a href={langPath('/friends', lang)} data-thref="/friends" data-t="nav.friends" class="mobile-menu-link">{t(lang, 'nav.friends')}</a>
              </div>
            </div>

            {/* Desktop: Full horizontal nav */}
            <div class="hidden lg:block">
              {hasSidebar ? (
                <div class="lg:flex lg:gap-16">
                  <div class="flex-1 flex items-center justify-between gap-6 min-w-0">
                    <a href={langPath('/', lang)} data-thref="/" class="text-xl font-bold tracking-tight text-black hover:opacity-70 transition-all no-underline">mrwuliu</a>
                    <div class="flex-1 overflow-x-auto">
                      <div class="flex gap-6 text-lg uppercase tracking-widest shrink-0 whitespace-nowrap justify-center min-w-max">
                        <a href={langPath('/writings', lang)} data-thref="/writings" data-t="nav.writings" class="hover:underline no-underline text-black">{t(lang, 'nav.writings')}</a>
                        <a href={langPath('/series', lang)} data-thref="/series" data-t="nav.series" class="hover:underline no-underline text-black">{t(lang, 'nav.series')}</a>
                        <a href={langPath('/projects', lang)} data-thref="/projects" data-t="nav.projects" class="hover:underline no-underline text-black">{t(lang, 'nav.projects')}</a>
                        <a href={langPath('/tags-cloud', lang)} data-thref="/tags-cloud" data-t="nav.tags" class="hover:underline no-underline text-black">{t(lang, 'nav.tags')}</a>
                        <a href={langPath('/about', lang)} data-thref="/about" data-t="nav.about" class="hover:underline no-underline text-black">{t(lang, 'nav.about')}</a>
                        <a href={langPath('/friends', lang)} data-thref="/friends" data-t="nav.friends" class="hover:underline no-underline text-black">{t(lang, 'nav.friends')}</a>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 shrink-0 ml-auto">
                    <select class="theme-select" aria-label="Theme">
                      <option value="default">Default</option>
                      <option value="coffee">Coffee</option>
                    </select>
                    <a href={toggleHref} class="lang-toggle">
                      <span class={`lang-toggle-option${lang === 'en' ? ' lang-toggle-option-active' : ''}`} data-lang="en">EN</span>
                      <span class={`lang-toggle-option${lang === 'zh' ? ' lang-toggle-option-active' : ''}`} data-lang="zh">中文</span>
                      <span class={`lang-toggle-thumb${lang === 'en' ? '' : ' lang-toggle-thumb-end'}`}>{lang === 'en' ? 'EN' : '中文'}</span>
                    </a>
                    <div class="user-auth-zone relative shrink-0">
                      <a href={langPath('/login', lang)} data-thref="/login" data-t="nav.login" class="user-auth-link text-sm font-bold uppercase tracking-widest text-black hover:opacity-70 no-underline">{t(lang, 'nav.login')}</a>
                    </div>
                  </div>
                </div>
              ) : (
                <div class="flex items-center justify-between gap-6">
                  <a href={langPath('/', lang)} data-thref="/" class="text-xl font-bold tracking-tight text-black hover:opacity-70 transition-all no-underline">mrwuliu</a>
                  <div class="flex-1 overflow-x-auto">
                    <div class="flex gap-6 text-lg uppercase tracking-widest shrink-0 whitespace-nowrap justify-center min-w-max">
                      <a href={langPath('/writings', lang)} data-thref="/writings" data-t="nav.writings" class="hover:underline no-underline text-black">{t(lang, 'nav.writings')}</a>
                      <a href={langPath('/series', lang)} data-thref="/series" data-t="nav.series" class="hover:underline no-underline text-black">{t(lang, 'nav.series')}</a>
                      <a href={langPath('/projects', lang)} data-thref="/projects" data-t="nav.projects" class="hover:underline no-underline text-black">{t(lang, 'nav.projects')}</a>
                      <a href={langPath('/tags-cloud', lang)} data-thref="/tags-cloud" data-t="nav.tags" class="hover:underline no-underline text-black">{t(lang, 'nav.tags')}</a>
                      <a href={langPath('/about', lang)} data-thref="/about" data-t="nav.about" class="hover:underline no-underline text-black">{t(lang, 'nav.about')}</a>
                      <a href={langPath('/friends', lang)} data-thref="/friends" data-t="nav.friends" class="hover:underline no-underline text-black">{t(lang, 'nav.friends')}</a>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 shrink-0 ml-auto">
                    <select class="theme-select" aria-label="Theme">
                      <option value="default">Default</option>
                      <option value="coffee">Coffee</option>
                    </select>
                    <a href={toggleHref} class="lang-toggle">
                      <span class={`lang-toggle-option${lang === 'en' ? ' lang-toggle-option-active' : ''}`} data-lang="en">EN</span>
                      <span class={`lang-toggle-option${lang === 'zh' ? ' lang-toggle-option-active' : ''}`} data-lang="zh">中文</span>
                      <span class={`lang-toggle-thumb${lang === 'en' ? '' : ' lang-toggle-thumb-end'}`}>{lang === 'en' ? 'EN' : '中文'}</span>
                    </a>
                    <div class="user-auth-zone relative shrink-0">
                      <a href={langPath('/login', lang)} data-thref="/login" data-t="nav.login" class="user-auth-link text-sm font-bold uppercase tracking-widest text-black hover:opacity-70 no-underline">{t(lang, 'nav.login')}</a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </header>
        <main class="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 pt-10 md:pt-12 pb-8 md:pb-12 flex-1 w-full">
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
          '(function(){var btn=document.getElementById("mobile-menu-btn");var menu=document.getElementById("mobile-menu");if(!btn||!menu)return;function close(){menu.style.maxHeight="0";btn.classList.remove("mobile-menu-btn-active");btn.setAttribute("aria-expanded","false")}function open(){menu.style.maxHeight=menu.scrollHeight+"px";btn.classList.add("mobile-menu-btn-active");btn.setAttribute("aria-expanded","true")}close();menu.style.overflow="hidden";menu.style.transition="max-height 0.3s ease";btn.addEventListener("click",function(){var isOpen=btn.getAttribute("aria-expanded")==="true";if(isOpen)close();else open()});menu.querySelectorAll("a").forEach(function(a){a.addEventListener("click",close)});window.addEventListener("resize",function(){if(btn.getAttribute("aria-expanded")==="true")menu.style.maxHeight=menu.scrollHeight+"px"})})();'
        }} />
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
        <script dangerouslySetInnerHTML={{ __html:
          '(function(){' +
          'function identicon(seed,size){' +
          'function hashStr(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return h>>>0}' +
          'var h0=hashStr(seed),h1=hashStr(seed+"#1");var hue=(h0%360+360)%360;var fg="hsl("+hue+",65%,55%)";' +
          'var cells=[],gs=5,cs=size/gs;' +
          'for(var row=0;row<gs;row++){for(var col=0;col<3;col++){var bit=(h1>>>(row*3+col))&1;' +
          'if(bit){var x=col*cs,y=row*cs;cells.push("<rect x=\\""+x+"\\" y=\\""+y+"\\" width=\\""+cs+"\\" height=\\""+cs+"\\" fill=\\""+fg+"\\"/>");' +
          'if(col<2)cells.push("<rect x=\\""+(gs-1-col)*cs+"\\" y=\\""+y+"\\" width=\\""+cs+"\\" height=\\""+cs+"\\" fill=\\""+fg+"\\"/>")}}}' +
          'return "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 "+size+" "+size+"\\" width=\\""+size+"\\" height=\\""+size+"\\" style=\\"display:block\\">"+cells.join("")+"</svg>"}' +
          'function avatarImg(u,size){var seed=u.avatarSeed||u.id;var img=document.createElement("img");img.style.cssText="width:100%;height:100%;object-fit:cover;display:block";img.setAttribute("alt","");var ic="data:image/svg+xml,"+encodeURIComponent(identicon(seed,size));if(u.avatarUrl){img.src=u.avatarUrl;img.onerror=function(){img.onerror=null;img.src=ic}}else{img.src=ic}return img}' +
          'function avatarBox(u,size){var d=document.createElement("div");d.style.cssText="width:"+size+"px;height:"+size+"px;overflow:hidden;line-height:0;font-size:0";d.appendChild(avatarImg(u,size));return d}' +
          'var b=__cur==="en"?"/en":"";' +
          'fetch("/auth/me",{credentials:"include"}).then(function(r){return r.json()}).then(function(d){' +
          'var u=d&&d.user;if(!u)return;' +
          'document.querySelectorAll(".user-auth-zone").forEach(function(zone){' +
          'var link=zone.querySelector(".user-auth-link");if(link)link.classList.add("hidden");' +
          'if(zone.querySelector(".user-avatar-wrap"))return;' +
          'var wrap=document.createElement("div");wrap.className="user-avatar-wrap relative";' +
          'var btn=document.createElement("button");btn.type="button";' +
          'btn.style.cssText="width:32px;height:32px;border:1px solid #000;overflow:hidden;line-height:0;font-size:0;cursor:pointer;padding:0;background:#fff";' +
          'btn.className="user-avatar-btn";btn.appendChild(avatarImg(u,32));' +
          'var menu=document.createElement("div");' +
          'menu.className="user-avatar-menu hidden absolute right-0 top-full mt-2 bg-white border border-black z-50";' +
          'menu.style.minWidth="160px";' +
          'menu.innerHTML=' +
          '"<a href=\\""+b+"/settings\\" data-thref=\\"/settings\\" data-t=\\"nav.settings\\" class=\\"block px-4 py-2 text-xs font-bold uppercase tracking-widest text-black hover:bg-black hover:text-white no-underline\\">"+__t("nav.settings")+"</a>"+' +
          '"<a href=\\"#\\" class=\\"user-auth-logout block px-4 py-2 text-xs font-bold uppercase tracking-widest text-black hover:bg-black hover:text-white no-underline\\" data-t=\\"nav.logout\\">"+__t("nav.logout")+"</a>";' +
          'wrap.appendChild(btn);wrap.appendChild(menu);zone.appendChild(wrap);' +
          'btn.addEventListener("click",function(e){e.stopPropagation();menu.classList.toggle("hidden")})});' +
          'document.querySelectorAll(".user-auth-mobile").forEach(function(zone){' +
          'zone.innerHTML="";' +
          'var row=document.createElement("div");row.className="flex items-center gap-3 py-2";' +
          'row.appendChild(avatarBox(u,36));' +
          'var nm=document.createElement("span");nm.className="text-sm font-bold text-black truncate";nm.textContent=u.name;row.appendChild(nm);' +
          'zone.appendChild(row);' +
          'var sl=document.createElement("a");sl.href=b+"/settings";sl.setAttribute("data-thref","/settings");sl.setAttribute("data-t","nav.settings");sl.className="mobile-menu-link";sl.textContent=__t("nav.settings");zone.appendChild(sl);' +
          'var ll=document.createElement("a");ll.href="#";ll.className="mobile-menu-link user-auth-logout";ll.setAttribute("data-t","nav.logout");ll.textContent=__t("nav.logout");zone.appendChild(ll)' +
          '})' +
          '}).catch(function(){});' +
          'document.addEventListener("click",function(e){' +
          'if(!e.target.closest(".user-avatar-wrap")){document.querySelectorAll(".user-avatar-menu").forEach(function(m){m.classList.add("hidden")})}' +
          'var tg=e.target.closest(".user-auth-logout");' +
          'if(!tg)return;e.preventDefault();' +
          'fetch("/auth/logout",{method:"POST",credentials:"include"}).then(function(){window.location.reload()}).catch(function(){window.location.reload()})' +
          '});' +
          '})();'
        }} />
      </body>
    </html>
  )
}

export default Layout
