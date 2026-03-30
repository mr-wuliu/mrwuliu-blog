import type { FC } from 'hono/jsx'
import Layout from './layout'

const NotFoundPage: FC = () => {
  return (
    <Layout title="404 — 页面未找到">
      <div class="not-found">
        <h1 style="font-size: 3rem; color: #d1d5db;">404</h1>
        <p style="margin-top: 1rem; color: #6b7280;">页面未找到</p>
        <p style="margin-top: 0.5rem;">
          <a href="/">← 返回首页</a>
        </p>
      </div>
    </Layout>
  )
}

export default NotFoundPage
