import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { ItemListSchema, BreadcrumbSchema } from './components/structured-data'
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
    <div class="portfolio-card project-card">
      {project.coverImageKey && (
        <img
          src={`/images/${project.coverImageKey}`}
          alt={project.title}
          class="portfolio-cover" loading="lazy" decoding="async"
        />
      )}
      <h2 class="portfolio-title">
        {project.title}
      </h2>
      {project.description && (
        <p class="portfolio-description">{project.description}</p>
      )}
      {techItems.length > 0 && (
        <div class="portfolio-tech">
          {techItems.map((tech) => (
            <span class="text-xs uppercase tracking-widest border border-black px-2 py-0.5 mr-1 mb-1">
              {tech}
            </span>
          ))}
        </div>
      )}
      <div class="portfolio-actions">
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
    <Layout
      title={t(lang, 'projects.pageTitle')}
      description={t(lang, 'projects.description')}
      url={langPath('/projects', lang)}
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/projects"
      extraHead={
        <>
          <BreadcrumbSchema items={[
            { name: t(lang, 'nav.projects'), url: langPath('/projects', lang) },
          ]} />
          <ItemListSchema data={{
            name: t(lang, 'projects.title'),
            description: t(lang, 'projects.description'),
            url: langPath('/projects', lang),
            numberOfItems: projects.length,
          }} />
        </>
      }
    >
      <section class="projects-page">
        <h1 class="page-title" data-t="projects.title">
          {t(lang, 'projects.title')}
        </h1>
        <p class="page-description" data-t="projects.description">{t(lang, 'projects.description')}</p>
        {projects.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="projects.noProjects">{t(lang, 'projects.noProjects')}</p>
          </div>
        ) : (
          <div class="collection-grid">
            {projects.map((project) => (
              <ProjectCard project={project} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}

export default ProjectsPage
