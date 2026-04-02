import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, langPath } from '../i18n'

type Project = {
  id: string
  title: string
  description: string
  url: string | null
  coverImageKey: string | null
  techStack: string | null
}

const ProjectCard: FC<{ project: Project; lang: Lang }> = ({ project, lang }) => {
  let techItems: string[] = []
  if (project.techStack) {
    try {
      techItems = JSON.parse(project.techStack)
    } catch {
      techItems = []
    }
  }

  return (
    <div class="break-inside-avoid mb-6 border-2 border-black hover:-translate-y-1 transition-all">
      {project.coverImageKey && (
        <img
          src={`/api/images/${project.coverImageKey}`}
          alt={project.title}
          class="w-full border-b-2 border-black"
        />
      )}
      <h3 class="font-bold text-lg uppercase tracking-wide p-4">
        {project.title}
      </h3>
      {project.description && (
        <p class="text-sm text-gray-700 px-4 pb-4">{project.description}</p>
      )}
      {techItems.length > 0 && (
        <div class="flex flex-wrap px-4 pb-4">
          {techItems.map((tech) => (
            <span class="text-xs uppercase tracking-widest border border-black px-2 py-0.5 mr-1 mb-1">
              {tech}
            </span>
          ))}
        </div>
      )}
      <div class="flex border-t-2 border-black">
        <a
          href={langPath(`/projects/${project.id}`, lang)}
          class="flex-1 px-4 py-3 text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors no-underline text-black text-center border-r-2 border-black"
          data-t="projects.detail"
        >
          {t(lang, 'projects.detail')}
        </a>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            class="flex-1 px-4 py-3 text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors no-underline text-black text-center"
            data-t="projects.visit"
          >
            {t(lang, 'projects.visit')}
          </a>
        )}
      </div>
    </div>
  )
}

const ProjectsPage: FC<{ lang: Lang; projects: Project[]; authorProfile?: AuthorProfile }> = ({ lang, projects, authorProfile }) => {
  return (
    <Layout title={t(lang, 'projects.pageTitle')} authorProfile={authorProfile} lang={lang} currentPath="/projects">
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-8" data-t="projects.title">
          {t(lang, 'projects.title')}
        </h1>
        {projects.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="projects.noProjects">{t(lang, 'projects.noProjects')}</p>
          </div>
        ) : (
          <div class="sm:columns-2 lg:columns-3 gap-6" style="columns: 1">
            {projects.map((project) => (
              <ProjectCard project={project} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ProjectsPage
