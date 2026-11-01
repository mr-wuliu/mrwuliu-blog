import type { FC } from 'hono/jsx'
import Layout from './layout'
import AuthorSidebar, { type AuthorProfile } from './components/author-sidebar'
import { OrganizationSchema, WebSiteSchema } from './components/structured-data'
import { type Lang, t, tf, langPath, formatDateLang } from '../i18n'

type Tag = {
  id: string
  name: string
  slug: string
}

type Post = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  coverImageKey: string | null
  status: 'draft' | 'published'
  hidden: boolean
  pinned: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
  commentCount?: number
  likeCount?: number
}

type SeriesRef = {
  id: string
  name: string
  nameEn: string | null
  slug: string
}

export type HomeRenderGroup =
  | { kind: 'post'; post: Post }
  | { kind: 'series'; collection: SeriesRef; posts: Post[] }

type PaginationData = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type HomeProps = {
  lang: Lang
  groups: HomeRenderGroup[]
  pagination: PaginationData
  authorProfile?: AuthorProfile
}

const PostCard: FC<{ post: Post; lang: Lang }> = ({ post, lang }) => {
  return (
    <article class={`journal-card${post.coverImageKey ? ' journal-card-image' : ' journal-card-text'}`}>
      {post.coverImageKey && (
        <a href={langPath(`/posts/${post.slug}`, lang)} class="journal-cover" tabindex={-1} aria-hidden="true">
          <img src={`/images/${post.coverImageKey}`} alt="" loading="lazy" decoding="async" />
        </a>
      )}
      <div class="journal-card-body">
      <a href={langPath(`/posts/${post.slug}`, lang)} class="no-underline text-black block">
        <h2 class="journal-title">
          {post.pinned && <span class="text-red-500 mr-1">📌</span>}
          {post.title}
        </h2>
        {post.publishedAt && (
          <time class="text-xs font-bold uppercase tracking-widest opacity-50" datetime={post.publishedAt}>
            {formatDateLang(post.publishedAt, lang)}
          </time>
        )}
        {post.excerpt && <p class="journal-excerpt">{post.excerpt}</p>}
      </a>
      <div class="journal-card-footer">
        <div class="flex flex-wrap gap-2">
          {post.tags && post.tags.map((tag) => (
            <a href={langPath(`/tags/${tag.slug}`, lang)} class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline">{tag.name}</a>
          ))}
        </div>
        <div class="flex items-center gap-4 shrink-0">
          <a href={langPath(`/posts/${post.slug}`, lang)} aria-label={t(lang, 'home.comments')} class="flex items-center gap-1 text-xs font-bold uppercase tracking-widest opacity-50 no-underline text-black hover:opacity-100 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            <span>{post.commentCount ?? 0}</span>
          </a>
          <button
            type="button"
            aria-label={t(lang, 'home.like')}
            class="like-btn flex items-center gap-1 text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all"
            data-post-id={post.id}
            data-like-count={post.likeCount ?? 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            <span class="like-count">{post.likeCount ?? 0}</span>
          </button>
        </div>
      </div>
      </div>
    </article>
  )
}

const SeriesStack: FC<{ collection: SeriesRef; posts: Post[]; lang: Lang }> = ({ collection, posts, lang }) => {
  const displayName = lang === 'en' && collection.nameEn ? collection.nameEn : collection.name

  return (
    <article class="journal-card journal-series journal-card-body">
      <div class="flex items-center gap-3 min-w-0 flex-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
        <a href={langPath(`/series/${collection.slug}`, lang)} class="text-lg sm:text-xl font-bold tracking-tight text-black no-underline hover:opacity-70 transition-all break-words">{displayName}</a>
        <span class="shrink-0 text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5">{tf(lang, 'home.seriesCount')(posts.length)}</span>
      </div>
      <div class="mt-4 flex flex-col gap-2">
        {posts.slice(0, 3).map((post, i) => (
          <div class="journal-series-entry">
            <a href={langPath(`/posts/${post.slug}`, lang)} class="block px-3 py-2 no-underline text-black">
              <div class="flex items-baseline gap-2 sm:gap-3 min-w-0 flex-wrap">
                <span class="text-xs font-bold opacity-30 shrink-0 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span class="text-sm sm:text-base font-bold tracking-tight break-words min-w-0">{post.title}</span>
                <time class="ml-auto text-[10px] font-bold uppercase tracking-widest opacity-50 shrink-0" datetime={post.publishedAt ?? post.createdAt}>
                  {formatDateLang(post.publishedAt ?? post.createdAt, lang)}
                </time>
              </div>
              {post.excerpt && <p class="mt-1.5 text-sm opacity-70 leading-relaxed">{post.excerpt}</p>}
            </a>
          </div>
        ))}
      </div>
      <a class="journal-series-more" href={langPath(`/series/${collection.slug}`, lang)}>{t(lang, 'nav.series')} <span aria-hidden="true">↗</span></a>
    </article>
  )
}

const Pagination: FC<{ pagination: PaginationData; lang: Lang }> = ({ pagination, lang }) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null

  return (
    <nav class="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-black" aria-label="pagination">
      <div class="flex justify-between">
        {page > 1 && (
          <a href={langPath(`/?page=${page - 1}`, lang)} class="text-xs sm:text-sm font-bold uppercase tracking-widest border border-black px-4 sm:px-6 py-2.5 sm:py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.prev">
            {t(lang, 'pagination.prev')}
          </a>
        )}
        {page < totalPages && (
          <a href={langPath(`/?page=${page + 1}`, lang)} class="ml-auto text-xs sm:text-sm font-bold uppercase tracking-widest border border-black px-4 sm:px-6 py-2.5 sm:py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.next">
            {t(lang, 'pagination.next')}
          </a>
        )}
      </div>
      <span class="block mt-4 text-center text-xs font-bold uppercase tracking-widest opacity-50">
        {tf(lang, 'pagination.pageInfo')(page, totalPages)}
      </span>
    </nav>
  )
}

const Home: FC<HomeProps> = ({ lang, groups, pagination, authorProfile }) => {
  return (
    <Layout
      title={t(lang, 'home.pageTitle')}
      description={t(lang, 'home.description')}
      url={langPath('/', lang)}
      type="website"
      homeLayout
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/"
      extraHead={
        <>
          <OrganizationSchema github={authorProfile?.github} email={authorProfile?.email} />
          <WebSiteSchema />
        </>
      }
    >
      <section class="home-journal">
        <div class="journal-intro">
          <div>
            <p class="journal-eyebrow">MRWULIU / <span data-t="home.journal">{t(lang, 'home.journal')}</span></p>
            <h1 data-t="home.intro">{t(lang, 'home.intro')}</h1>
            <p class="journal-subtitle" data-t="home.subtitle">{t(lang, 'home.subtitle')}</p>
          </div>
          {authorProfile && <div class="journal-author"><AuthorSidebar profile={authorProfile} /></div>}
        </div>
        <div class="journal-section-heading">
          <h2 data-t="home.title">{t(lang, 'home.title')}</h2>
          <a href={langPath('/writings', lang)} data-thref="/writings"><span data-t="nav.writings">{t(lang, 'nav.writings')}</span> <span aria-hidden="true">↗</span></a>
        </div>
        {groups.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="home.noPosts">{t(lang, 'home.noPosts')}</p>
          </div>
        ) : (
          <>
            <div class="journal-grid">
              {groups.map((group) =>
                group.kind === 'post' ? (
                  <PostCard post={group.post} lang={lang} />
                ) : (
                  <SeriesStack collection={group.collection} posts={group.posts} lang={lang} />
                )
              )}
            </div>
            <Pagination pagination={pagination} lang={lang} />
          </>
        )}
      </section>
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var grid = document.querySelector('.journal-grid');
  if (grid) {
    var frame;
    function layout() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function() {
        var columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
        grid.classList.toggle('is-masonry', columns > 1);
        grid.querySelectorAll(':scope > article').forEach(function(card) {
          card.style.gridRowEnd = columns > 1 ? 'span ' + Math.ceil((card.getBoundingClientRect().height + 24) / 8) : '';
        });
      });
    }
    var observer = new ResizeObserver(layout);
    observer.observe(grid);
    grid.querySelectorAll(':scope > article').forEach(function(card) { observer.observe(card); });
    grid.querySelectorAll('img').forEach(function(img) {
      img.addEventListener('load', layout);
      function fallback() { img.closest('.journal-cover').hidden = true; layout(); }
      img.addEventListener('error', fallback);
      if (img.complete && !img.naturalWidth) fallback();
    });
    document.fonts.ready.then(layout);
    layout();
  }
  function getFingerprint() {
    var k = 'blog_fp';
    var fp = localStorage.getItem(k);
    if (!fp) { fp = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); localStorage.setItem(k, fp); }
    return fp;
  }
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.like-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true;
    var postId = btn.getAttribute('data-post-id');
    var countEl = btn.querySelector('.like-count');
    var svg = btn.querySelector('svg');
    var count = parseInt(btn.getAttribute('data-like-count') || '0', 10);
    fetch('/api/posts/' + postId + '/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: getFingerprint() })
    }).then(function(res) { return res.json(); }).then(function(data) {
      if (data.liked) {
        count++;
        svg.setAttribute('fill', 'currentColor');
        btn.style.opacity = '1';
      } else {
        count = Math.max(0, count - 1);
        svg.setAttribute('fill', 'none');
        btn.style.opacity = '';
      }
      countEl.textContent = count;
      btn.setAttribute('data-like-count', count);
    }).catch(function() {}).finally(function() { btn.disabled = false; });
  });
})();
      ` }} />
    </Layout>
  )
}

export default Home
