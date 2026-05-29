import type { FC } from 'hono/jsx'

type AuthorProfile = {
  avatar: string
  bio: string
  github: string
  email: string
  wechat: string
  xiaohongshu: string
}

const AuthorSidebar: FC<{ profile: AuthorProfile }> = ({ profile }) => {
  const { avatar, bio, github, email, wechat, xiaohongshu } = profile

  if (!avatar && !bio && !github && !email && !wechat && !xiaohongshu) {
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
        <p class="text-sm leading-relaxed opacity-70 text-black" style="font-family: 'Georgia', 'Noto Serif SC', serif">{bio}</p>
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
      </div>
      {email && (
        <a
          href={`mailto:${email}`}
          class="block text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors no-underline"
        >
          {email}
        </a>
      )}
      <div class="space-y-1">
        {wechat && (
          <span class="flex items-center gap-1.5">
            <img src="/wechat.png" alt="公众号" class="w-4 h-4" />
            <span class="text-sm text-black" style="font-family: 'Georgia', 'Noto Serif SC', serif">{wechat}</span>
          </span>
        )}
        {xiaohongshu && (
          <span class="flex items-center gap-1.5">
            <img src="https://images.seeklogo.com/logo-png/55/2/xiaohongshu-logo-png_seeklogo-557258.png" alt="小红书" class="w-4 h-4" />
            <span class="text-sm text-black" style="font-family: 'Georgia', 'Noto Serif SC', serif">{xiaohongshu}</span>
          </span>
        )}
      </div>
    </div>
  )
}

export default AuthorSidebar
export type { AuthorProfile }
