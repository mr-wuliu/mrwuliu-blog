import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, langPath, formatDateLang } from '../i18n'

type Project = {
  id: string
  title: string
  description: string
  url: string | null
  coverImageKey: string | null
  techStack: string | null
  createdAt: string
  updatedAt: string
}

const ProjectDetailPage: FC<{ lang: Lang; project: Project; authorProfile?: AuthorProfile }> = ({ lang, project, authorProfile }) => {
  let techItems: string[] = []
  if (project.techStack) {
    try {
      techItems = JSON.parse(project.techStack)
    } catch {
      techItems = []
    }
  }

  return (
    <Layout title={`${project.title} - ${t(lang, 'projects.pageTitle')}`} authorProfile={authorProfile} lang={lang} currentPath={`/projects/${project.id}`}>
      <div class="flex flex-col lg:flex-row gap-8">
        <div class="lg:w-3/5">
          <h1 class="text-3xl md:text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-4 mb-6">
            {project.title}
          </h1>

          {project.description && (
            <p class="text-base leading-relaxed opacity-80 mb-8">{project.description}</p>
          )}

          {techItems.length > 0 && (
            <div class="mb-8">
              <h2 class="text-xs font-bold uppercase tracking-widest opacity-50 mb-3" data-t="projectDetail.techStack">{t(lang, 'projectDetail.techStack')}</h2>
              <div class="flex flex-wrap">
                {techItems.map((tech) => (
                  <span class="text-xs uppercase tracking-widest border border-black px-3 py-1 mr-2 mb-2">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div class="lg:w-2/5">
          {project.coverImageKey && (
            <img
              src={`/api/images/${project.coverImageKey}`}
              alt={project.title}
              class="w-full border-2 border-black mb-6"
            />
          )}

          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              class="block border-2 border-black px-4 py-3 text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors no-underline text-black text-center mb-6"
              data-t="projects.visit"
            >
              {t(lang, 'projects.visit')}
            </a>
          )}

          <div class="border-2 border-black p-6 space-y-4 mb-6">
            <div>
              <span class="text-xs font-bold uppercase tracking-widest opacity-50 block mb-1" data-t="projectDetail.created">{t(lang, 'projectDetail.created')}</span>
              <span class="text-sm">{formatDateLang(project.createdAt, lang)}</span>
            </div>
            <div class="border-t border-black pt-4">
              <span class="text-xs font-bold uppercase tracking-widest opacity-50 block mb-1" data-t="projectDetail.updated">{t(lang, 'projectDetail.updated')}</span>
              <span class="text-sm">{formatDateLang(project.updatedAt, lang)}</span>
            </div>
          </div>

          <a
            href={langPath('/projects', lang)}
            class="inline-block text-sm font-bold uppercase tracking-widest text-black opacity-70 hover:opacity-100 no-underline transition-all"
            data-t="projectDetail.backToProjects"
          >
            {t(lang, 'projectDetail.backToProjects')}
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default ProjectDetailPage
