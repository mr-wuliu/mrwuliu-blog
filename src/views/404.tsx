import type { FC } from 'hono/jsx'
import Layout from './layout'

const NotFoundPage: FC = () => {
  return (
    <Layout title="404 — 页面未找到">
      <div class="flex flex-col items-center justify-center py-24">
        <h1 class="text-7xl font-bold text-black">404</h1>
        <p class="mt-4 text-lg opacity-70">页面未找到</p>
        <a href="/" class="mt-6 text-xs font-bold uppercase tracking-widest border border-black px-6 py-3 hover:bg-black hover:text-white transition-all no-underline">← 返回首页</a>
      </div>
    </Layout>
  )
}

export default NotFoundPage
