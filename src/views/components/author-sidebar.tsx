import type { FC } from 'hono/jsx'

type AuthorProfile = {
  avatar: string
  bio: string
  github: string
  email: string
}

const AuthorSidebar: FC<{ profile: AuthorProfile }> = ({ profile }) => {
  const { avatar, bio, github, email } = profile

  if (!avatar && !bio && !github && !email) {
    return null
  }

  return (
    <div class="space-y-4">
      {avatar && (
        <img
          src={avatar}
          alt="Author avatar"
          class="w-20 h-20 rounded-full border border-black object-cover"
        />
      )}
      {bio && (
        <p class="text-sm leading-relaxed opacity-70">{bio}</p>
      )}
      <div class="flex flex-wrap gap-2">
        {github && (
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline"
          >
            GitHub
          </a>
        )}
        <a
          href="/feed.xml"
          class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline"
        >
          RSS
        </a>
        {email && (
          <a
            href={`mailto:${email}`}
            class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline"
          >
            Email
          </a>
        )}
      </div>
    </div>
  )
}

export default AuthorSidebar
export type { AuthorProfile }
