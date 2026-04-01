import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'

const AboutPage: FC<{ content: string; authorProfile?: AuthorProfile }> = ({ content, authorProfile }) => {
  return (
    <Layout title="自述 - Blog" authorProfile={authorProfile}>
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-8">
          自述
        </h1>
        <div
          class="prose-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </Layout>
  )
}

export default AboutPage
