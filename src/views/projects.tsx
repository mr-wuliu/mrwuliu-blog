import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'

type Project = {
  id: string
  title: string
  description: string
  url: string | null
  coverImageKey: string | null
  techStack: string | null
}

const ProjectCard: FC<{ project: Project }> = ({ project }) => {
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
          href={`/projects/${project.id}`}
          class="flex-1 px-4 py-3 text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors no-underline text-black text-center border-r-2 border-black"
        >
          DETAIL →
        </a>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            class="flex-1 px-4 py-3 text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors no-underline text-black text-center"
          >
            VISIT →
          </a>
        )}
      </div>
    </div>
  )
}

const ProjectsPage: FC<{ projects: Project[]; authorProfile?: AuthorProfile }> = ({ projects, authorProfile }) => {
  return (
    <Layout title="工程 - Blog" authorProfile={authorProfile}>
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-8">
          工程
        </h1>
        {projects.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p>暂无项目</p>
          </div>
        ) : (
          <div class="sm:columns-2 lg:columns-3 gap-6" style="columns: 1">
            {projects.map((project) => (
              <ProjectCard project={project} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ProjectsPage
