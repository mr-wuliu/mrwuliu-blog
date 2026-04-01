import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'

type Post = {
  id: string
  title: string
  slug: string
  publishedAt: string | null
  createdAt: string
}

function formatDate(dateStr: string | null): string {
  const d = dateStr ? new Date(dateStr) : null
  if (!d || isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}年${m}月${day}日`
}

const WritingsPage: FC<{ posts: Post[]; authorProfile?: AuthorProfile }> = ({ posts, authorProfile }) => {
  return (
    <Layout title="文字 - Blog" authorProfile={authorProfile}>
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-8">
          文字
        </h1>
        {posts.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p>暂无文章</p>
          </div>
        ) : (
          <ul class="divide-y divide-black">
            {posts.map((post) => (
              <li>
                <a
                  href={`/posts/${post.slug}`}
                  class="flex justify-between items-baseline py-4 group hover:bg-black hover:bg-opacity-5 transition-colors px-2 -mx-2 no-underline text-black"
                >
                  <span class="text-base group-hover:underline">{post.title}</span>
                  <span class="text-xs uppercase tracking-widest opacity-50 shrink-0 ml-4">
                    {formatDate(post.publishedAt || post.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}

export default WritingsPage
