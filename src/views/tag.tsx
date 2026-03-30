import type { FC } from 'hono/jsx'
import Layout from './layout'

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
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
}

type PaginationData = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type TagPageProps = {
  tag: Tag
  posts: Post[]
  allTags: Tag[]
  pagination: PaginationData
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

const PostCard: FC<{ post: Post }> = ({ post }) => {
  return (
    <article class="post-card">
      <h2 class="post-card__title">
        <a href={`/posts/${post.slug}`}>{post.title}</a>
      </h2>
      {post.publishedAt && (
        <time class="post-card__date" datetime={post.publishedAt}>
          {formatDate(post.publishedAt)}
        </time>
      )}
      {post.excerpt && <p class="post-card__excerpt">{post.excerpt}</p>}
      {post.tags && post.tags.length > 0 && (
        <div class="post-card__tags">
          {post.tags.map((tag) => (
            <a href={`/tags/${tag.slug}`} class="post-card__tag">{tag.name}</a>
          ))}
        </div>
      )}
    </article>
  )
}

const Pagination: FC<{ pagination: PaginationData; tagSlug: string }> = ({ pagination, tagSlug }) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null

  return (
    <nav class="pagination" aria-label="文章分页">
      <div class="pagination__links">
        {page > 1 && (
          <a href={`/tags/${tagSlug}?page=${page - 1}`} class="pagination__link pagination__link--prev">
            ← 上一页
          </a>
        )}
        {page < totalPages && (
          <a href={`/tags/${tagSlug}?page=${page + 1}`} class="pagination__link pagination__link--next">
            下一页 →
          </a>
        )}
      </div>
      <span class="pagination__info">
        第 {page} 页 / 共 {totalPages} 页
      </span>
    </nav>
  )
}

const TagPage: FC<TagPageProps> = ({ tag, posts, allTags, pagination }) => {
  return (
    <Layout
      title={`标签: ${tag.name}`}
      description={`标签"${tag.name}"下的文章`}
      url={`/tags/${tag.slug}`}
      type="website"
    >
      <div class="tag-page">
        <aside class="tag-page__sidebar">
          <h2 class="tag-page__sidebar-title">所有标签</h2>
          <ul class="tag-page__tag-list">
            {allTags.map((t) => (
              <li>
                <a
                  href={`/tags/${t.slug}`}
                  class={`tag-page__tag-link ${t.slug === tag.slug ? 'tag-page__tag-link--active' : ''}`}
                >
                  {t.name}
                </a>
              </li>
            ))}
          </ul>
        </aside>
        <div class="tag-page__content">
          <h1 class="tag-page__title">标签: {tag.name}</h1>
          {posts.length === 0 ? (
            <div class="tag-page__empty">
              <p>该标签下暂无文章</p>
            </div>
          ) : (
            <>
              <div class="tag-page__posts">
                {posts.map((post) => (
                  <PostCard post={post} />
                ))}
              </div>
              <Pagination pagination={pagination} tagSlug={tag.slug} />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default TagPage
