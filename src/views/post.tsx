import type { FC } from 'hono/jsx'
import type { InferSelectModel } from 'drizzle-orm'
import Layout from './layout'
import type { TocHeading } from '../utils/latex'

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
  post: PostWithTags
  content: string
  headings: TocHeading[]
  comments: Comment[]
  prev: PostNav | null
  next: PostNav | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00Z'))
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

const Toc: FC<{ headings: TocHeading[] }> = ({ headings }) => {
  if (headings.length === 0) return <></>

  return (
    <nav class="toc">
      <h2>目录</h2>
      <ul>
        {headings.map((h) => (
          <li style={`margin-left: ${(h.level - 2) * 1.5}rem`}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const CommentSection: FC<{ comments: Comment[]; postSlug: string }> = ({ comments, postSlug }) => {
  return (
    <section class="comments-section">
      <h2>评论 ({comments.length})</h2>

      {comments.length > 0 && (
        <div class="comments-list">
          {comments.map((c) => (
            <div class="comment" id={`comment-${c.id}`}>
              <div>
                <span class="comment-author">{c.authorName}</span>
                <span class="comment-date">{formatDate(c.createdAt)}</span>
              </div>
              <div class="comment-content">{c.content}</div>
            </div>
          ))}
        </div>
      )}

      <form class="comment-form" method="post" action={`/posts/${postSlug}/comments`}>
        <h3>发表评论</h3>
        <div>
          <label for="authorName">昵称 *</label>
          <input type="text" id="authorName" name="authorName" required maxlength={50} />
        </div>
        <div>
          <label for="authorEmail">邮箱（可选）</label>
          <input type="email" id="authorEmail" name="authorEmail" maxlength={100} />
        </div>
        <div>
          <label for="content">评论内容 *</label>
          <textarea id="content" name="content" required maxlength={1000}></textarea>
        </div>
        <button type="submit">提交评论</button>
      </form>
    </section>
  )
}

const PostNav: FC<{ prev: PostNav | null; next: PostNav | null }> = ({ prev, next }) => {
  if (!prev && !next) return <></>

  return (
    <nav class="pagination">
      <div>
        {prev && (
          <a href={`/posts/${prev.slug}`}>
            ← {prev.title}
          </a>
        )}
      </div>
      <div>
        {next && (
          <a href={`/posts/${next.slug}`}>
            {next.title} →
          </a>
        )}
      </div>
    </nav>
  )
}

const PostPage: FC<PostPageProps> = ({ post, content, headings, comments, prev, next }) => {
  return (
    <Layout
      title={post.title}
      description={post.excerpt || post.title}
      type="article"
    >
      <article>
        <h1>{post.title}</h1>
        <div class="article-meta">
          <time datetime={post.publishedAt ?? ''}>
            {formatDate(post.publishedAt)}
          </time>
          {post.tags.length > 0 && (
            <ul class="tag-list">
              {post.tags.map((t) => (
                <li>
                  <a class="tag" href={`/tags/${t.slug}`}>{t.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Toc headings={headings} />

        <div
          class="post-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>

      <PostNav prev={prev} next={next} />

      <CommentSection comments={comments} postSlug={post.slug} />
    </Layout>
  )
}

export default PostPage
