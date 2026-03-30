import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import EditPost from './pages/EditPost'
import Comments from './pages/Comments'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/posts" element={<Posts />} />
      <Route path="/posts/new" element={<EditPost />} />
      <Route path="/posts/:id/edit" element={<EditPost />} />
      <Route path="/comments" element={<Comments />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
