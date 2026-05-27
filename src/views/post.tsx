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

function md5(input: string): string {
  const bytes = new TextEncoder().encode(input)
  const len = bytes.length
  const bitLen = len * 8
  const padLen = ((56 - (len + 1) % 64) + 64) % 64
  const buf = new Uint8Array(len + 1 + padLen + 8)
  buf.set(bytes)
  buf[len] = 0x80
  const dv = new DataView(buf.buffer)
  dv.setUint32(buf.length - 8, bitLen >>> 0, true)
  dv.setUint32(buf.length - 4, 0, true)
  const K = [
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391,
  ]
  const S = [
    7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
    5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
    6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21,
  ]
  let a0=0x67452301, b0=0xefcdab89, c0=0x98badcfe, d0=0x10325476
  for (let off = 0; off < buf.length; off += 64) {
    const M = new Int32Array(16)
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true)
    let A=a0, B=b0, C=c0, D=d0
    for (let i = 0; i < 64; i++) {
      let F: number, g: number
      if (i < 16)      { F = (B & C) | (~B & D); g = i }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5*i+1) % 16 }
      else if (i < 48) { F = B ^ C ^ D;          g = (3*i+5) % 16 }
      else              { F = C ^ (B | ~D);       g = (7*i) % 16 }
      F = (F + A + K[i] + M[g]) >>> 0
      A = D; D = C; C = B
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0
    }
    a0 = (a0+A)>>>0; b0 = (b0+B)>>>0; c0 = (c0+C)>>>0; d0 = (d0+D)>>>0
  }
  const out = new Uint8Array(16)
  const ov = new DataView(out.buffer)
  ov.setUint32(0,a0,true); ov.setUint32(4,b0,true); ov.setUint32(8,c0,true); ov.setUint32(12,d0,true)
  return Array.from(out, b => b.toString(16).padStart(2,'0')).join('')
}

function avatarHtml(email: string | null, fallbackSeed: string, size: number): string {
  if (!email) return identicon(fallbackSeed, size)
  const hash = md5(email.trim().toLowerCase())
  return `<img src="https://www.gravatar.com/avatar/${hash}?s=${size*2}&d=404" loading="lazy" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentNode.innerHTML=this.parentNode.getAttribute('data-fb')" />`
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
  collections?: { id: string; name: string; nameEn: string | null; slug: string; posts: { id: string; title: string; slug: string }[] }[]
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

  const replyLabel = t(lang, 'post.reply')
  const cancelReplyLabel = t(lang, 'post.cancelReply')

  const topLevelComments = comments.filter(c => !c.parentId)
  const repliesByParent: Record<string, Comment[]> = {}
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = []
      repliesByParent[c.parentId].push(c)
    }
  }

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
      data-reply-label={replyLabel}
      data-cancel-reply-label={cancelReplyLabel}
    >
      <h2 class="text-xl font-bold tracking-tight mb-4"
        data-comment-count={comments.length}
        data-comment-count-zh={commentCountZh}
        data-comment-count-en={commentCountEn}
      >{tf(lang, 'post.comments')(comments.length)}</h2>

      {comments.length > 0 && (
        <div class="space-y-4 mb-8">
          {topLevelComments.map((c) => (
            <div class="p-6 bg-white border border-black mb-2" id={`comment-${c.id}`}>
              <div class="flex gap-3">
                <div class="flex-shrink-0 mt-0.5 border border-gray-300 h-[40px] w-[40px] overflow-hidden" style="line-height:0;font-size:0" {...(c.authorEmail ? { 'data-fb': identicon(c.visitorId || ((c.authorEmail || '') + c.authorName), 40) } : {})} dangerouslySetInnerHTML={{ __html: avatarHtml(c.authorEmail, c.visitorId || ((c.authorEmail || '') + c.authorName), 40) }} />
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 mb-1">
                    <span class="text-sm font-bold text-black">{c.authorName}</span>
                    <span class="text-xs font-bold uppercase tracking-widest opacity-50">{formatDateLang(c.createdAt, lang)}</span>
                  </div>
                  <div class="text-sm opacity-70 leading-relaxed">{c.content}</div>
                  <button type="button" class="reply-btn text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all mt-2" data-reply-to={c.id} data-reply-name={c.authorName}>{replyLabel}</button>
                </div>
              </div>
              {(repliesByParent[c.id] || []).length > 0 && (
                <div class="ml-12 mt-4 pt-4 border-t border-gray-200 space-y-2">
                  {(repliesByParent[c.id] || []).map((r) => (
                    <div class="flex gap-3 py-2" id={`comment-${r.id}`}>
                      <div class="flex-shrink-0 mt-0.5 border border-gray-200 h-[32px] w-[32px] overflow-hidden" style="line-height:0;font-size:0" {...(r.authorEmail ? { 'data-fb': identicon(r.visitorId || ((r.authorEmail || '') + r.authorName), 32) } : {})} dangerouslySetInnerHTML={{ __html: avatarHtml(r.authorEmail, r.visitorId || ((r.authorEmail || '') + r.authorName), 32) }} />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-baseline gap-2 mb-1">
                          <span class="text-sm font-bold text-black">{r.authorName}</span>
                          <span class="text-xs font-bold uppercase tracking-widest opacity-50">{formatDateLang(r.createdAt, lang)}</span>
                        </div>
                        <div class="text-sm opacity-70 leading-relaxed">→ {c.authorName}: {r.content}</div>
                        <button type="button" class="reply-btn text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all mt-1" data-reply-to={c.id} data-reply-name={r.authorName}>{replyLabel}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          <div id="reply-indicator" class="hidden px-3 py-2 bg-gray-100 border border-gray-300 text-sm flex items-center justify-between">
            <span id="reply-indicator-text"></span>
            <button type="button" id="cancel-reply-btn" class="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all">{cancelReplyLabel}</button>
          </div>
          <input type="hidden" id="comment-parent-id" name="parentId" value="" />
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
  function getReplyLabel() { return section.getAttribute('data-reply-label'); }
  function getCancelReplyLabel() { return section.getAttribute('data-cancel-reply-label'); }

  var parentInput = document.getElementById('comment-parent-id');
  var replyIndicator = document.getElementById('reply-indicator');
  var replyIndicatorText = document.getElementById('reply-indicator-text');
  var cancelReplyBtn = document.getElementById('cancel-reply-btn');

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

  function clearReply() {
    parentInput.value = '';
    replyIndicator.classList.add('hidden');
    replyIndicator.classList.remove('flex');
  }

  document.querySelectorAll('.reply-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var replyTo = btn.getAttribute('data-reply-to');
      var replyName = btn.getAttribute('data-reply-name');
      parentInput.value = replyTo;
      replyIndicatorText.textContent = getReplyLabel() + ' ' + replyName;
      replyIndicator.classList.remove('hidden');
      replyIndicator.classList.add('flex');
      var details = form.closest('details');
      if (details) details.open = true;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.querySelector('#content').focus();
    });
  });

  cancelReplyBtn.addEventListener('click', function() {
    clearReply();
  });

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
    var pid = parentInput.value;
    if (pid) data.parentId = pid;

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
        clearReply();
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

const PostPage: FC<PostPageProps> = ({ lang, post, content, headings, comments, prev, next, authorProfile, collections }) => {
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

        {collections && collections.length > 0 && (
          <div class="mb-8 border border-gray-200 rounded p-4">
            {collections.map(collection => (
              <div key={collection.id} class="mb-4 last:mb-0">
                <h3 class="text-sm font-medium uppercase tracking-widest text-gray-500 mb-2">
                  <a href={langPath('/series/' + collection.slug, lang)} class="hover:text-black transition-colors no-underline text-gray-500">
                    {lang === 'en' && collection.nameEn ? collection.nameEn : collection.name}
                  </a>
                </h3>
                <ol class="space-y-1">
                  {collection.posts.map((cp, index) => (
                    <li key={cp.id}>
                      <a href={langPath('/posts/' + cp.slug, lang)}
                         class={`text-sm no-underline transition-colors ${cp.id === post.id ? 'font-bold text-black' : 'text-gray-600 hover:text-black'}`}>
                        {index + 1}. {cp.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        <Toc headings={headings} lang={lang} />

        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var toc = document.querySelector('nav.my-8');
  if (!toc) return;
  toc.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href[0] !== '#') return;
    var target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', href);
  });
})();
        ` }} />

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
  var sources = document.querySelectorAll('.post-content .mermaid-source');
  if (!sources.length) return;

  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
  s.onload = function() {
    var baseConfig = { startOnLoad: false, theme: 'base', look: 'handDrawn', securityLevel: 'strict' };
    var defaultVars = {
      fontFamily: '"Nunito", sans-serif', fontSize: '14px',
      primaryColor: '#eef2f7', primaryTextColor: '#2d3748', primaryBorderColor: '#94a3b8',
      lineColor: '#94a3b8', secondaryColor: '#f1f5f9', tertiaryColor: '#ffffff',
      background: '#fafafa', mainBkg: '#eef2f7', nodeBorder: '#94a3b8',
      clusterBkg: '#f8fafc', clusterBorder: '#94a3b8', titleColor: '#2d3748',
      edgeLabelBackground: '#f8fafc', nodeTextColor: '#2d3748', nodeBorderRadius: '12px',
    };
    var nodePalette = [
      { bg: '#FF6B6B', border: '#D94848', text: '#ffffff' },
      { bg: '#FFB347', border: '#E09530', text: '#ffffff' },
      { bg: '#6BCB77', border: '#4FAF5B', text: '#ffffff' },
      { bg: '#4D96FF', border: '#3078E0', text: '#ffffff' },
      { bg: '#9B72CF', border: '#7D52B0', text: '#ffffff' },
      { bg: '#FF6EB4', border: '#D94E94', text: '#ffffff' },
      { bg: '#45D4C8', border: '#28B5A9', text: '#ffffff' },
      { bg: '#FFD93D', border: '#E0BC20', text: '#ffffff' },
    ];

    mermaid.initialize(Object.assign({}, baseConfig, { themeVariables: defaultVars }));

    sources.forEach(function(el) {
      if (el.classList.contains('mermaid-rendered')) return;
      var rawCode = el.getAttribute('data-mermaid');
      if (!rawCode) return;
      var look = 'handDrawn';
      var allNodeIds = {};
      var m;
      var isSequence = /^\\s*sequenceDiagram\\b/mi.test(rawCode);
      if (isSequence) {
        var pParticipant = /^\\s*participant\\s+(\\S+)/gmi;
        while ((m = pParticipant.exec(rawCode)) !== null) allNodeIds[m[1]] = true;
        var pActor = /^\\s*actor\\s+(\\S+)/gmi;
        while ((m = pActor.exec(rawCode)) !== null) allNodeIds[m[1]] = true;
        var pArrow = /(\\w+)\\s*[+-]?\\s*(?:-{1,2}>{1,2}|--?x|--?\\))\\s*[+-]?\\s*(\\w+)/g;
        while ((m = pArrow.exec(rawCode)) !== null) {
          allNodeIds[m[1]] = true;
          allNodeIds[m[2]] = true;
        }
      } else {
        var p1 = /\\b([A-Za-z_][A-Za-z0-9_]*)\\s*[\\[\\{(]/g;
        while ((m = p1.exec(rawCode)) !== null) allNodeIds[m[1]] = true;
        var p2 = /(?:-->|---)\\s*(?:\\|[^|]*\\|\\s*)?([A-Za-z_][A-Za-z0-9_]*)/g;
        while ((m = p2.exec(rawCode)) !== null) allNodeIds[m[1]] = true;
      }
      var nodeIds = Object.keys(allNodeIds);
      var styleLines = '';
      if (!isSequence) {
        nodeIds.forEach(function(nid, i) {
          var c = nodePalette[i % nodePalette.length];
          styleLines += '\\nstyle ' + nid + ' fill:' + c.bg + ',stroke:' + c.border + ',color:' + c.text + ',font-weight:bold';
        });
      }
      var seqColors = { bkgColorArray: nodePalette.map(function(c){ return c.bg + '33'; }), borderColorArray: nodePalette.map(function(c){ return c.border; }) };
      var initTheme = isSequence ? 'redux-color' : 'base';
      var initVars = isSequence ? Object.assign({}, defaultVars, seqColors) : defaultVars;
      var initDir = '%%{init:' + JSON.stringify({ theme: initTheme, look: look, themeVariables: initVars }) + '}%%\\n';
      var code = initDir + rawCode + styleLines;
      var id = 'mermaid-' + Math.random().toString(36).substring(2, 10);
      mermaid.render(id, code).then(function(result) {
        var wrapper = document.createElement('div');
        wrapper.className = 'mermaid-diagram';
        wrapper.innerHTML = result.svg;
        var loading = el.querySelector('.mermaid-loading');
        if (loading) loading.style.display = 'none';
        el.insertBefore(wrapper, el.querySelector('pre'));
        el.classList.add('mermaid-rendered');
      }).catch(function() {
        var loading = el.querySelector('.mermaid-loading');
        if (loading) loading.style.display = 'none';
        var pre = el.querySelector('pre');
        if (pre) pre.style.display = '';
      });
    });
  };
  document.head.appendChild(s);
})();
        ` }} />

        {/* Scroll depth tracking */}
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var postId = '${post.id}';
  var maxDepth = 0;

  function getDepth() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h <= 0) return 100;
    return Math.round((window.scrollY / h) * 100);
  }

  function send(depth) {
    var payload = JSON.stringify({ postId: postId, scrollDepth: depth });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/scroll', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/scroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function(){});
    }
  }

  var timer;
  window.addEventListener('scroll', function() {
    var d = getDepth();
    if (d > maxDepth) maxDepth = d;
    clearTimeout(timer);
    timer = setTimeout(function() { send(maxDepth); }, 2000);
  }, { passive: true });

  window.addEventListener('beforeunload', function() {
    var d = getDepth();
    if (d > maxDepth) maxDepth = d;
    if (maxDepth > 0) send(maxDepth);
  });
})();
        ` }} />
       </article>

      <PostNav prev={prev} next={next} lang={lang} />

      <CommentSection comments={comments} postSlug={post.slug} lang={lang} />
    </Layout>
  )
}

export default PostPage
