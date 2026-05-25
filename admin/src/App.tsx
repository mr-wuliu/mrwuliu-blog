import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import EditPost from './pages/EditPost'
import Comments from './pages/Comments'
import SiteConfig from './pages/SiteConfig'
import Projects from './pages/Projects'
import Collections from './pages/Collections'
import Analytics from './pages/Analytics'
import PostAnalytics from './pages/PostAnalytics'
import Layout from './components/Layout'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/analytics/:postId" element={<PostAnalytics />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/new" element={<EditPost />} />
        <Route path="/posts/:id/edit" element={<EditPost />} />
        <Route path="/comments" element={<Comments />} />
        <Route path="/site-config" element={<SiteConfig />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/collections" element={<Collections />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
