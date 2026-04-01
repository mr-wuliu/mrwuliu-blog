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
    <article class="p-6 bg-white border border-black rounded-none shadow-none hover:-translate-y-1 transition-all mb-6">
      <h2 class="text-xl font-bold tracking-tight mb-2">
        <a href={`/posts/${post.slug}`} class="text-black no-underline hover:opacity-70 transition-all">{post.title}</a>
      </h2>
      {post.publishedAt && (
        <time class="text-xs font-bold uppercase tracking-widest opacity-50" datetime={post.publishedAt}>
          {formatDate(post.publishedAt)}
        </time>
      )}
      {post.excerpt && <p class="mt-3 opacity-70 text-lg leading-relaxed">{post.excerpt}</p>}
      {post.tags && post.tags.length > 0 && (
        <div class="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <a href={`/tags/${tag.slug}`} class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline">{tag.name}</a>
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
    <nav class="mt-12 pt-8 border-t border-black" aria-label="文章分页">
      <div class="flex justify-between">
        {page > 1 && (
          <a href={`/tags/${tagSlug}?page=${page - 1}`} class="text-sm font-bold uppercase tracking-widest border border-black px-6 py-3 text-black hover:bg-black hover:text-white transition-all no-underline">
            ← 上一页
          </a>
        )}
        {page < totalPages && (
          <a href={`/tags/${tagSlug}?page=${page + 1}`} class="ml-auto text-sm font-bold uppercase tracking-widest border border-black px-6 py-3 text-black hover:bg-black hover:text-white transition-all no-underline">
            下一页 →
          </a>
        )}
      </div>
      <span class="block mt-4 text-center text-xs font-bold uppercase tracking-widest opacity-50">
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
      <div class="flex flex-col md:flex-row gap-12">
        <aside class="md:w-56 shrink-0">
          <h2 class="text-xs font-bold uppercase tracking-widest opacity-50 mb-4">所有标签</h2>
          <ul class="space-y-1 list-none p-0">
            {allTags.map((t) => (
              <li>
                <a
                  href={`/tags/${t.slug}`}
                  class={t.slug === tag.slug
                    ? 'block text-sm px-4 py-2 border-l-2 border-black font-bold text-black bg-black bg-opacity-5 no-underline transition-all'
                    : 'block text-sm px-4 py-2 border-l-2 border-transparent text-black opacity-70 hover:opacity-100 hover:border-black no-underline transition-all'
                  }
                >
                  {t.name}
                </a>
              </li>
            ))}
          </ul>
        </aside>
        <div class="flex-1 min-w-0">
          <h1 class="text-4xl font-bold tracking-tight mb-10">标签: {tag.name}</h1>
          {posts.length === 0 ? (
            <div class="py-16 text-center opacity-50 text-lg">
              <p>该标签下暂无文章</p>
            </div>
          ) : (
            <>
              <div>
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
