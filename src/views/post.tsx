import type { FC } from 'hono/jsx'
import type { InferSelectModel } from 'drizzle-orm'
import Layout from './layout'
import { ArticleSchema, BreadcrumbSchema } from './components/structured-data'
import type { TocHeading } from '../utils/latex'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, tf, langPath, formatDateLang, otherLang } from '../i18n'

function identicon(seed: string, size = 40): string {
  function hashStr(s: string): number {
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
  }
  function rot(x: number, k: number): number {
    return ((x << k) | (x >>> (32 - k))) >>> 0
  }
  const h0 = hashStr(seed)
  const h1 = hashStr(seed + '#1')
  const h2 = hashStr(seed + '#2')
  const hue = (h0 % 360 + 360) % 360
  const fg = `hsl(${hue},65%,55%)`
  const cells: string[] = []
  const gridSize = 5
  const cellSize = size / gridSize
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < 3; col++) {
      const bit = h1 >>> (row * 3 + col) & 1
      if (bit) {
        const x = col * cellSize
        const y = row * cellSize
        cells.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fg}"/>`)
        if (col < 2) {
          cells.push(`<rect x="${(gridSize - 1 - col) * cellSize}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fg}"/>`)
        }
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">${cells.join('')}</svg>`
}

type Post = InferSelectModel<typeof import('../db/schema').posts>
type Tag = InferSelectModel<typeof import('../db/schema').tags>
type Comment = InferSelectModel<typeof import('../db/schema').comments>

interface PostWithTags extends Omit<Post, never> {
  tags: Tag[]
}

interface PostNav {
  slug: string
  title: string
}

interface PostPageProps {
  lang: Lang
  post: PostWithTags
  content: string
  headings: TocHeading[]
  comments: Comment[]
  prev: PostNav | null
  next: PostNav | null
  authorProfile?: AuthorProfile
}

const Toc: FC<{ headings: TocHeading[]; lang: Lang }> = ({ headings, lang }) => {
  if (headings.length === 0) return <></>

  return (
    <nav class="my-8 p-6 bg-white border border-black rounded-none">
      <h2 class="text-xs font-bold uppercase tracking-widest opacity-50 mb-4" data-t="post.toc">{t(lang, 'post.toc')}</h2>
      <ul class="space-y-1">
        {headings.map((h) => (
          <li style={`padding-left: ${(h.level - 2) * 1.5}rem`}>
            <a href={`#${h.id}`} class="text-sm text-black opacity-70 hover:opacity-100 no-underline transition-all">{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const CommentSection: FC<{ comments: Comment[]; postSlug: string; lang: Lang }> = ({ comments, postSlug, lang }) => {
  const submitUrl = langPath(`/posts/${postSlug}/comments`, lang)
  const otherL = otherLang(lang)
  const successMsg = t(lang, 'post.commentSuccess')
  const errorMsg = t(lang, 'post.commentError')
  const otherSuccessMsg = t(otherL, 'post.commentSuccess')
  const otherErrorMsg = t(otherL, 'post.commentError')
  const otherSubmitUrl = langPath(`/posts/${postSlug}/comments`, otherL)

  const commentCountZh = lang === 'zh' ? tf(lang, 'post.comments')(comments.length) : tf(otherL, 'post.comments')(comments.length)
  const commentCountEn = lang === 'en' ? tf(lang, 'post.comments')(comments.length) : tf(otherL, 'post.comments')(comments.length)

  return (
    <section class="mt-4 pt-8 border-t-2 border-black"
      data-comment-msg={successMsg}
      data-comment-err={errorMsg}
      data-comment-msg-zh={lang === 'zh' ? successMsg : otherSuccessMsg}
      data-comment-msg-en={lang === 'en' ? successMsg : otherSuccessMsg}
      data-comment-err-zh={lang === 'zh' ? errorMsg : otherErrorMsg}
      data-comment-err-en={lang === 'en' ? errorMsg : otherErrorMsg}
      data-comment-url={submitUrl}
      data-comment-url-zh={lang === 'zh' ? submitUrl : otherSubmitUrl}
      data-comment-url-en={lang === 'en' ? submitUrl : otherSubmitUrl}
    >
      <h2 class="text-xl font-bold tracking-tight mb-4"
        data-comment-count={comments.length}
        data-comment-count-zh={commentCountZh}
        data-comment-count-en={commentCountEn}
      >{tf(lang, 'post.comments')(comments.length)}</h2>

      {comments.length > 0 && (
        <div class="space-y-4 mb-8">
          {comments.map((c) => (
            <div class="p-6 bg-white border border-black mb-4 flex gap-3" id={`comment-${c.id}`}>
              <div class="flex-shrink-0 mt-0.5 border border-gray-300 h-[40px] w-[40px] overflow-hidden" style="line-height:0;font-size:0" dangerouslySetInnerHTML={{ __html: identicon(c.visitorId || ((c.authorEmail || '') + c.authorName)) }} />
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 mb-1">
                  <span class="text-sm font-bold text-black">{c.authorName}</span>
                  <span class="text-xs font-bold uppercase tracking-widest opacity-50">{formatDateLang(c.createdAt, lang)}</span>
                </div>
                <div class="text-sm opacity-70 leading-relaxed">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <div class="mb-8 px-4 py-3 border border-gray-300 bg-gray-100 text-sm text-gray-600" data-t="post.noComments">
          {t(lang, 'post.noComments')}
        </div>
      )}

      <details class="border border-black group">
        <summary class="list-none cursor-pointer px-4 py-3 text-sm font-bold uppercase tracking-widest select-none flex items-center justify-between">
          <span data-t="post.leaveComment">{t(lang, 'post.leaveComment')}</span>
          <span class="transition-transform group-open:rotate-45">+</span>
        </summary>
        <form id="comment-form" class="p-4 border-t border-black space-y-3">
          <style>{`#comment-form input::placeholder, #comment-form textarea::placeholder { color: #999; font-weight: 700; }`}</style>
          <div>
            <input type="text" id="authorName" name="authorName" maxlength={50}
              placeholder={t(lang, 'post.namePlaceholder')}
              data-placeholder="post.namePlaceholder"
              class="w-full px-3 py-2 border border-black text-sm focus:outline-none focus:border-black" />
          </div>
          <div>
            <input type="email" id="authorEmail" name="authorEmail" maxlength={100}
              placeholder={t(lang, 'post.emailLabel')}
              data-placeholder="post.emailLabel"
              class="w-full px-3 py-2 border border-black text-sm focus:outline-none focus:border-black" />
          </div>
          <div>
            <textarea id="content" name="content" required maxlength={1000} rows={4}
              placeholder={t(lang, 'post.contentLabel')}
              data-placeholder="post.contentLabel"
              class="w-full px-3 py-2 border border-black text-sm focus:outline-none focus:border-black resize-y"></textarea>
          </div>
          <button type="submit"
            class="px-8 py-3 font-bold text-sm border border-black rounded-none uppercase tracking-widest hover:bg-black hover:text-white transition-all" data-t="post.submit">
            {t(lang, 'post.submit')}
          </button>
        </form>
      </details>

      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var form = document.getElementById('comment-form');
  if (!form) return;
  var section = form.closest('section');
  function getMsg() { return section.getAttribute('data-comment-msg'); }
  function getErr() { return section.getAttribute('data-comment-err'); }
  function getUrl() { return section.getAttribute('data-comment-url'); }

  function showToast(msg, type) {
    var el = document.createElement('div');
    el.className = 'comment-toast comment-toast--' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function() {
      el.classList.add('comment-toast--visible');
    });
    setTimeout(function() {
      el.classList.remove('comment-toast--visible');
      setTimeout(function() { el.remove(); }, 300);
    }, 4000);
  }

  var savedName = localStorage.getItem('comment_authorName');
  var savedEmail = localStorage.getItem('comment_authorEmail');
  var visitorId = localStorage.getItem('comment_visitorId');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('comment_visitorId', visitorId);
  }
  var nameInput = form.querySelector('#authorName');
  var emailInput = form.querySelector('#authorEmail');
  if (nameInput && savedName) nameInput.value = savedName;
  if (emailInput && savedEmail) emailInput.value = savedEmail;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"]');
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

    var authorName = form.querySelector('#authorName').value.trim() || 'momo';
    var data = {
      authorName: authorName,
      authorEmail: form.querySelector('#authorEmail').value.trim() || undefined,
      visitorId: visitorId,
      content: form.querySelector('#content').value.trim()
    };

    fetch(getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(res) {
      if (res.ok) {
        localStorage.setItem('comment_authorName', data.authorName);
        if (data.authorEmail) localStorage.setItem('comment_authorEmail', data.authorEmail);
        showToast(getMsg(), 'success');
        form.reset();
        if (nameInput) nameInput.value = data.authorName;
        if (emailInput && data.authorEmail) emailInput.value = data.authorEmail;
      } else {
        return res.json().then(function(d) {
          showToast(d.error || getErr(), 'error');
        }).catch(function() {
          showToast(getErr(), 'error');
        });
      }
    }).catch(function() {
      showToast(getErr(), 'error');
    }).finally(function() {
      btn.disabled = false;
      btn.textContent = orig;
    });
  });
})();
      ` }} />
    </section>
  )
}

const PostNav: FC<{ prev: PostNav | null; next: PostNav | null; lang: Lang }> = ({ prev, next, lang }) => {
  if (!prev && !next) return <></>

  return (
    <nav class="mt-40 pt-3 border-t-2 border-black flex justify-between">
      <div>
        {prev && (
          <a href={langPath(`/posts/${prev.slug}`, lang)} class="text-sm font-bold text-black opacity-70 hover:opacity-100 no-underline transition-all inline-flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
            {prev.title}
          </a>
        )}
      </div>
      <div>
        {next && (
          <a href={langPath(`/posts/${next.slug}`, lang)} class="text-sm font-bold text-black opacity-70 hover:opacity-100 no-underline transition-all inline-flex items-center gap-1.5">
            {next.title}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </a>
        )}
      </div>
    </nav>
  )
}

const PostPage: FC<PostPageProps> = ({ lang, post, content, headings, comments, prev, next, authorProfile }) => {
  const postUrl = langPath(`/posts/${post.slug}`, lang)
  const publishedTime = post.publishedAt ?? post.createdAt
  const modifiedTime = post.updatedAt !== publishedTime ? post.updatedAt : undefined

  return (
    <Layout
      title={post.title}
      description={post.excerpt || post.title}
      url={postUrl}
      type="article"
      authorProfile={authorProfile}
      lang={lang}
      currentPath={`/posts/${post.slug}`}
      publishedTime={publishedTime}
      modifiedTime={modifiedTime}
      authorName="mrwuliu"
      extraHead={
        <>
          <ArticleSchema data={{
            title: post.title,
            description: post.excerpt || post.title,
            url: postUrl,
            datePublished: publishedTime,
            dateModified: modifiedTime,
            authorName: 'mrwuliu',
          }} />
          <BreadcrumbSchema items={[
            { name: lang === 'zh' ? '首页' : 'Home', url: langPath('/', lang) },
            { name: lang === 'zh' ? '文章' : 'Writings', url: langPath('/writings', lang) },
            { name: post.title, url: postUrl },
          ]} />
        </>
      }
    >
      <article>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tight leading-tight">{post.title}</h1>
        <div class="mt-4 mb-4 flex items-center gap-4">
          <time datetime={post.publishedAt ?? ''} class="text-xs font-bold uppercase tracking-widest opacity-50">
            {formatDateLang(post.publishedAt, lang)}
          </time>
          {modifiedTime && (
            <span class="text-xs font-bold uppercase tracking-widest opacity-30">
              {lang === 'zh' ? `更新于 ${formatDateLang(modifiedTime, lang)}` : `Updated ${formatDateLang(modifiedTime, lang)}`}
            </span>
          )}
          {post.tags.length > 0 && (
            <ul class="flex flex-wrap gap-1.5 list-none p-0 m-0">
              {post.tags.map((pt) => (
                <li class="m-0">
                  <a class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline" href={langPath(`/tags/${pt.slug}`, lang)}>{pt.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="post-body-divider mb-3" />

        <Toc headings={headings} lang={lang} />

        <div
          class="post-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  function label(kind) {
    if (typeof window.__t === 'function') {
      if (kind === 'copy') return window.__t('post.copyCode') || 'Copy';
      if (kind === 'copied') return window.__t('post.copiedCode') || 'Copied';
      return window.__t('post.copyCodeFailed') || 'Failed';
    }
    return kind === 'copy' ? 'Copy' : kind === 'copied' ? 'Copied' : 'Failed';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        if (ok) resolve();
        else reject(new Error('copy failed'));
      } catch (e) {
        reject(e);
      }
    });
  }

  function mountCopyButtons() {
    var blocks = document.querySelectorAll('.post-content pre');
    blocks.forEach(function(pre) {
      if (pre.querySelector('.code-copy-btn')) return;
      var code = pre.querySelector('code');
      if (!code) return;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.textContent = label('copy');

      btn.addEventListener('click', function() {
        var text = code.textContent || '';
        copyText(text).then(function() {
          btn.textContent = label('copied');
          btn.classList.remove('is-failed');
          btn.classList.add('is-copied');
          setTimeout(function() {
            btn.textContent = label('copy');
            btn.classList.remove('is-copied');
          }, 1400);
        }).catch(function() {
          btn.textContent = label('failed');
          btn.classList.add('is-failed');
          setTimeout(function() {
            btn.textContent = label('copy');
            btn.classList.remove('is-failed');
          }, 1400);
        });
      });

      pre.appendChild(btn);
    });
  }

  function refreshCopyButtonLabels() {
    document.querySelectorAll('.post-content .code-copy-btn').forEach(function(btn) {
      if (btn.classList.contains('is-copied') || btn.classList.contains('is-failed')) return;
      btn.textContent = label('copy');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      mountCopyButtons();
      refreshCopyButtonLabels();
    });
  } else {
    mountCopyButtons();
    refreshCopyButtonLabels();
  }

  var html = document.documentElement;
  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === 'lang') {
        refreshCopyButtonLabels();
        break;
      }
    }
  });
  observer.observe(html, { attributes: true, attributeFilter: ['lang'] });
})();
       ` }} />

       <script dangerouslySetInnerHTML={{ __html: `
(function() {
  function renderMermaid() {
    var sources = document.querySelectorAll('.post-content .mermaid-source');
    if (!sources.length) return;
    if (typeof mermaid === 'undefined') return;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
      fontFamily: 'inherit',
    });

    sources.forEach(function(el) {
      var code = el.getAttribute('data-mermaid');
      if (!code) return;

      var id = 'mermaid-' + Math.random().toString(36).substring(2, 10);

      mermaid.render(id, code).then(function(result) {
        var wrapper = document.createElement('div');
        wrapper.className = 'mermaid-diagram';
        wrapper.innerHTML = result.svg;

        var svg = wrapper.querySelector('svg');
        if (svg) {
          var vb = svg.getAttribute('viewBox');
          if (vb && svg.getAttribute('width') === '100%') {
            var vw = vb.split(' ')[2];
            if (vw) svg.setAttribute('width', vw);
          }
          svg.removeAttribute('style');
          svg.style.maxWidth = '100%';
          svg.style.height = 'auto';
        }

        var loading = el.querySelector('.mermaid-loading');
        if (loading) loading.style.display = 'none';

        el.insertBefore(wrapper, el.querySelector('pre'));
        el.classList.add('mermaid-rendered');
      }).catch(function() {
        // Rendering failed — show code block as fallback
        var loading = el.querySelector('.mermaid-loading');
        if (loading) loading.style.display = 'none';
        var pre = el.querySelector('pre');
        if (pre) pre.style.display = '';
      });
    });
  }

  function tryRender() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(renderMermaid, 100);
      });
    } else {
      setTimeout(renderMermaid, 100);
    }
  }

  tryRender();
})();
       ` }} />
       </article>

      <PostNav prev={prev} next={next} lang={lang} />

      <CommentSection comments={comments} postSlug={post.slug} lang={lang} />
    </Layout>
  )
}

export default PostPage
