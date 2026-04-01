import type { FC, PropsWithChildren } from 'hono/jsx'
import SEO from './components/seo'

type LayoutProps = PropsWithChildren<{
  title: string
  description?: string
  url?: string
  image?: string
  type?: 'website' | 'article'
}>

const Layout: FC<LayoutProps> = ({ title, description, url, image, type = 'website', children }) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/feed.xml" />
        {type === 'article' && (
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
            crossorigin="anonymous"
          />
        )}
        <SEO title={title} description={description} url={url} image={image} type={type} />
      </head>
      <body class="font-sans text-base leading-relaxed text-black bg-white antialiased min-h-screen flex flex-col">
        <header class="border-b border-black bg-white">
          <nav class="max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-6 flex justify-between items-center">
            <a href="/" class="text-xl font-bold tracking-tight text-black hover:opacity-70 transition-all no-underline">mrwuliu</a>
            <div class="flex gap-6 text-base uppercase tracking-widest ml-auto mr-8">
              <a href="/writings" class="hover:underline no-underline text-black">文字</a>
              <a href="/projects" class="hover:underline no-underline text-black">工程</a>
              <a href="/tags-cloud" class="hover:underline no-underline text-black">标签</a>
              <a href="/about" class="hover:underline no-underline text-black">自述</a>
            </div>
            <a href="/feed.xml" class="text-xs font-bold uppercase tracking-widest border border-black border-opacity-50 px-3 py-1.5 text-black hover:bg-black hover:text-white transition-all no-underline" aria-label="RSS Feed">RSS</a>
          </nav>
        </header>
        <main class="max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-12 flex-1 w-full">
          {children}
        </main>
        <footer class="border-t border-black bg-white mt-auto">
          <p class="max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-8 text-xs font-bold uppercase tracking-widest opacity-50 text-center">&copy; {new Date().getFullYear()} Blog. Powered by Cloudflare Workers.</p>
        </footer>
      </body>
    </html>
  )
}

export default Layout
