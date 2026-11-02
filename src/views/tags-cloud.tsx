import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { ItemListSchema, BreadcrumbSchema } from './components/structured-data'
import { type Lang, t, langPath } from '../i18n'

type TagItem = {
  id: string
  name: string
  slug: string
  postCount: number
}

function getTagSizeClass(count: number): string {
  if (count >= 11) return 'text-2xl'
  if (count >= 7) return 'text-xl'
  if (count >= 4) return 'text-lg'
  if (count >= 2) return 'text-base'
  return 'text-sm'
}

const TagsCloudPage: FC<{ lang: Lang; tags: TagItem[]; authorProfile?: AuthorProfile }> = ({ lang, tags, authorProfile }) => {
  return (
    <Layout
      title={t(lang, 'tagsCloud.pageTitle')}
      description={t(lang, 'tagsCloud.description')}
      url={langPath('/tags-cloud', lang)}
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/tags-cloud"
      extraHead={
        <>
          <BreadcrumbSchema items={[
            { name: t(lang, 'nav.tags'), url: langPath('/tags-cloud', lang) },
          ]} />
          <ItemListSchema data={{
            name: t(lang, 'tagsCloud.title'),
            description: t(lang, 'tagsCloud.description'),
            url: langPath('/tags-cloud', lang),
            numberOfItems: tags.length,
          }} />
        </>
      }
    >
      <section class="tags-cloud-page">
        <h1 class="page-title" data-t="tagsCloud.title">
          {t(lang, 'tagsCloud.title')}
        </h1>
        <p class="page-description" data-t="tagsCloud.description">{t(lang, 'tagsCloud.description')}</p>
        {tags.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="tagsCloud.noTags">{t(lang, 'tagsCloud.noTags')}</p>
          </div>
        ) : (
          <div class="topic-cloud">
            {tags.map((tag) => (
              <a
                href={langPath(`/tags/${tag.slug}`, lang)}
                class={`topic-link ${getTagSizeClass(tag.postCount)}`}
              >
                <span>{tag.name}</span><span class="topic-count">{tag.postCount}</span>
              </a>
            ))}
          </div>
        )}
      </section>
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var cloud = document.querySelector('.topic-cloud');
  if (!cloud || !window.ResizeObserver) return;
  var links = Array.from(cloud.querySelectorAll('.topic-link'));
  if (!links.length) return;
  var lastWidth = -1;
  function layout() {
    var width = cloud.clientWidth;
    if (!width || width === lastWidth) return;
    lastWidth = width;
    cloud.classList.add('is-scattered');
    var placed = [];
    var items = links.map(function(link) {
      return { link: link, width: link.getBoundingClientRect().width, height: link.getBoundingClientRect().height };
    }).sort(function(a, b) { return b.height - a.height || b.width - a.width; });
    var gapX = width < 500 ? 16 : 28;
    var gapY = width < 500 ? 16 : 22;
    items.forEach(function(item, index) {
      var box;
      for (var step = 0; step < 2500; step++) {
        var angle = index * 2.39996 + step * 0.22;
        var radius = step * 0.65;
        var x = width / 2 + Math.cos(angle) * radius * 1.7 - item.width / 2;
        var y = Math.sin(angle) * radius - item.height / 2;
        if (x < 0 || x + item.width > width) continue;
        var candidate = { x: x, y: y, width: item.width, height: item.height };
        var overlaps = placed.some(function(other) {
          return x < other.x + other.width + gapX && x + item.width + gapX > other.x &&
            y < other.y + other.height + gapY && y + item.height + gapY > other.y;
        });
        if (!overlaps) { box = candidate; break; }
      }
      if (!box) {
        box = { x: Math.max(0, (width - item.width) / 2), y: placed.reduce(function(bottom, p) { return Math.max(bottom, p.y + p.height); }, 0) + gapY, width: item.width, height: item.height };
      }
      box.link = item.link;
      placed.push(box);
    });
    var top = Math.min.apply(null, placed.map(function(box) { return box.y; }));
    var bottom = Math.max.apply(null, placed.map(function(box) { return box.y + box.height; }));
    placed.forEach(function(box) {
      box.link.style.left = box.x + 'px';
      box.link.style.top = box.y - top + 32 + 'px';
    });
    cloud.style.height = bottom - top + 64 + 'px';
  }
  new ResizeObserver(layout).observe(cloud);
  layout();
  document.fonts.ready.then(function() { lastWidth = -1; layout(); });
})();
      ` }} />
    </Layout>
  )
}

export default TagsCloudPage
