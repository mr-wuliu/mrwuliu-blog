import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

interface FriendLink {
  id: string
  name: string
  nameEn: string | null
  url: string
  avatar: string | null
  description: string
  descriptionEn: string | null
  sortOrder: number
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export default function FriendLinks() {
  const { t } = useTranslation()
  const [links, setLinks] = useState<FriendLink[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<FriendLink | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [url, setUrl] = useState('')
  const [avatar, setAvatar] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  const fetchLinks = async () => {
    try {
      const data = await api.get<FriendLink[]>('/friend-links')
      setLinks(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLinks()
  }, [])

  const resetForm = () => {
    setName('')
    setNameEn('')
    setUrl('')
    setAvatar('')
    setDescription('')
    setDescriptionEn('')
    setSortOrder(0)
    setStatus('draft')
    setEditing(null)
    setShowForm(false)
  }

  const handleEdit = (link: FriendLink) => {
    setEditing(link)
    setName(link.name)
    setNameEn(link.nameEn || '')
    setUrl(link.url)
    setAvatar(link.avatar || '')
    setDescription(link.description)
    setDescriptionEn(link.descriptionEn || '')
    setSortOrder(link.sortOrder)
    setStatus(link.status)
    setShowForm(true)
  }

  const handleSave = async () => {
    const body = {
      name,
      nameEn: nameEn || undefined,
      url,
      avatar: avatar || undefined,
      description,
      descriptionEn: descriptionEn || undefined,
      sortOrder,
      status,
    }
    try {
      if (editing) {
        await api.put(`/friend-links/${editing.id}`, body)
      } else {
        await api.post('/friend-links', body)
      }
      resetForm()
      fetchLinks()
    } catch {
      alert(t('common.saveFailed'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('friendLinks.confirmDelete'))) return
    try {
      await api.delete(`/friend-links/${id}`)
      fetchLinks()
    } catch {
      alert(t('common.deleteFailed'))
    }
  }

  return (
    <div className="overflow-y-auto h-full p-8">
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">{t('friendLinks.title')}</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          {t('friendLinks.newLink')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold uppercase tracking-widest mb-6 border-b-2 border-black pb-2">
              {editing ? t('friendLinks.editLink') : t('friendLinks.newLinkTitle')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('friendLinks.nameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('friendLinks.nameEnLabel')}</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('friendLinks.urlLabel')}</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('friendLinks.avatarLabel')}</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                  placeholder={t('friendLinks.avatarPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('friendLinks.descriptionLabel')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm h-24"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('friendLinks.descriptionEnLabel')}</label>
                <textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  className="w-full border-2 border-black px-3 py-2 text-sm h-24"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('friendLinks.sortOrderLabel')}</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1">{t('friendLinks.statusLabel')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                >
                  <option value="draft">{t('friendLinks.draft')}</option>
                  <option value="published">{t('friendLinks.published')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                {t('friendLinks.save')}
              </button>
              <button
                onClick={resetForm}
                className="flex-1 border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {t('friendLinks.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-sm opacity-50">{t('friendLinks.loading')}</div>
      ) : links.length === 0 ? (
        <div className="p-8 text-center text-gray-500 uppercase tracking-widest text-sm">{t('friendLinks.noLinks')}</div>
      ) : (
        <table className="w-full border-2 border-black">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('friendLinks.tableName')}</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('friendLinks.tableUrl')}</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('friendLinks.tableStatus')}</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-widest">{t('friendLinks.tableOrder')}</th>
              <th className="text-right px-4 py-2 text-xs uppercase tracking-widest">{t('friendLinks.tableActions')}</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="border-b border-black">
                <td className="px-4 py-3 text-sm">{link.name}</td>
                <td className="px-4 py-3 text-sm">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-black">{link.url}</a>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs uppercase tracking-widest px-2 py-0.5 border ${
                      link.status === 'published'
                        ? 'border-black'
                        : 'border-gray-400 text-gray-500'
                    }`}
                  >
                    {link.status === 'published' ? t('friendLinks.published') : t('friendLinks.draft')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{link.sortOrder}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(link)}
                    className="text-xs uppercase tracking-widest hover:underline mr-4 cursor-pointer"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
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
