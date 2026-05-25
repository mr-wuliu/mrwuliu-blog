import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { api } from '../lib/api'

type PostReport = {
  post: {
    id: string
    title: string
    titleEn: string
    slug: string
    publishedAt: string
    wordCount: number
    totalViews: number
    totalUniqueViews: number
  }
  trends: { date: string; views: number; uniqueVisitors: number }[]
  referrers: { host: string; count: number }[]
  geo: { country: string; count: number }[]
  botStats: { human: number; bot: number }
  langStats: { lang: string; count: number }[]
  scroll: { avgReadPercent: number; completionRate: number; hasData: number }
  days: number
}

type DateRange = 7 | 14 | 30 | 90

const DATE_RANGES: DateRange[] = [7, 14, 30, 90]

function formatChartDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function PostAnalytics() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [data, setData] = useState<PostReport | null>(null)
  const [days, setDays] = useState<DateRange>(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    api
      .get<PostReport>(`/analytics/post/${postId}/report?days=${days}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [postId, days])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="overflow-y-auto h-full p-8">
        <Link
          to="/analytics"
          className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
        >
          {t('analytics.backToOverview')}
        </Link>
        <p className="mt-10 text-sm opacity-50 text-center">{t('analytics.noData')}</p>
      </div>
    )
  }

  const { post, trends, referrers, geo, botStats, langStats, scroll } = data
  const totalBotHuman = botStats.human + botStats.bot
  const humanPct = totalBotHuman > 0 ? Math.round((botStats.human / totalBotHuman) * 100) : 0
  const botPct = totalBotHuman > 0 ? Math.round((botStats.bot / totalBotHuman) * 100) : 0

  const statCards = [
    { label: t('analytics.totalViews'), value: (post.totalViews ?? 0).toLocaleString(), accent: 'bg-black' },
    { label: t('analytics.uniqueVisitors'), value: (post.totalUniqueViews ?? 0).toLocaleString(), accent: 'bg-neutral-500' },
    { label: t('analytics.wordCount'), value: (post.wordCount ?? 0).toLocaleString(), accent: 'bg-neutral-400' },
    { label: t('analytics.avgRead'), value: `${scroll.avgReadPercent ?? 0}%`, accent: 'bg-neutral-300' },
  ]

  return (
    <div className="overflow-y-auto h-full p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/analytics')}
            className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            {t('analytics.backToOverview')}
          </button>
          <h2 className="text-xl font-bold tracking-tight text-black">{post.title}</h2>
          {post.publishedAt && (
            <p className="text-[11px] uppercase tracking-widest opacity-40">
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white border border-black p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 ${card.accent}`} />
              <span className="text-xs font-bold uppercase tracking-widest opacity-50">
                {card.label}
              </span>
            </div>
            <p className="text-3xl font-bold text-black">{card.value}</p>
          </div>
        ))}
      </div>

      {/* View Trend Chart */}
      <div className="bg-white border border-black p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-6">
          {t('analytics.viewTrend')}
        </h3>
        {trends.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-10">{t('analytics.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fontSize: 11, fontWeight: 'bold' }}
                stroke="#000"
                tickLine={{ stroke: '#000' }}
                axisLine={{ stroke: '#000' }}
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 'bold' }}
                stroke="#000"
                tickLine={{ stroke: '#000' }}
                axisLine={{ stroke: '#000' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  border: '1px solid #000',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
                labelFormatter={(label) => formatChartDate(String(label))}
              />
              <Bar
                dataKey="views"
                name={t('analytics.views')}
                fill="#000"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Source + Language */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <div className="bg-white border border-black flex flex-col">
          <div className="px-6 py-4 border-b border-black">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">
              {t('analytics.sourceBreakdown')}
            </h3>
          </div>
          {referrers.length === 0 ? (
            <p className="px-6 py-10 text-sm opacity-50 text-center">{t('analytics.noData')}</p>
          ) : (
            <>
              <div className="px-6 py-2 border-b border-black grid grid-cols-[minmax(0,1fr)_80px] items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{t('analytics.source')}</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50 text-right">{t('analytics.count')}</span>
              </div>
              <ul className="divide-y divide-black">
                {referrers.map((ref) => (
                  <li
                    key={ref.host}
                    className="px-6 py-3 grid grid-cols-[minmax(0,1fr)_80px] items-center gap-2"
                  >
                    <span className="text-sm font-medium truncate">
                      {ref.host === 'direct' ? t('analytics.direct') : ref.host}
                    </span>
                    <span className="text-sm font-bold text-right">{(ref.count ?? 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Language Split */}
        <div className="bg-white border border-black flex flex-col">
          <div className="px-6 py-4 border-b border-black">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">
              {t('analytics.languageSplit')}
            </h3>
          </div>
          {langStats.length === 0 ? (
            <p className="px-6 py-10 text-sm opacity-50 text-center">{t('analytics.noData')}</p>
          ) : (
            <div className="p-6 space-y-4">
              {langStats.map((item) => {
                const maxCount = Math.max(...langStats.map((l) => l.count), 1)
                const widthPct = (item.count / maxCount) * 100
                return (
                  <div key={item.lang}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                        {item.lang === 'zh' ? '中文' : item.lang === 'en' ? 'EN' : item.lang.toUpperCase()}
                      </span>
                      <span className="text-sm font-bold">{(item.count ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-3 bg-neutral-100 border border-black">
                      <div
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Geo + Bot vs Human */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Distribution */}
        <div className="bg-white border border-black flex flex-col">
          <div className="px-6 py-4 border-b border-black">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">
              {t('analytics.geoDistribution')}
            </h3>
          </div>
          {geo.length === 0 ? (
            <p className="px-6 py-10 text-sm opacity-50 text-center">{t('analytics.noData')}</p>
          ) : (
            <>
              <div className="px-6 py-2 border-b border-black grid grid-cols-[minmax(0,1fr)_80px] items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{t('analytics.country')}</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50 text-right">{t('analytics.count')}</span>
              </div>
              <ul className="divide-y divide-black">
                {geo.map((g) => (
                  <li
                    key={g.country}
                    className="px-6 py-3 grid grid-cols-[minmax(0,1fr)_80px] items-center gap-2"
                  >
                    <span className="text-sm font-bold">{g.country}</span>
                    <span className="text-sm font-bold text-right">{(g.count ?? 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Bot vs Human */}
        <div className="bg-white border border-black flex flex-col">
          <div className="px-6 py-4 border-b border-black">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">
              {t('analytics.botVsHuman')}
            </h3>
          </div>
          {totalBotHuman === 0 ? (
            <p className="px-6 py-10 text-sm opacity-50 text-center">{t('analytics.noData')}</p>
          ) : (
            <div className="p-6 space-y-6">
              {/* Stacked bar */}
              <div className="flex w-full h-10 border border-black overflow-hidden">
                <div
                  className="bg-black flex items-center justify-center transition-all duration-300"
                  style={{ width: `${humanPct}%` }}
                >
                  {humanPct > 12 && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      {humanPct}%
                    </span>
                  )}
                </div>
                <div
                  className="bg-neutral-300 flex items-center justify-center transition-all duration-300"
                  style={{ width: `${botPct}%` }}
                >
                  {botPct > 12 && (
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {botPct}%
                    </span>
                  )}
                </div>
              </div>
              {/* Legend + counts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-black" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                      {t('analytics.human')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{(botStats.human ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-neutral-300" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                      {t('analytics.bot')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{(botStats.bot ?? 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll Depth */}
      <div className="bg-white border border-black p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-6">
          Scroll Depth
        </h3>
        {scroll.hasData === 0 ? (
          <p className="text-sm opacity-50 text-center py-6">{t('analytics.scrollNote')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2">
                {t('analytics.avgRead')}
              </span>
              <p className="text-3xl font-bold">{scroll.avgReadPercent}%</p>
              <div className="mt-2 w-full h-2 bg-neutral-100 border border-black">
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${scroll.avgReadPercent}%` }}
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2">
                {t('analytics.completionRate')}
              </span>
              <p className="text-3xl font-bold">{scroll.completionRate}%</p>
              <div className="mt-2 w-full h-2 bg-neutral-100 border border-black">
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${scroll.completionRate}%` }}
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2">
                {t('analytics.uniqueVisitors')}
              </span>
              <p className="text-3xl font-bold">{(scroll.hasData ?? 0).toLocaleString()}</p>
              <p className="text-xs opacity-40 mt-1">tracked readers</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
