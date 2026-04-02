export default {
  nav: {
    writings: 'Writings',
    projects: 'Projects',
    tags: 'Tags',
    about: 'About',
  },
  home: {
    title: 'Latest Posts',
    noPosts: 'No posts yet',
    description: 'Personal Blog - Tech & Life',
    pageTitle: "mrwuliu's blog",
  },
  pagination: {
    prev: '← Previous',
    next: 'Next →',
    pageInfo: (p: number, t: number) => `Page ${p} of ${t}`,
  },
  writings: {
    title: 'Writings',
    noPosts: 'No posts yet',
    pageTitle: 'Writings - Blog',
  },
  projects: {
    title: 'Projects',
    noProjects: 'No projects yet',
    detail: 'DETAIL →',
    visit: 'VISIT →',
    pageTitle: 'Projects - Blog',
  },
  projectDetail: {
    techStack: 'Tech Stack',
    backToProjects: '← BACK TO PROJECTS',
    created: 'CREATED',
    updated: 'UPDATED',
  },
  tagsCloud: {
    title: 'Tags',
    noTags: 'No tags yet',
    pageTitle: 'Tags - Blog',
  },
  tag: {
    allTags: 'All Tags',
    pageTitle: (name: string) => `Tag: ${name}`,
    pageDescription: (name: string) => `Posts tagged "${name}"`,
    noPosts: 'No posts under this tag',
  },
  post: {
    toc: 'Table of Contents',
    comments: (count: number) => `Comments (${count})`,
    leaveComment: 'Leave a Comment',
    nameLabel: 'Name *',
    namePlaceholder: 'Name * (defaults to momo)',
    emailLabel: 'Email (optional)',
    contentLabel: 'Comment *',
    submit: 'Submit',
    commentSuccess: 'Comment submitted. It will appear after manual review.',
    commentError: 'Failed to submit comment. Please try again later.',
  },
  about: {
    title: 'About',
    pageTitle: 'About - Blog',
    noContent: 'No content',
  },
  notFound: {
    title: '404 — Page Not Found',
    message: 'Page not found',
    backHome: '← Back to Home',
  },
  footer: {
    copyright: (year: number) => `© ${year} Blog. Powered by Cloudflare Workers.`,
  },
}
