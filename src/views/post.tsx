import type { FC } from 'hono/jsx'
import type { InferSelectModel } from 'drizzle-orm'
import Layout from './layout'
import type { TocHeading } from '../utils/latex'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, tf, langPath, formatDateLang } from '../i18n'

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
  return (
    <section class="mt-4 pt-4 border-t border-black">
      <h2 class="text-xl font-bold tracking-tight mb-6">{tf(lang, 'post.comments')(comments.length)}</h2>

      {comments.length > 0 && (
        <div class="space-y-4 mb-8">
          {comments.map((c) => (
            <div class="p-6 bg-white border border-black mb-4" id={`comment-${c.id}`}>
              <div class="flex items-center gap-3 mb-2">
                <span class="text-sm font-bold text-black">{c.authorName}</span>
                <span class="text-xs font-bold uppercase tracking-widest opacity-50">{formatDateLang(c.createdAt, lang)}</span>
              </div>
              <div class="mt-2 text-sm opacity-70 leading-relaxed">{c.content}</div>
            </div>
          ))}
        </div>
      )}

      <form class="p-6 border border-black space-y-4" method="post" action={langPath(`/posts/${postSlug}/comments`, lang)}>
        <h3 class="text-lg font-bold tracking-tight mb-4" data-t="post.leaveComment">{t(lang, 'post.leaveComment')}</h3>
        <div>
          <label for="authorName" class="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2" data-t="post.nameLabel">{t(lang, 'post.nameLabel')}</label>
          <input type="text" id="authorName" name="authorName" required maxlength={50}
            class="w-full px-4 py-3 border border-black text-sm focus:outline-none focus:border-black" />
        </div>
        <div>
          <label for="authorEmail" class="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2" data-t="post.emailLabel">{t(lang, 'post.emailLabel')}</label>
          <input type="email" id="authorEmail" name="authorEmail" maxlength={100}
            class="w-full px-4 py-3 border border-black text-sm focus:outline-none focus:border-black" />
        </div>
        <div>
          <label for="content" class="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2" data-t="post.contentLabel">{t(lang, 'post.contentLabel')}</label>
          <textarea id="content" name="content" required maxlength={1000} rows={4}
            class="w-full px-4 py-3 border border-black text-sm focus:outline-none focus:border-black resize-y"></textarea>
        </div>
        <button type="submit"
          class="px-8 py-3 font-bold text-sm border border-black rounded-none uppercase tracking-widest hover:bg-black hover:text-white transition-all" data-t="post.submit">
          {t(lang, 'post.submit')}
        </button>
      </form>
    </section>
  )
}

const PostNav: FC<{ prev: PostNav | null; next: PostNav | null; lang: Lang }> = ({ prev, next, lang }) => {
  if (!prev && !next) return <></>

  return (
    <nav class="mt-6 pt-4 border-t border-black flex justify-between">
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
  return (
    <Layout
      title={post.title}
      description={post.excerpt || post.title}
      type="article"
      authorProfile={authorProfile}
      lang={lang}
      currentPath={`/posts/${post.slug}`}
    >
      <article>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tight leading-tight">{post.title}</h1>
        <div class="mt-4 mb-8 flex items-center gap-4">
          <time datetime={post.publishedAt ?? ''} class="text-xs font-bold uppercase tracking-widest opacity-50">
            {formatDateLang(post.publishedAt, lang)}
          </time>
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

        <Toc headings={headings} lang={lang} />

        <div
          class="post-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>

      <PostNav prev={prev} next={next} lang={lang} />

      <CommentSection comments={comments} postSlug={post.slug} lang={lang} />
    </Layout>
  )
}

export default PostPage
