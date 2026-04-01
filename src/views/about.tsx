import type { FC } from 'hono/jsx'
import Layout from './layout'

const AboutPage: FC<{ content: string }> = ({ content }) => {
  return (
    <Layout title="自述 - Blog">
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
