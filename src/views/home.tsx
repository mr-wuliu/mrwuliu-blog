import type { FC } from 'hono/jsx'
import Layout from './layout'
import AuthorSidebar, { type AuthorProfile } from './components/author-sidebar'
import { OrganizationSchema, WebSiteSchema } from './components/structured-data'
import { type Lang, t, tf, langPath, formatDateLang } from '../i18n'

type Tag = {
  id: string
  name: string
  slug: string
}

type Post = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  coverImageKey: string | null
  status: 'draft' | 'published'
  hidden: boolean
  pinned: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
  commentCount?: number
  likeCount?: number
}

type SeriesRef = {
  id: string
  name: string
  nameEn: string | null
  slug: string
}

export type HomeRenderGroup =
  | { kind: 'post'; post: Post }
  | { kind: 'series'; collection: SeriesRef; posts: Post[] }

type PaginationData = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type HomeProps = {
  lang: Lang
  groups: HomeRenderGroup[]
  pagination: PaginationData
  authorProfile?: AuthorProfile
}

const PostCard: FC<{ post: Post; lang: Lang }> = ({ post, lang }) => {
  return (
    <article class={`journal-card${post.coverImageKey ? ' journal-card-image' : ' journal-card-text'}`}>
      {post.coverImageKey && (
        <a href={langPath(`/posts/${post.slug}`, lang)} class="journal-cover" tabindex={-1} aria-hidden="true">
          <img src={`/images/${post.coverImageKey}`} alt="" loading="eager" decoding="async" />
        </a>
      )}
      <div class="journal-card-body">
      <a href={langPath(`/posts/${post.slug}`, lang)} class="no-underline text-black block">
        <h2 class="journal-title">
          {post.pinned && <span class="text-red-500 mr-1">📌</span>}
          {post.title}
        </h2>
        {post.publishedAt && (
          <time class="text-xs font-bold uppercase tracking-widest opacity-50" datetime={post.publishedAt}>
            {formatDateLang(post.publishedAt, lang)}
          </time>
        )}
        {post.excerpt && <p class="journal-excerpt">{post.excerpt}</p>}
      </a>
      <div class="journal-card-footer">
        <div class="flex flex-wrap gap-2">
          {post.tags && post.tags.map((tag) => (
            <a href={langPath(`/tags/${tag.slug}`, lang)} class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline">{tag.name}</a>
          ))}
        </div>
        <div class="flex items-center gap-4 shrink-0">
          <a href={langPath(`/posts/${post.slug}`, lang)} aria-label={t(lang, 'home.comments')} class="flex items-center gap-1 text-xs font-bold uppercase tracking-widest opacity-50 no-underline text-black hover:opacity-100 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            <span>{post.commentCount ?? 0}</span>
          </a>
          <button
            type="button"
            aria-label={t(lang, 'home.like')}
            class="like-btn flex items-center gap-1 text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all"
            data-post-id={post.id}
            data-like-count={post.likeCount ?? 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            <span class="like-count">{post.likeCount ?? 0}</span>
          </button>
        </div>
      </div>
      </div>
    </article>
  )
}

const SeriesStack: FC<{ collection: SeriesRef; posts: Post[]; lang: Lang }> = ({ collection, posts, lang }) => {
  const displayName = lang === 'en' && collection.nameEn ? collection.nameEn : collection.name
  const coverPost = posts.find(post => post.coverImageKey)

  return (
    <article class={`journal-card journal-series${coverPost ? ' journal-card-image' : ''}`}>
      {coverPost && <a href={langPath(`/posts/${coverPost.slug}`, lang)} class="journal-cover" tabindex={-1} aria-hidden="true">
        <img src={`/images/${coverPost.coverImageKey}`} alt="" loading="eager" decoding="async" />
      </a>}
      <div class="journal-card-body">
      <div class="flex items-center gap-3 min-w-0 flex-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
        <a href={langPath(`/series/${collection.slug}`, lang)} class="text-lg sm:text-xl font-bold tracking-tight text-black no-underline hover:opacity-70 transition-all break-words">{displayName}</a>
        <span class="shrink-0 text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5">{tf(lang, 'home.seriesCount')(posts.length)}</span>
      </div>
      <div class="mt-4 flex flex-col gap-2">
        {posts.slice(0, 3).map((post, i) => (
          <div class="journal-series-entry">
            <a href={langPath(`/posts/${post.slug}`, lang)} class="block px-3 py-2 no-underline text-black">
              <div class="flex items-baseline gap-2 sm:gap-3 min-w-0 flex-wrap">
                <span class="text-xs font-bold opacity-30 shrink-0 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span class="text-sm sm:text-base font-bold tracking-tight break-words min-w-0">{post.title}</span>
                <time class="ml-auto text-[10px] font-bold uppercase tracking-widest opacity-50 shrink-0" datetime={post.publishedAt ?? post.createdAt}>
                  {formatDateLang(post.publishedAt ?? post.createdAt, lang)}
                </time>
              </div>
              {post.excerpt && <p class="mt-1.5 text-sm opacity-70 leading-relaxed">{post.excerpt}</p>}
            </a>
          </div>
        ))}
      </div>
      <a class="journal-series-more" href={langPath(`/series/${collection.slug}`, lang)}>{t(lang, 'nav.series')} <span aria-hidden="true">↗</span></a>
      </div>
    </article>
  )
}

const Pagination: FC<{ pagination: PaginationData; lang: Lang }> = ({ pagination, lang }) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null

  return (
    <nav class="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-black" aria-label="pagination">
      <div class="flex justify-between">
        {page > 1 && (
          <a href={langPath(`/?page=${page - 1}`, lang)} class="text-xs sm:text-sm font-bold uppercase tracking-widest border border-black px-4 sm:px-6 py-2.5 sm:py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.prev">
            {t(lang, 'pagination.prev')}
          </a>
        )}
        {page < totalPages && (
          <a href={langPath(`/?page=${page + 1}`, lang)} class="ml-auto text-xs sm:text-sm font-bold uppercase tracking-widest border border-black px-4 sm:px-6 py-2.5 sm:py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.next">
            {t(lang, 'pagination.next')}
          </a>
        )}
      </div>
      <span class="block mt-4 text-center text-xs font-bold uppercase tracking-widest opacity-50">
        {tf(lang, 'pagination.pageInfo')(page, totalPages)}
      </span>
    </nav>
  )
}

const Home: FC<HomeProps> = ({ lang, groups, pagination, authorProfile }) => {
  return (
    <Layout
      title={t(lang, 'home.pageTitle')}
      description={t(lang, 'home.description')}
      url={langPath('/', lang)}
      type="website"
      homeLayout
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/"
      extraHead={
        <>
          <OrganizationSchema github={authorProfile?.github} email={authorProfile?.email} />
          <WebSiteSchema />
        </>
      }
    >
      <section class="home-journal">
        <div class="journal-intro">
          <div>
            <p class="journal-eyebrow">MRWULIU / <span data-t="home.journal">{t(lang, 'home.journal')}</span></p>
            <h1 data-t="home.intro">{t(lang, 'home.intro')}</h1>
            <p class="journal-subtitle" data-t="home.subtitle">{t(lang, 'home.subtitle')}</p>
          </div>
          {authorProfile && <div class="journal-author"><AuthorSidebar profile={authorProfile} /></div>}
        </div>
        <div class="journal-section-heading">
          <h2 data-t="home.title">{t(lang, 'home.title')}</h2>
          <a href={langPath('/writings', lang)} data-thref="/writings"><span data-t="nav.writings">{t(lang, 'nav.writings')}</span> <span aria-hidden="true">↗</span></a>
        </div>
        {groups.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="home.noPosts">{t(lang, 'home.noPosts')}</p>
          </div>
        ) : (
          <>
            <div class="journal-grid">
              {groups.map((group) =>
                group.kind === 'post' ? (
                  <PostCard post={group.post} lang={lang} />
                ) : (
                  <SeriesStack collection={group.collection} posts={group.posts} lang={lang} />
                )
              )}
            </div>
            <Pagination pagination={pagination} lang={lang} />
          </>
        )}
      </section>
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var grid = document.querySelector('.journal-grid');
  if (grid) {
    var frame;
    var cards = Array.from(grid.querySelectorAll(':scope > article'));
    var decorationSeed = Math.floor(Math.random() * 100000);
    var decorationSignature = '';
    function columnSpan(card, columns) {
      var cover = card.querySelector('.journal-cover');
      var image = cover && !cover.hidden ? cover.querySelector('img') : null;
      if (image) {
        var ratio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1.5;
        card.dataset.coverShape = ratio >= 2.2 ? 'panorama' : ratio >= 1.2 ? 'landscape' : ratio >= 0.9 ? 'square' : 'portrait';
        if (columns === 1) return 1;
        if (columns >= 12) return ratio >= 2.2 ? 12 : ratio >= 1.2 ? 8 : ratio >= 0.9 ? 6 : 4;
        if (columns >= 8) return ratio >= 1.2 ? 8 : ratio >= 0.9 ? 5 : 3;
        return ratio >= 1.2 ? 6 : ratio >= 0.9 ? 4 : 3;
      }
      delete card.dataset.coverShape;
      if (columns === 1) return 1;
      if (columns < 12) return columns === 8 ? 4 : 3;
      var title = card.querySelector('.journal-title');
      var length = title ? Array.from(title.textContent).reduce(function(total, character) {
        return total + (character.codePointAt(0) > 255 ? 2 : 1);
      }, 0) : 0;
      return card.classList.contains('journal-series') || length > 42 ? 4 : 3;
    }
    function fillGaps(columns, gap) {
      var bounds = grid.getBoundingClientRect();
      var track = (bounds.width - gap * (columns - 1)) / columns;
      var boxes = cards.map(function(card) {
        var box = card.getBoundingClientRect();
        return {
          column: Math.round((box.left - bounds.left) / (track + gap)),
          row: Math.round((box.top - bounds.top) / 4),
          span: Number(card.dataset.gridSpan),
          rows: Math.ceil((box.height + gap) / 4)
        };
      });
      var signature = columns === 1 ? 'single' : bounds.width + ':' + JSON.stringify(boxes);
      if (signature === decorationSignature) return;
      decorationSignature = signature;
      grid.querySelectorAll('.journal-interlude').forEach(function(item) { item.remove(); });
      if (columns === 1) return;
      var rowCount = boxes.reduce(function(total, box) { return Math.max(total, box.row + box.rows); }, 0);
      var occupied = Array.from({ length: rowCount }, function() { return new Uint8Array(columns); });
      function occupy(column, row, span, rows) {
        for (var y = row; y < row + rows; y++) {
          for (var x = column; x < column + span; x++) occupied[y][x] = 1;
        }
      }
      boxes.forEach(function(box) { occupy(box.column, box.row, box.span, box.rows); });
      var patterns = [
        '<path d="M42 278V42h236v236M58 278V58h204v220" stroke-opacity=".22"/><path d="M80 268V72h160v196" stroke-width="1.8" stroke-opacity="0.8"/><path d="M91 268V84h138v184" stroke-width="0.7" stroke-opacity="0.45"/><path d="M102 268V96h116v172" stroke-width="0.7" stroke-opacity="0.45"/><path d="M113 268V108h94v160" stroke-width="1.8" stroke-opacity="0.8"/><path d="M124 268V120h72v148" stroke-width="0.7" stroke-opacity="0.45"/><path d="M135 268V132h50v136" stroke-width="0.7" stroke-opacity="0.45"/><path d="M160 152v116" stroke-width="8"/><path d="M62 286h196M160 30v20" stroke-width=".6" stroke-opacity=".4"/><rect x="147" y="258" width="26" height="10" fill="currentColor" stroke="none"/>',
        '<g stroke-opacity=".18" stroke-width=".6"><path d="M48 86 272 214M48 134 224 236M96 60 272 162M48 214 272 86M48 162 224 60M96 240 272 138"/></g><path d="m92 98 68-38 68 38-68 40Z" stroke-width="1.4"/><path d="M92 98v132l68 38 68-38V98M160 138v130" stroke-width="1.4"/><path d="m92 120 68 38 68-38" stroke-width=".7" stroke-opacity=".55"/><path d="m92 142 68 38 68-38" stroke-width=".7" stroke-opacity=".55"/><path d="m92 164 68 38 68-38" stroke-width=".7" stroke-opacity=".55"/><path d="m92 186 68 38 68-38" stroke-width=".7" stroke-opacity=".55"/><path d="m92 208 68 38 68-38" stroke-width=".7" stroke-opacity=".55"/><path d="m92 164 68 38v44l-68-38Z" fill="currentColor" fill-opacity=".1" stroke="none"/><path d="m194 118 0 132M126 118v132" stroke-opacity=".45"/><path d="M160 35v14M160 279v13" stroke-width=".7"/>',
        '<path d="M160 22v276M26 268h268" stroke-width=".6" stroke-opacity=".22" stroke-dasharray="3 5"/><path d="M52 268V142a108 108 0 0 1 216 0v126" stroke-width="2.2" stroke-opacity="0.8"/><path d="M64 268V142a96 96 0 0 1 192 0v126" stroke-width="0.7" stroke-opacity="0.48"/><path d="M76 268V142a84 84 0 0 1 168 0v126" stroke-width="0.7" stroke-opacity="0.48"/><path d="M88 268V142a72 72 0 0 1 144 0v126" stroke-width="0.7" stroke-opacity="0.48"/><path d="M100 268V142a60 60 0 0 1 120 0v126" stroke-width="2.2" stroke-opacity="0.8"/><path d="M112 268V142a48 48 0 0 1 96 0v126" stroke-width="0.7" stroke-opacity="0.48"/><path d="M124 268V142a36 36 0 0 1 72 0v126" stroke-width="0.7" stroke-opacity="0.48"/><path d="M136 268V142a24 24 0 0 1 48 0v126" stroke-width="0.7" stroke-opacity="0.48"/><rect x="151" y="186" width="18" height="82" fill="currentColor" fill-opacity=".12" stroke="none"/>',
        '<g stroke-width=".6" stroke-opacity=".26"><path d="M48 48v224M48 48h224"/><path d="M76 48v224M48 76h224"/><path d="M104 48v224M48 104h224"/><path d="M132 48v224M48 132h224"/><path d="M160 48v224M48 160h224"/><path d="M188 48v224M48 188h224"/><path d="M216 48v224M48 216h224"/><path d="M244 48v224M48 244h224"/><path d="M272 48v224M48 272h224"/></g><path d="M76 244V104h56V76h84v84h28v84Z" stroke-width="1.5"/><path d="M104 244V132h56v-28h28v84h28v56" stroke-width="1"/><path d="M132 244v-56h28v-28h28" stroke-width="3"/><path d="M76 104h28v56H76ZM188 216h56v28h-56Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M34 48h12M48 34v12M274 272h12M272 274v12" stroke-width="1"/>',
        '<g stroke-width=".6" stroke-opacity=".22"><path d="M72 32v256M112 32v256M152 32v256M192 32v256M232 32v256M54 64h212M54 160h212M54 256h212"/></g><path d="m112 40 96 48-64 48 64 48-96 96V40Z" stroke-width="1.5"/><path d="m112 40 32 96-32 48 32 48-32 48M144 136l64 48M112 184h96" stroke-width=".9"/><path d="m144 136 64 48-96 96 32-48-32-48Z" fill="currentColor" fill-opacity=".1" stroke="none"/><path d="M248 66v188" stroke-width="4"/><path d="M260 112v96" stroke-width=".7"/>',
        '<path d="M82 54v218M238 48v224M160 22v276" stroke-opacity=".24" stroke-width=".6" stroke-dasharray="3 5"/><path d="m80 82 80-38 80 38-80 38Z" stroke-width="1.5"/><path d="m80 134 80-38 80 38-80 38Z" stroke-width="0.75"/><path d="m80 186 80-38 80 38-80 38Z" stroke-width="0.75"/><path d="m80 238 80-38 80 38-80 38Z" stroke-width="1.5"/><path d="M80 82v156M240 82v156M160 120v156" stroke-width=".65" stroke-opacity=".5"/><path d="m80 186 80-38 80 38-80 38Z" fill="currentColor" fill-opacity=".1" stroke="none"/><circle cx="160" cy="44" r="3" fill="currentColor" stroke="none"/>',
        '<path d="M48 160h224M160 32v256" stroke-width=".6" stroke-opacity=".25"/><circle cx="160" cy="160" r="108" stroke-width="0.7" stroke-opacity="0.42"/><circle cx="160" cy="160" r="96" stroke-width="1.8" stroke-opacity="0.85"/><circle cx="160" cy="160" r="74" stroke-width="0.7" stroke-opacity="0.42"/><circle cx="160" cy="160" r="62" stroke-width="0.7" stroke-opacity="0.42"/><circle cx="160" cy="160" r="40" stroke-width="0.7" stroke-opacity="0.42"/><path d="M100 44v232M218 70v188" stroke-width=".7"/><rect x="91" y="102" width="18" height="116" fill="currentColor" fill-opacity=".12" stroke="none"/><path d="M218 122v76" stroke-width="6"/><circle cx="160" cy="160" r="5" fill="currentColor" stroke="none"/>',
        '<rect x="48" y="42" width="224" height="236" stroke-width="1.6" stroke-opacity="0.85"/><rect x="70" y="62" width="180" height="196" stroke-width="0.65" stroke-opacity="0.5"/><rect x="92" y="82" width="136" height="156" stroke-width="0.65" stroke-opacity="0.5"/><rect x="112" y="100" width="96" height="120" stroke-width="1.6" stroke-opacity="0.85"/><rect x="130" y="116" width="60" height="88" stroke-width="0.65" stroke-opacity="0.5"/><rect x="144" y="128" width="32" height="64" stroke-width="0.65" stroke-opacity="0.5"/><path d="m48 42 96 86M272 42l-96 86M48 278l96-86M272 278l-96-86" stroke-width=".7" stroke-opacity=".45"/><rect x="151" y="140" width="18" height="40" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M34 42v60M286 218v60" stroke-width="3"/>'
      ];
      var minSpan = Math.max(2, Math.ceil((150 + gap) / (track + gap)));
      var minRows = Math.ceil((120 + gap) / 4);
      var maxRows = Math.ceil((300 + gap) / 4);
      var count = 0;
      // Only occupy sufficiently large holes inside the articles' existing footprint.
      for (var row = 0; row <= rowCount - minRows && count < 8; row++) {
        for (var column = 0; column <= columns - minSpan && count < 8; column++) {
          var run = 0;
          while (column + run < columns && !occupied[row][column + run]) run++;
          if (run < minSpan) continue;
          var span = Math.min(run, columns >= 12 ? 6 : 4);
          var rows = 0;
          while (row + rows < rowCount && rows < maxRows) {
            var free = true;
            for (var x = column; x < column + span; x++) {
              if (occupied[row + rows][x]) { free = false; break; }
            }
            if (!free) break;
            rows++;
          }
          if (rows < minRows) continue;
          occupy(column, row, span, rows);
          var item = document.createElement('div');
          item.className = 'journal-interlude';
          item.setAttribute('aria-hidden', 'true');
          item.style.left = column * (track + gap) + 'px';
          item.style.top = row * 4 + 'px';
          item.style.width = span * (track + gap) - gap + 'px';
          item.style.height = rows * 4 - gap + 'px';
          var variant = (decorationSeed + count * 3) % patterns.length;
          item.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">' + patterns[variant] + '</svg>';
          grid.appendChild(item);
          count++;
        }
      }
    }
    function layout() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function() {
        var styles = getComputedStyle(grid);
        var columns = parseInt(styles.getPropertyValue('--journal-columns'), 10) || 1;
        var gap = parseFloat(styles.columnGap) || 24;
        grid.classList.toggle('is-masonry', columns > 1);
        // Set every width before measuring: wrapping and image height both change with the span.
        cards.forEach(function(card) {
          var span = columnSpan(card, columns);
          card.style.gridColumn = 'span ' + span;
          card.dataset.gridSpan = String(span);
        });
        cards.forEach(function(card) {
          card.style.gridRowEnd = columns > 1 ? 'span ' + Math.ceil((card.getBoundingClientRect().height + gap) / 4) : '';
        });
        fillGaps(columns, gap);
      });
    }
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(layout);
      observer.observe(grid);
      cards.forEach(function(card) { observer.observe(card); });
    } else {
      window.addEventListener('resize', layout);
    }
    grid.querySelectorAll('img').forEach(function(img) {
      img.addEventListener('load', layout);
      function fallback() {
        var card = img.closest('.journal-card');
        img.closest('.journal-cover').hidden = true;
        card.classList.remove('journal-card-image');
        if (!card.classList.contains('journal-series')) card.classList.add('journal-card-text');
        layout();
      }
      img.addEventListener('error', fallback);
      if (img.complete && !img.naturalWidth) fallback();
    });
    document.fonts.ready.then(layout);
    layout();
  }
  function getFingerprint() {
    var k = 'blog_fp';
    var fp = localStorage.getItem(k);
    if (!fp) { fp = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); localStorage.setItem(k, fp); }
    return fp;
  }
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.like-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true;
    var postId = btn.getAttribute('data-post-id');
    var countEl = btn.querySelector('.like-count');
    var svg = btn.querySelector('svg');
    var count = parseInt(btn.getAttribute('data-like-count') || '0', 10);
    fetch('/api/posts/' + postId + '/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: getFingerprint() })
    }).then(function(res) { return res.json(); }).then(function(data) {
      if (data.liked) {
        count++;
        svg.setAttribute('fill', 'currentColor');
        btn.style.opacity = '1';
      } else {
        count = Math.max(0, count - 1);
        svg.setAttribute('fill', 'none');
        btn.style.opacity = '';
      }
      countEl.textContent = count;
      btn.setAttribute('data-like-count', count);
    }).catch(function() {}).finally(function() { btn.disabled = false; });
  });
})();
      ` }} />
    </Layout>
  )
}

export default Home
