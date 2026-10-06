import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Posts = lazy(() => import('./pages/Posts'))
const EditPost = lazy(() => import('./pages/EditPost'))
const Comments = lazy(() => import('./pages/Comments'))
const SiteConfig = lazy(() => import('./pages/SiteConfig'))
const Projects = lazy(() => import('./pages/Projects'))
const Collections = lazy(() => import('./pages/Collections'))
const FriendLinks = lazy(() => import('./pages/FriendLinks'))
const Analytics = lazy(() => import('./pages/Analytics'))
const PostAnalytics = lazy(() => import('./pages/PostAnalytics'))
const Users = lazy(() => import('./pages/Users'))
import Layout from './components/Layout'

function App() {
  return (
    <Suspense fallback={<div role="status" className="p-8 text-sm opacity-50">Loading…</div>}>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/analytics/:postId" element={<PostAnalytics />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/new" element={<EditPost />} />
        <Route path="/posts/:id/edit" element={<EditPost />} />
        <Route path="/comments" element={<Comments />} />
        <Route path="/users" element={<Users />} />
        <Route path="/site-config" element={<SiteConfig />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/friend-links" element={<FriendLinks />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default App
