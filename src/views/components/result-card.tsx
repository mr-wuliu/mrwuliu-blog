import type { FC } from 'hono/jsx'
import { type Lang, langPath, formatDateLang } from '../../i18n'

type ResultPost = {
  title: string
  slug: string
  excerpt: string
  coverImageKey: string | null
  publishedAt: string | null
  createdAt: string
  tags?: { name: string; slug: string }[]
}

const ResultCard: FC<{ post: ResultPost; lang: Lang }> = ({ post, lang }) => (
  <article class="result-card">
    <div class="result-copy">
      <time datetime={post.publishedAt || post.createdAt}>{formatDateLang(post.publishedAt || post.createdAt, lang)}</time>
      <h2><a href={langPath(`/posts/${post.slug}`, lang)}>{post.title}</a></h2>
      {post.excerpt && <p>{post.excerpt}</p>}
      {post.tags && <div class="result-tags">{post.tags.map(tag => <a href={langPath(`/tags/${tag.slug}`, lang)}>{tag.name}</a>)}</div>}
    </div>
    {post.coverImageKey && <a class="result-cover" href={langPath(`/posts/${post.slug}`, lang)} tabindex={-1} aria-hidden="true"><img src={`/images/${post.coverImageKey}`} alt="" loading="lazy" decoding="async" /></a>}
  </article>
)

export default ResultCard
