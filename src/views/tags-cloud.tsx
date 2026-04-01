import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'

type TagItem = {
  id: string
  name: string
  slug: string
  postCount: number
}

function getTagSizeClass(count: number): string {
  if (count >= 11) return 'text-2xl'
  if (count >= 7) return 'text-xl'
  if (count >= 4) return 'text-lg'
  if (count >= 2) return 'text-base'
  return 'text-sm'
}

const TagsCloudPage: FC<{ tags: TagItem[]; authorProfile?: AuthorProfile }> = ({ tags, authorProfile }) => {
  return (
    <Layout title="标签 - Blog" authorProfile={authorProfile}>
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-8">
          标签
        </h1>
        {tags.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p>暂无标签</p>
          </div>
        ) : (
          <div class="flex flex-wrap gap-3 items-center">
            {tags.map((tag) => (
              <a
                href={`/tags/${tag.slug}`}
                class={`border border-black px-3 py-1 hover:bg-black hover:text-white transition-colors no-underline text-black ${getTagSizeClass(tag.postCount)}`}
              >
                {tag.name} ({tag.postCount})
              </a>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default TagsCloudPage
