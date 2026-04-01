import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import EditPost from './pages/EditPost'
import Comments from './pages/Comments'
import SiteConfig from './pages/SiteConfig'
import Projects from './pages/Projects'
import Layout from './components/Layout'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/new" element={<EditPost />} />
        <Route path="/posts/:id/edit" element={<EditPost />} />
        <Route path="/comments" element={<Comments />} />
        <Route path="/site-config" element={<SiteConfig />} />
        <Route path="/projects" element={<Projects />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
