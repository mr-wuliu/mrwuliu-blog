import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

interface Collection {
  id: string
  name: string
  nameEn: string | null
  slug: string
  description: string
  descriptionEn: string | null
  coverImageKey: string | null
  sortOrder: number
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
  postCount?: number
  posts?: PostInCollection[]
}

interface PostInCollection {
  id: string
  title: string
  sortOrder: number
}

interface Post {
  id: string
  title: string
}

export default function Collections() {
  const { t } = useTranslation()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Collection | null>(null)
  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  const [showPostManager, setShowPostManager] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [collectionPosts, setCollectionPosts] = useState<PostInCollection[]>([])
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [showPostSelector, setShowPostSelector] = useState(false)

  const fetchCollections = async () => {
    try {
      const data = await api.get<{ collections: Collection[] }>('/collections')
      setCollections(data.collections)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  const resetForm = () => {
    setName('')
    setNameEn('')
    setSlug('')
    setDescription('')
    setDescriptionEn('')
    setSortOrder(0)
    setStatus('draft')
    setEditing(null)
    setShowForm(false)
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleEdit = (collection: Collection) => {
    setEditing(collection)
    setName(collection.name)
    setNameEn(collection.nameEn || '')
    setSlug(collection.slug)
    setDescription(collection.description || '')
    setDescriptionEn(collection.descriptionEn || '')
    setSortOrder(collection.sortOrder)
    setStatus(collection.status)
    setShowForm(true)
  }

  const handleSave = async () => {
    const body = {
      name,
      nameEn: nameEn || undefined,
      slug: slug || generateSlug(name),
      description: description || undefined,
      descriptionEn: descriptionEn || undefined,
      sortOrder,
      status,
    }
    try {
      if (editing) {
        await api.put(`/collections/${editing.id}`, body)
      } else {
        await api.post('/collections', body)
      }
      resetForm()
      fetchCollections()
    } catch {
      alert(t('common.saveFailed'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('collections.confirmDelete'))) return
    try {
      await api.delete(`/collections/${id}`)
      fetchCollections()
    } catch {
      alert(t('common.deleteFailed'))
    }
  }

  const openPostManager = async (collection: Collection) => {
    setEditingCollection(collection)
    setShowPostManager(true)
    try {
      const [colData, postsData] = await Promise.all([
        api.get<{ collection: Collection & { posts: PostInCollection[] } }>(`/collections/${collection.id}`),
        api.get<{ posts: Post[] }>('/posts?limit=100'),
      ])
      setCollectionPosts(colData.collection.posts || [])
      setAllPosts(postsData.posts || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddPost = async (postId: string) => {
    if (!editingCollection) return
    const currentPostIds = collectionPosts.map((p) => p.id)
    const newPostIds = [...currentPostIds, postId]
    try {
      await api.put(`/collections/${editingCollection.id}`, { postIds: newPostIds })
      const colData = await api.get<{ collection: Collection & { posts: PostInCollection[] } }>(`/collections/${editingCollection.id}`)
      setCollectionPosts(colData.collection.posts || [])
      fetchCollections()
    } catch {
      alert(t('common.saveFailed'))
    }
  }

  const handleRemovePost = async (postId: string) => {
    if (!editingCollection) return
    const newPostIds = collectionPosts.map((p) => p.id).filter((id) => id !== postId)
    try {
      await api.put(`/collections/${editingCollection.id}`, { postIds: newPostIds })
      setCollectionPosts((prev) => prev.filter((p) => p.id !== postId))
      fetchCollections()
    } catch {
      alert(t('common.saveFailed'))
    }
  }

  const handleMovePost = async (postId: string, direction: 'up' | 'down') => {
    if (!editingCollection) return
    const posts = [...collectionPosts]
    const idx = posts.findIndex((p) => p.id === postId)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === posts.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[posts[idx], posts[swapIdx]] = [posts[swapIdx], posts[idx]]
    const newPostIds = posts.map((p) => p.id)
    try {
      await api.put(`/collections/${editingCollection.id}`, { postIds: newPostIds })
      setCollectionPosts(posts)
    } catch {
      alert(t('common.saveFailed'))
    }
  }

  const closePostManager = () => {
    setShowPostManager(false)
    setEditingCollection(null)
    setCollectionPosts([])
    setShowPostSelector(false)
  }

  const availablePosts = allPosts.filter(
    (p) => !collectionPosts.some((cp) => cp.id === p.id)
  )

  return (
    <div className="overflow-y-auto h-full p-8">
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">{t('collections.title')}</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          {t('collections.createBtn')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold uppercase tracking-widest mb-6 border-b-2 border-black pb-2">
              {editing ? t('collections.editCollection') : t('collections.newCollection')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('collections.name')} *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!editing && !slug) {
                      setSlug(generateSlug(e.target.value))
                    }
                  }}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('collections.nameEn')}</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('collections.slug')} *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('collections.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm h-24"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('collections.descriptionEn')}</label>
                <textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm h-24"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('collections.sortOrder')}</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('collections.status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                >
                  <option value="draft">{t('collections.draft')}</option>
                  <option value="published">{t('collections.published')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                {t('collections.saveBtn')}
              </button>
              <button
                onClick={resetForm}
                className="flex-1 border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {t('collections.cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostManager && editingCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold uppercase tracking-widest mb-6 border-b-2 border-black pb-2">
              {t('collections.managePosts')} — {editingCollection.name}
            </h2>

            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-widest mb-3">{t('collections.posts')}</h3>
              {collectionPosts.length === 0 ? (
                <div className="text-sm opacity-50 uppercase tracking-widest py-4 text-center border-2 border-black border-dashed">
                  {t('collections.noPosts')}
                </div>
              ) : (
                <div className="border-2 border-black divide-y divide-black">
                  {collectionPosts.map((post, idx) => (
                    <div key={post.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs opacity-40 font-mono">{idx + 1}.</span>
                        <span className="text-sm">{post.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMovePost(post.id, 'up')}
                          disabled={idx === 0}
                          className="text-xs uppercase tracking-widest border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMovePost(post.id, 'down')}
                          disabled={idx === collectionPosts.length - 1}
                          className="text-xs uppercase tracking-widest border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleRemovePost(post.id)}
                          className="text-xs uppercase tracking-widest text-red-600 hover:underline cursor-pointer ml-2"
                        >
                          {t('collections.removePost')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <button
                onClick={() => setShowPostSelector(!showPostSelector)}
                className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer w-full"
              >
                {t('collections.addPosts')}
              </button>

              {showPostSelector && (
                <div className="border-2 border-black mt-3 max-h-48 overflow-y-auto">
                  {availablePosts.length === 0 ? (
                    <div className="text-sm opacity-50 uppercase tracking-widest py-4 text-center">
                      {t('collections.noPosts')}
                    </div>
                  ) : (
                    availablePosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => handleAddPost(post.id)}
                        className="w-full text-left px-4 py-2.5 text-sm border-b border-black last:border-b-0 hover:bg-black hover:text-white transition-colors cursor-pointer"
                      >
                        + {post.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={closePostManager}
              className="w-full border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {t('collections.cancelBtn')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-sm opacity-50">{t('collections.loading')}</div>
      ) : collections.length === 0 ? (
        <div className="p-8 text-center text-gray-500 uppercase tracking-widest text-sm">{t('collections.noCollections')}</div>
      ) : (
        <table className="w-full border-2 border-black">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('collections.tableName')}</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('collections.tableSlug')}</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('collections.tableStatus')}</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('collections.tablePostCount')}</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('collections.tableSortOrder')}</th>
              <th className="text-right px-4 py-2 text-xs uppercase tracking-widest">{t('collections.tableActions')}</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id} className="border-b border-black">
                <td className="px-4 py-3 text-sm">{collection.name}</td>
                <td className="px-4 py-3 text-sm font-mono opacity-60">{collection.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs uppercase tracking-widest px-2 py-0.5 border ${
                      collection.status === 'published'
                        ? 'border-black'
                        : 'border-gray-400 text-gray-500'
                    }`}
                  >
                    {collection.status === 'published' ? t('collections.published') : t('collections.draft')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{collection.postCount ?? 0}</td>
                <td className="px-4 py-3 text-sm">{collection.sortOrder}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openPostManager(collection)}
                    className="text-xs uppercase tracking-widest hover:underline mr-4 cursor-pointer"
                  >
                    {t('collections.posts')}
                  </button>
                  <button
                    onClick={() => handleEdit(collection)}
                    className="text-xs uppercase tracking-widest hover:underline mr-4 cursor-pointer"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(collection.id)}
                    className="text-xs uppercase tracking-widest hover:underline text-red-600 cursor-pointer"
                  >
                    {t('common.delete')}
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
