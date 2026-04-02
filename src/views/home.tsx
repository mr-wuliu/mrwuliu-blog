import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
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

type PaginationData = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type HomeProps = {
  lang: Lang
  posts: Post[]
  pagination: PaginationData
  authorProfile?: AuthorProfile
}

const PostCard: FC<{ post: Post; lang: Lang }> = ({ post, lang }) => {
  return (
    <article class="p-6 bg-white border border-black rounded-none shadow-none hover:-translate-y-1 transition-all mb-6">
      <a href={langPath(`/posts/${post.slug}`, lang)} class="no-underline text-black block">
        <h2 class="text-xl font-bold tracking-tight mb-2">
          {post.pinned && <span class="text-red-500 mr-1">📌</span>}
          {post.title}
        </h2>
        {post.publishedAt && (
          <time class="text-xs font-bold uppercase tracking-widest opacity-50" datetime={post.publishedAt}>
            {formatDateLang(post.publishedAt, lang)}
          </time>
        )}
        {post.excerpt && <p class="mt-3 opacity-70 text-lg leading-relaxed">{post.excerpt}</p>}
      </a>
      <div class="mt-4 flex items-center justify-between">
        <div class="flex flex-wrap gap-2">
          {post.tags && post.tags.map((tag) => (
            <a href={langPath(`/tags/${tag.slug}`, lang)} class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline">{tag.name}</a>
          ))}
        </div>
        <div class="flex items-center gap-4 shrink-0 ml-4">
          <a href={langPath(`/posts/${post.slug}`, lang)} class="flex items-center gap-1 text-xs font-bold uppercase tracking-widest opacity-50 no-underline text-black hover:opacity-100 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            <span>{post.commentCount ?? 0}</span>
          </a>
          <button
            class="like-btn flex items-center gap-1 text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all"
            data-post-id={post.id}
            data-like-count={post.likeCount ?? 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            <span class="like-count">{post.likeCount ?? 0}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

const Pagination: FC<{ pagination: PaginationData; lang: Lang }> = ({ pagination, lang }) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null

  return (
    <nav class="mt-12 pt-8 border-t border-black" aria-label="pagination">
      <div class="flex justify-between">
        {page > 1 && (
          <a href={langPath(`/?page=${page - 1}`, lang)} class="text-sm font-bold uppercase tracking-widest border border-black px-6 py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.prev">
            {t(lang, 'pagination.prev')}
          </a>
        )}
        {page < totalPages && (
          <a href={langPath(`/?page=${page + 1}`, lang)} class="ml-auto text-sm font-bold uppercase tracking-widest border border-black px-6 py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.next">
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

const Home: FC<HomeProps> = ({ lang, posts, pagination, authorProfile }) => {
  return (
    <Layout
      title={t(lang, 'home.pageTitle')}
      description={t(lang, 'home.description')}
      url={langPath('/', lang)}
      type="website"
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/"
    >
      <div>
        <h1 class="text-4xl font-bold tracking-tight mb-10" data-t="home.title">{t(lang, 'home.title')}</h1>
        {posts.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="home.noPosts">{t(lang, 'home.noPosts')}</p>
          </div>
        ) : (
          <>
            <div>
              {posts.map((post) => (
                <PostCard post={post} lang={lang} />
              ))}
            </div>
            <Pagination pagination={pagination} lang={lang} />
          </>
        )}
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
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
