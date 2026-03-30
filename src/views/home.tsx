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

type HomeProps = {
  posts: Post[]
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

const Pagination: FC<{ pagination: PaginationData }> = ({ pagination }) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null

  return (
    <nav class="pagination" aria-label="文章分页">
      <div class="pagination__links">
        {page > 1 && (
          <a href={`/?page=${page - 1}`} class="pagination__link pagination__link--prev">
            ← 上一页
          </a>
        )}
        {page < totalPages && (
          <a href={`/?page=${page + 1}`} class="pagination__link pagination__link--next">
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

const Home: FC<HomeProps> = ({ posts, pagination }) => {
  return (
    <Layout
      title="mrwuliu's blog"
      description="个人博客 - 记录技术与生活"
      url="/"
      type="website"
    >
      <div class="home">
        <h1 class="home__title">最新文章</h1>
        {posts.length === 0 ? (
          <div class="home__empty">
            <p>暂无文章</p>
          </div>
        ) : (
          <>
            <div class="home__posts">
              {posts.map((post) => (
                <PostCard post={post} />
              ))}
            </div>
            <Pagination pagination={pagination} />
          </>
        )}
      </div>
    </Layout>
  )
}

export default Home
