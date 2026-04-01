import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface Project {
  id: string
  title: string
  description: string
  url: string | null
  coverImageKey: string | null
  techStack: string | null
  sortOrder: number
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Project | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [techStack, setTechStack] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  const fetchProjects = async () => {
    try {
      const data = await api.get<Project[]>('/projects')
      setProjects(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setUrl('')
    setTechStack('')
    setSortOrder(0)
    setStatus('draft')
    setEditing(null)
    setShowForm(false)
  }

  const handleEdit = (project: Project) => {
    setEditing(project)
    setTitle(project.title)
    setDescription(project.description)
    setUrl(project.url || '')
    setTechStack(project.techStack || '')
    setSortOrder(project.sortOrder)
    setStatus(project.status)
    setShowForm(true)
  }

  const handleSave = async () => {
    const body = {
      title,
      description,
      url: url || undefined,
      techStack: techStack || undefined,
      sortOrder,
      status,
    }
    try {
      if (editing) {
        await api.put(`/projects/${editing.id}`, body)
      } else {
        await api.post('/projects', body)
      }
      resetForm()
      fetchProjects()
    } catch {
      alert('保存失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此项目？')) return
    try {
      await api.delete(`/projects/${id}`)
      fetchProjects()
    } catch {
      alert('删除失败')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">PROJECTS</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          + NEW
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold uppercase tracking-widest mb-6 border-b-2 border-black pb-2">
              {editing ? 'EDIT PROJECT' : 'NEW PROJECT'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm h-24"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                  placeholder="React, TypeScript, ..."
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                SAVE
              </button>
              <button
                onClick={resetForm}
                className="flex-1 border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-sm opacity-50">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="p-8 text-center text-gray-500 uppercase tracking-widest text-sm">No projects yet</div>
      ) : (
        <table className="w-full border-2 border-black">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">Title</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">Status</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">Order</th>
              <th className="text-right px-4 py-2 text-xs uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-black">
                <td className="px-4 py-3 text-sm">{project.title}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs uppercase tracking-widest px-2 py-0.5 border ${
                      project.status === 'published'
                        ? 'border-black'
                        : 'border-gray-400 text-gray-500'
                    }`}
                  >
                    {project.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{project.sortOrder}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(project)}
                    className="text-xs uppercase tracking-widest hover:underline mr-4 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-xs uppercase tracking-widest hover:underline text-red-600 cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
