import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { api } from '../lib/api'

// ── Types ──────────────────────────────────────────────

type TrendItem = {
  date: string
  views: number
  uniqueVisitors: number
}

type TrendsResponse = { trends: TrendItem[] }

type PostMetric = {
  id: string
  title: string
  slug: string
  publishedAt: string | null
  wordCount: number
  totalViews: number
  totalUniqueViews: number
  zhViews: number
  enViews: number
  periodViews: number
  mom: number
  avgReadPercent: number
  completionRate: number
}

type PostsTableResponse = {
  days: number
  posts: PostMetric[]
}

type DateRange = 7 | 14 | 30 | 90

type SortKey = 'totalViews' | 'zhViews' | 'enViews' | 'mom' | 'avgReadPercent' | 'completionRate' | 'wordCount'

type SortDir = 'asc' | 'desc'

const DATE_RANGES: DateRange[] = [7, 14, 30, 90]

// ── Helpers ────────────────────────────────────────────

function formatChartDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatNumber(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString()
}

function momDisplay(value: number): { text: string; color: string } {
  if (value === 0) return { text: '0%', color: 'text-black/30' }
  const sign = value > 0 ? '+' : ''
  return {
    text: `${sign}${value.toFixed(1)}%`,
    color: value > 0 ? 'text-green-600' : 'text-red-600',
  }
}

// ── Component ──────────────────────────────────────────

export default function Analytics() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [days, setDays] = useState<DateRange>(30)
  const [loading, setLoading] = useState(true)

  // Data
  const [trendData, setTrendData] = useState<TrendItem[]>([])
  const [posts, setPosts] = useState<PostMetric[]>([])

  // Table state
  const [sortKey, setSortKey] = useState<SortKey>('totalViews')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Data fetching ──────────────────────────────────

  useEffect(() => {
    setLoading(true)
    const trendsPromise = api
      .get<TrendsResponse>(`/analytics/trends?days=${days}`)
      .then((data) => setTrendData(data.trends ?? []))
      .catch(() => setTrendData([]))

    const postsPromise = api
      .get<PostsTableResponse>(`/analytics/posts-table?days=${days}`)
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))

    Promise.all([trendsPromise, postsPromise]).finally(() => setLoading(false))
  }, [days])

  // ── Sort & filter ──────────────────────────────────

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
      } else {
        setSortDir('desc')
      }
      return key
    })
  }, [])

  const sortedPosts = useMemo(() => {
    let filtered = posts
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = posts.filter((p) => p.title.toLowerCase().includes(q))
    }
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })
  }, [posts, searchQuery, sortKey, sortDir])

  // ── Chart aggregates ───────────────────────────────

  const totalViewsInRange = useMemo(
    () => trendData.reduce((s, d) => s + d.views, 0),
    [trendData],
  )

  const totalUVInRange = useMemo(
    () => trendData.reduce((s, d) => s + d.uniqueVisitors, 0),
    [trendData],
  )

  // ── Loading ────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Column definitions ─────────────────────────────

  type ColDef = {
    key: SortKey
    label: string
    width: string
    align: 'left' | 'right'
  }

  const columns: ColDef[] = [
    { key: 'totalViews', label: t('analytics.totalViews'), width: 'w-24', align: 'right' },
    { key: 'zhViews', label: t('analytics.zhPV'), width: 'w-20', align: 'right' },
    { key: 'enViews', label: t('analytics.enPV'), width: 'w-20', align: 'right' },
    { key: 'mom', label: t('analytics.mom'), width: 'w-20', align: 'right' },
    { key: 'avgReadPercent', label: t('analytics.avgRead'), width: 'w-20', align: 'right' },
    { key: 'completionRate', label: t('analytics.completion'), width: 'w-20', align: 'right' },
    { key: 'wordCount', label: t('analytics.words'), width: 'w-16', align: 'right' },
  ]

  const SortArrow = ({ col }: { col: SortKey }) => (
    <span className="inline-block ml-0.5 text-[8px] leading-none opacity-40">
      {sortKey === col ? (sortDir === 'desc' ? '▼' : '▲') : '▼'}
    </span>
  )

  return (
    <div className="overflow-y-auto h-full p-8 space-y-8">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-black">{t('analytics.title')}</h2>
        <div className="flex gap-2">
          {DATE_RANGES.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                days === d
                  ? 'bg-black text-white'
                  : 'border border-black hover:bg-black hover:text-white'
              }`}
            >
              {t(`analytics.days${d}` as const)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary strip ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-black p-5">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-2">
            {t('analytics.viewTrend')}
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-black">
              {formatNumber(totalViewsInRange)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
              {t('analytics.pageViews')}
            </span>
          </div>
        </div>
        <div className="bg-white border border-black p-5">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-2">
            {t('analytics.uniqueVisitors')}
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-black">
              {formatNumber(totalUVInRange)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
              {t('analytics.uniqueVisitors')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Trend chart ────────────────────────────── */}
      <div className="bg-white border border-black p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-6">
          {t('analytics.viewTrend')}
        </h3>
        {trendData.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-10">{t('analytics.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fontSize: 10, fontWeight: 'bold' }}
                stroke="#000"
                tickLine={{ stroke: '#000' }}
                axisLine={{ stroke: '#000' }}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 10, fontWeight: 'bold' }}
                stroke="#000"
                tickLine={{ stroke: '#000' }}
                axisLine={{ stroke: '#000' }}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  border: '1px solid #000',
                  background: '#fff',
                  fontSize: 11,
                  fontWeight: 'bold',
                  padding: '8px 12px',
                }}
                labelFormatter={(label) => formatChartDate(String(label))}
                formatter={(value) => [formatNumber(Number(value ?? 0)), t('analytics.pageViews')]}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#000"
                strokeWidth={2}
                fill="url(#viewGrad)"
                dot={false}
                activeDot={{ r: 4, stroke: '#000', strokeWidth: 2, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Posts table ────────────────────────────── */}
      <div className="bg-white border border-black flex flex-col">
        {/* Table header bar */}
        <div className="px-6 py-4 border-b border-black flex items-center justify-between gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 whitespace-nowrap">
            {t('analytics.topPosts')}
          </h3>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('analytics.searchPost')}
            className="w-full max-w-[220px] px-3 py-1.5 text-xs border border-black outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        {sortedPosts.length === 0 ? (
          <p className="px-6 py-10 text-sm opacity-50 text-center">{t('analytics.noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black">
                  {/* Title column — not sortable, just label */}
                  <th className="px-6 py-3 text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      {t('analytics.postTitle')}
                    </span>
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-3 text-right cursor-pointer select-none hover:opacity-80 transition-opacity ${col.width}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50 inline-flex items-center gap-0.5">
                        {col.label}
                        <SortArrow col={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPosts.map((post, idx) => {
                  const mom = momDisplay(post.mom)
                  return (
                    <tr
                      key={post.id}
                      className={`border-b border-black/10 transition-colors hover:bg-neutral-50 ${
                        idx % 2 === 1 ? 'bg-neutral-50/50' : ''
                      }`}
                    >
                      {/* Title */}
                      <td className="px-6 py-3 min-w-0 max-w-xs">
                        <button
                          onClick={() => navigate(`/analytics/${post.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block min-w-0 text-left transition-colors"
                        >
                          {post.title}
                        </button>
                      </td>
                      {/* Total Views */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-bold tabular-nums">
                          {formatNumber(post.totalViews)}
                        </span>
                      </td>
                      {/* ZH Views */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm tabular-nums opacity-70">
                          {formatNumber(post.zhViews)}
                        </span>
                      </td>
                      {/* EN Views */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm tabular-nums opacity-70">
                          {formatNumber(post.enViews)}
                        </span>
                      </td>
                      {/* MoM */}
                      <td className="px-3 py-3 text-right">
                        <span className={`text-sm font-bold tabular-nums ${mom.color}`}>
                          {mom.text}
                        </span>
                      </td>
                      {/* Avg Read */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm tabular-nums">
                          {post.avgReadPercent.toFixed(1)}%
                        </span>
                      </td>
                      {/* Completion */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm tabular-nums">
                          {post.completionRate}%
                        </span>
                      </td>
                      {/* Words */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm tabular-nums opacity-50">
                          {formatNumber(post.wordCount)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {sortedPosts.length > 0 && (
          <div className="px-6 py-3 border-t border-black flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">
              {sortedPosts.length} {t('analytics.topPosts').toLowerCase()}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">
              {t(`analytics.days${days}` as const)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
