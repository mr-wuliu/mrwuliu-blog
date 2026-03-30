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
      <body>
        <header class="header">
          <nav class="nav">
            <a href="/" class="nav-brand">Blog</a>
            <a href="/feed.xml" class="nav-rss" aria-label="RSS Feed">RSS</a>
          </nav>
        </header>
        <main class="content">
          {children}
        </main>
        <footer class="footer">
          <p>&copy; {new Date().getFullYear()} Blog. Powered by Cloudflare Workers.</p>
        </footer>
      </body>
    </html>
  )
}

export default Layout
