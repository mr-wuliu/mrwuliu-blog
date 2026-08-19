import type { FC } from 'hono/jsx'
import type { InferSelectModel } from 'drizzle-orm'
import Layout from './layout'
import { ArticleSchema, BreadcrumbSchema } from './components/structured-data'
import type { TocHeading } from '../utils/latex'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, tf, langPath, formatDateLang, otherLang } from '../i18n'
import { userAvatarHtml, type UserAvatarType } from '../utils/avatar'
import { countWords } from '../utils/word-count'

function commentAvatarHtml(c: Comment, size: number): string {
  return userAvatarHtml({
    avatarType: c.avatarType ?? 'identicon',
    avatarR2Key: c.avatarR2Key ?? '',
    email: c.authorEmail ?? '',
    avatarSeed: c.avatarSeed || c.visitorId || ((c.authorEmail || '') + c.authorName) || c.id,
    id: c.id,
  }, size)
}

type Post = InferSelectModel<typeof import('../db/schema').posts>
type Tag = InferSelectModel<typeof import('../db/schema').tags>
type Comment = {
  id: string
  postId: string
  parentId: string | null
  authorName: string
  authorEmail: string | null
  visitorId: string | null
  userId: string | null
  content: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  avatarType: UserAvatarType | null
  avatarR2Key: string | null
  avatarSeed: string | null
}

interface PostWithTags extends Omit<Post, never> {
  tags: Tag[]
}

interface PostNav {
  slug: string
  title: string
}

interface CollectionInfo {
  id: string
  name: string
  nameEn: string | null
  slug: string
  posts: { id: string; title: string; slug: string }[]
}

interface PostPageProps {
  lang: Lang
  post: PostWithTags
  content: string
  headings: TocHeading[]
  comments: Comment[]
  prev: PostNav | null
  next: PostNav | null
  authorProfile?: AuthorProfile
  collections?: CollectionInfo[]
}

const Toc: FC<{ headings: TocHeading[]; lang: Lang }> = ({ headings, lang }) => {
  if (headings.length === 0) return <></>

  return (
    <nav id="toc-nav" class="my-6 sm:my-8 p-4 sm:p-6 bg-white border border-black rounded-none">
      <h2 class="text-xs font-bold uppercase tracking-widest opacity-50 mb-4" data-t="post.toc">{t(lang, 'post.toc')}</h2>
      <ul class="space-y-1">
        {headings.map((h) => (
          <li style={`padding-left: ${(h.level - 2) * 1.5}rem`}>
            <a href={`#${h.id}`} class="text-sm text-black opacity-70 hover:opacity-100 no-underline transition-all">{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const SeriesCatalogSidebar: FC<{ collections: CollectionInfo[]; currentPostId: string; lang: Lang }> = ({ collections, currentPostId, lang }) => {
  return (
    <div class="hidden lg:flex lg:flex-col gap-6 min-h-0">
      {collections.map((collection) => (
        <nav key={collection.id} class="bg-white border border-black rounded-none flex flex-col min-h-0">
          <div class="shrink-0 px-4 pt-3 pb-2 border-b border-gray-200">
            <p class="text-xs font-bold uppercase tracking-widest opacity-50 mb-1" data-t="post.seriesToc">{t(lang, 'post.seriesToc')}</p>
            <a href={langPath('/series/' + collection.slug, lang)} class="text-sm font-bold text-black hover:opacity-70 transition-all no-underline break-words">
              {lang === 'en' && collection.nameEn ? collection.nameEn : collection.name}
            </a>
          </div>
          <div class="series-wheel-wrap flex flex-col min-h-0">
            <ol tabindex={0} aria-label={t(lang, 'post.seriesToc')} class="series-wheel list-none p-2 m-0 overflow-y-auto min-h-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-black">
              <div class="series-wheel-inner" role="presentation">
                {collection.posts.map((cp, index) => (
                  <li key={cp.id} class="series-wheel-item">
                    <a
                      href={langPath('/posts/' + cp.slug, lang)}
                      aria-current={cp.id === currentPostId ? 'page' : undefined}
                      class={`flex items-start gap-2 py-1.5 px-2 border-l-2 no-underline transition-colors ${cp.id === currentPostId ? 'border-black font-bold text-black' : 'border-transparent text-gray-500 hover:text-black'}`}
                    >
                      <span class="text-xs font-bold opacity-40 shrink-0 tabular-nums leading-snug">{index + 1}</span>
                      <span class="text-sm leading-snug min-w-0 flex-1">{cp.title}</span>
                    </a>
                  </li>
                ))}
              </div>
            </ol>
            <div class="series-wheel-fade series-wheel-fade-top" aria-hidden="true"></div>
            <div class="series-wheel-fade series-wheel-fade-bottom" aria-hidden="true"></div>
          </div>
        </nav>
      ))}
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var wheels = document.querySelectorAll('.series-wheel');
  if (!wheels.length) return;

  // Flywheel physics: wheel notches add velocity impulses; a friction glide
  // (exponential decay) plus a per-notch detent drag make it feel mechanical;
  // a short settle snaps to the nearest item center when speed drops. Past the
  // first/last item the scroller rubber-bands: overshoot is absorbed, rendered
  // as a damped translate on the content wrapper, and spring-pulled home.
  var IMPULSE_K = 5;       // px of wheel delta -> px/s of velocity
  var IMPULSE_POS = 0.12;  // immediate position kick per notch (responsiveness)
  var V_MAX = 5000;        // px/s velocity clamp
  var TAU = 0.38;          // friction time constant (s), heavier = larger
  var V_ENGAGE = 180;      // px/s threshold to engage notch settle / rubber return
  var DETENT_DAMP = 0.965; // velocity multiplier per notch passed
  var SETTLE_DUR = 260;    // ms, easeOutCubic snap to nearest center
  var SETTLE_QUIET = 120;  // ms of wheel silence before settle may engage
  var KEY_DUR = 240;       // ms per keyboard step
  var KEY_PAGE = 4;        // items per PageUp/PageDown
  var KEY_END_DUR = 400;   // ms for Home/End
  var RUBBER_MAX = 48;     // px, hard cap on visible rubber-band travel
  var K_SPRING = 170;      // rubber-band spring stiffness (1/s^2)
  var C_GLIDE = 2 * 1.1 * Math.sqrt(K_SPRING);  // stretch damping (zeta = 1.1, overdamped)
  var C_SPRING = 2 * 0.75 * Math.sqrt(K_SPRING); // return damping (zeta = 0.75)

  function setup(wheel) {
    var items = wheel.querySelectorAll('.series-wheel-item');
    if (!items.length) return;
    var inner = wheel.querySelector('.series-wheel-inner');

    var pos = wheel.scrollTop; // authoritative scrollTop (px), may transiently leave [0, max]
    var vel = 0;               // px/s
    var mode = 'idle';         // 'idle' | 'glide' | 'settle' | 'rubber'
    var raf = null;
    var lastT = 0;
    var settleFrom = 0;
    var settleTo = 0;
    var settleStart = 0;
    var settleDur = SETTLE_DUR;
    var lastDetent = -1;
    var lastWheelAt = -1e9;
    var rubberBound = 0;       // boundary (0 or max) the rubber-band is pinned to
    var rubberOver = 0;        // raw px overshoot past rubberBound
    var rubberVel = 0;         // px/s velocity of the overshoot

    function physicsActive() { return mode !== 'idle'; }

    function maxScroll() {
      return Math.max(wheel.scrollHeight - wheel.clientHeight, 0);
    }

    function clampPos(v) {
      var mx = maxScroll();
      if (v < 0) return 0;
      if (v > mx) return mx;
      return v;
    }

    // iOS-style progressive damping: fast flicks converge to RUBBER_MAX.
    function dampOvershoot(x) {
      var ax = Math.abs(x);
      if (ax < 0.01) return 0;
      var d = ax * 0.55 / (1 + ax / 120);
      if (d > RUBBER_MAX) d = RUBBER_MAX;
      return x < 0 ? -d : d;
    }

    function setTranslate(px) {
      if (px === 0) {
        if (inner.style.transform) inner.style.transform = '';
      } else {
        inner.style.transform = 'translateY(' + px.toFixed(2) + 'px)';
      }
    }

    // scrollTop carries the in-range position; the damped overshoot rides on
    // the content wrapper.
    function applyPos() {
      var c = clampPos(pos);
      wheel.scrollTop = c;
      setTranslate(-dampOvershoot(pos - c));
    }

    function paintRubber() {
      wheel.scrollTop = rubberBound;
      setTranslate(-dampOvershoot(rubberOver));
    }

    // Signed viewport offset from wheel center to the nearest item center.
    function nearestOffset() {
      var wr = wheel.getBoundingClientRect();
      var wc = wr.top + wr.height / 2;
      var best = 0;
      var bestAbs = Infinity;
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        var d = (r.top + r.height / 2) - wc;
        var ad = Math.abs(d);
        if (ad < bestAbs) { bestAbs = ad; best = d; }
      }
      return best;
    }

    function nearestIndex() {
      var wr = wheel.getBoundingClientRect();
      var wc = wr.top + wr.height / 2;
      var best = 0;
      var bestAbs = Infinity;
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        var d = Math.abs((r.top + r.height / 2) - wc);
        if (d < bestAbs) { bestAbs = d; best = i; }
      }
      return best;
    }

    function targetPosForIndex(i) {
      var wr = wheel.getBoundingClientRect();
      var r = items[i].getBoundingClientRect();
      return clampPos((r.top - wr.top) + pos + r.height / 2 - wheel.clientHeight / 2);
    }

    function ensureRaf() {
      if (raf === null) {
        lastT = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }

    function startSettle(dur) {
      settleFrom = pos;
      settleTo = clampPos(pos + nearestOffset());
      settleDur = dur;
      settleStart = performance.now();
      vel = 0;
      if (Math.abs(settleTo - settleFrom) < 0.5) {
        pos = settleTo;
        applyPos();
        mode = 'idle';
        return;
      }
      mode = 'settle';
      ensureRaf();
    }

    function animateToIndex(i, dur) {
      settleFrom = pos;
      settleTo = targetPosForIndex(i);
      settleDur = dur;
      settleStart = performance.now();
      vel = 0;
      mode = 'settle';
      ensureRaf();
    }

    function stopPhysics() {
      mode = 'idle';
      vel = 0;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      pos = wheel.scrollTop;
      setTranslate(0);
    }

    function startRubber() {
      var mx = maxScroll();
      rubberBound = pos > mx ? mx : 0;
      rubberOver = pos - rubberBound;
      rubberVel = vel;
      mode = 'rubber';
    }

    function tick(now) {
      if (!wheel.isConnected) { raf = null; mode = 'idle'; return; }
      var dt = Math.min((now - lastT) / 1000, 0.064);
      lastT = now;

      if (mode === 'glide') {
        pos += vel * dt;
        var mx = maxScroll();
        var over = pos < 0 ? pos : (pos > mx ? pos - mx : 0);
        if (over !== 0) {
          // Beyond an edge: overdamped boundary spring resists the stretch and
          // burns the flick's energy without swinging back through the edge.
          vel += (-K_SPRING * over - C_GLIDE * vel) * dt;
          if (Math.abs(vel) < V_ENGAGE) startRubber();
        } else {
          vel *= Math.exp(-dt / TAU);
          // Detent tick: passing each notch drags the flywheel a little.
          var idx = nearestIndex();
          if (idx !== lastDetent) { lastDetent = idx; vel *= DETENT_DAMP; }
        }
        if (mode === 'rubber') {
          paintRubber();
        } else {
          // Write pos before measuring centers: nearestOffset must see the
          // frame it will settle from, or the snap target lags by one frame.
          applyPos();
          // Snap only after input goes quiet: mid-spin the detents must not
          // steal sub-threshold velocity, or fast small deltas never stack.
          if (over === 0 && Math.abs(vel) < V_ENGAGE && now - lastWheelAt >= SETTLE_QUIET) startSettle(SETTLE_DUR);
        }
      } else if (mode === 'settle') {
        var p = (now - settleStart) / settleDur;
        if (p >= 1) {
          pos = settleTo;
          applyPos();
          mode = 'idle';
          raf = null;
          return;
        }
        var e = 1 - Math.pow(1 - p, 3);
        pos = clampPos(settleFrom + (settleTo - settleFrom) * e);
        applyPos();
      } else if (mode === 'rubber') {
        // Damped spring on the raw overshoot; scrollTop stays pinned at the
        // boundary so the translate alone carries the bounce.
        rubberVel += (-K_SPRING * rubberOver - C_SPRING * rubberVel) * dt;
        rubberOver += rubberVel * dt;
        if (Math.abs(rubberOver) < 1.5 && Math.abs(rubberVel) < 80) {
          pos = rubberBound;
          mode = 'idle';
          applyPos();
          raf = null;
          return;
        }
        pos = rubberBound + rubberOver;
        paintRubber();
      }

      if (mode !== 'idle') raf = requestAnimationFrame(tick);
      else raf = null;
    }

    function onWheel(e) {
      if (!wheel.classList.contains('is-scrollable')) return;
      e.preventDefault();
      var dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 33;
      else if (e.deltaMode === 2) dy *= wheel.clientHeight;
      if (dy > 400) dy = 400;
      else if (dy < -400) dy = -400;
      if (dy === 0) return;
      if (mode === 'idle') pos = wheel.scrollTop;
      // While rubber-banded, pos already carries the overshoot: re-entering
      // glide from it continues from the current visual position.
      lastWheelAt = performance.now();
      // Impulses stack onto live velocity: spin speed tracks trigger frequency.
      mode = 'glide';
      vel += dy * IMPULSE_K;
      if (vel > V_MAX) vel = V_MAX;
      else if (vel < -V_MAX) vel = -V_MAX;
      pos += dy * IMPULSE_POS; // kick may cross an edge; the rubber-band takes it
      applyPos();
      ensureRaf();
    }

    function onKeyDown(e) {
      if (!wheel.classList.contains('is-scrollable')) return;
      if (e.target !== wheel) return;
      if (mode === 'rubber') { pos = clampPos(pos); setTranslate(0); }
      if (mode === 'idle') pos = wheel.scrollTop;
      var k = e.key;
      var target = -1;
      var dur = KEY_DUR;
      var cur = nearestIndex();
      if (k === 'ArrowDown') target = Math.min(cur + 1, items.length - 1);
      else if (k === 'ArrowUp') target = Math.max(cur - 1, 0);
      else if (k === 'PageDown') target = Math.min(cur + KEY_PAGE, items.length - 1);
      else if (k === 'PageUp') target = Math.max(cur - KEY_PAGE, 0);
      else if (k === 'Home') { target = 0; dur = KEY_END_DUR; }
      else if (k === 'End') { target = items.length - 1; dur = KEY_END_DUR; }
      else return;
      e.preventDefault();
      animateToIndex(target, dur);
    }

    // Native touch fallback: resync on scroll, realign on scrollend.
    // Our own physics writes are ignored via the physicsActive guard; external
    // scrolls (touch drag, programmatic) resync the authoritative pos.
    function onScroll() {
      if (physicsActive()) return;
      pos = wheel.scrollTop;
    }

    function onScrollEnd() {
      if (physicsActive()) return;
      if (!wheel.classList.contains('is-scrollable')) return;
      var off = nearestOffset();
      if (Math.abs(off) > 1) {
        wheel.scrollTo({ top: wheel.scrollTop + off, behavior: 'smooth' });
      }
    }

    function check() {
      if (!wheel.isConnected) {
        window.removeEventListener('resize', check);
        window.removeEventListener('load', onLateCheck);
        if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
        mode = 'idle';
        return;
      }
      // Measure scrollability at the natural p-2 state, then apply a fixed
      // edge inset so the first/last items clear the 28px fade at rest.
      // No centering padding: at scrollTop 0/max the edge items align to the
      // inset and the viewport stays full of items.
      wheel.style.paddingTop = '';
      wheel.style.paddingBottom = '';
      var scrollable = wheel.scrollHeight > wheel.clientHeight + 4;
      if (scrollable) {
        wheel.style.paddingTop = '32px';
        wheel.style.paddingBottom = '32px';
        wheel.classList.add('is-scrollable');
        wheel.addEventListener('wheel', onWheel, { passive: false });
        wheel.addEventListener('keydown', onKeyDown);
        wheel.addEventListener('scroll', onScroll, { passive: true });
        stopPhysics(); // geometry changed — resync authoritative pos
        lastDetent = nearestIndex();
      } else {
        wheel.classList.remove('is-scrollable');
        wheel.removeEventListener('wheel', onWheel);
        wheel.removeEventListener('keydown', onKeyDown);
        wheel.removeEventListener('scroll', onScroll);
        stopPhysics();
      }
    }

    function centerCurrent() {
      var cur = wheel.querySelector('[aria-current="page"]');
      if (!cur || !wheel.isConnected || !wheel.classList.contains('is-scrollable')) return;
      var cr = cur.getBoundingClientRect();
      var wr = wheel.getBoundingClientRect();
      wheel.scrollTop += (cr.top + cr.height / 2) - (wr.top + wr.height / 2);
      pos = wheel.scrollTop;
      lastDetent = nearestIndex();
    }

    function onLateCheck() {
      check();
      centerCurrent();
    }

    if ('onscrollend' in window) wheel.addEventListener('scrollend', onScrollEnd);

    check();
    centerCurrent();
    window.addEventListener('resize', check);
    window.addEventListener('load', onLateCheck);
  }

  for (var w = 0; w < wheels.length; w++) setup(wheels[w]);
})();
      ` }} />
    </div>
  )
}

const CommentSection: FC<{ comments: Comment[]; postSlug: string; lang: Lang }> = ({ comments, postSlug, lang }) => {
  const submitUrl = langPath(`/posts/${postSlug}/comments`, lang)
  const otherL = otherLang(lang)
  const successMsg = t(lang, 'post.commentSuccess')
  const errorMsg = t(lang, 'post.commentError')
  const otherSuccessMsg = t(otherL, 'post.commentSuccess')
  const otherErrorMsg = t(otherL, 'post.commentError')
  const otherSubmitUrl = langPath(`/posts/${postSlug}/comments`, otherL)

  const commentCountZh = lang === 'zh' ? tf(lang, 'post.comments')(comments.length) : tf(otherL, 'post.comments')(comments.length)
  const commentCountEn = lang === 'en' ? tf(lang, 'post.comments')(comments.length) : tf(otherL, 'post.comments')(comments.length)

  const replyLabel = t(lang, 'post.reply')
  const cancelReplyLabel = t(lang, 'post.cancelReply')

  const loginUrl = langPath(`/login?next=${encodeURIComponent(langPath(`/posts/${postSlug}`, lang))}`, lang)

  const topLevelComments = comments.filter(c => !c.parentId)
  const repliesByParent: Record<string, Comment[]> = {}
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = []
      repliesByParent[c.parentId].push(c)
    }
  }

  return (
    <section class="mt-4 pt-6 sm:pt-8 border-t-2 border-black"
      data-comment-msg={successMsg}
      data-comment-err={errorMsg}
      data-comment-msg-zh={lang === 'zh' ? successMsg : otherSuccessMsg}
      data-comment-msg-en={lang === 'en' ? successMsg : otherSuccessMsg}
      data-comment-err-zh={lang === 'zh' ? errorMsg : otherErrorMsg}
      data-comment-err-en={lang === 'en' ? errorMsg : otherErrorMsg}
      data-comment-url={submitUrl}
      data-comment-url-zh={lang === 'zh' ? submitUrl : otherSubmitUrl}
      data-comment-url-en={lang === 'en' ? submitUrl : otherSubmitUrl}
      data-reply-label={replyLabel}
      data-cancel-reply-label={cancelReplyLabel}
      data-login-url={loginUrl}
      data-logged-in-as={tf(lang, 'post.loggedInAs')('{name}')}
    >
      <h2 class="text-xl font-bold tracking-tight mb-4"
        data-comment-count={comments.length}
        data-comment-count-zh={commentCountZh}
        data-comment-count-en={commentCountEn}
      >{tf(lang, 'post.comments')(comments.length)}</h2>

      {comments.length > 0 && (
        <div class="space-y-4 mb-8">
          {topLevelComments.map((c) => (
            <div class="p-4 sm:p-6 bg-white border border-black mb-2" id={`comment-${c.id}`}>
              <div class="flex gap-3">
                <div class="flex-shrink-0 mt-0.5 border border-gray-300 h-[40px] w-[40px] overflow-hidden" style="line-height:0;font-size:0" dangerouslySetInnerHTML={{ __html: commentAvatarHtml(c, 40) }} />
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 mb-1">
                    <span class="text-sm font-bold text-black">{c.authorName}</span>
                    <span class="text-xs font-bold uppercase tracking-widest opacity-50">{formatDateLang(c.createdAt, lang)}</span>
                  </div>
                  <div class="text-sm opacity-70 leading-relaxed">{c.content}</div>
                  <button type="button" class="reply-btn text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all mt-2" data-reply-to={c.id} data-reply-name={c.authorName}>{replyLabel}</button>
                </div>
              </div>
              {(repliesByParent[c.id] || []).length > 0 && (
                <div class="ml-6 sm:ml-12 mt-4 pt-4 border-t border-gray-200 space-y-2">
                  {(repliesByParent[c.id] || []).map((r) => (
                    <div class="flex gap-3 py-2" id={`comment-${r.id}`}>
                      <div class="flex-shrink-0 mt-0.5 border border-gray-200 h-[32px] w-[32px] overflow-hidden" style="line-height:0;font-size:0" dangerouslySetInnerHTML={{ __html: commentAvatarHtml(r, 32) }} />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-baseline gap-2 mb-1">
                          <span class="text-sm font-bold text-black">{r.authorName}</span>
                          <span class="text-xs font-bold uppercase tracking-widest opacity-50">{formatDateLang(r.createdAt, lang)}</span>
                        </div>
                        <div class="text-sm opacity-70 leading-relaxed">→ {c.authorName}: {r.content}</div>
                        <button type="button" class="reply-btn text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all mt-1" data-reply-to={c.id} data-reply-name={r.authorName}>{replyLabel}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <div class="mb-8 px-4 py-3 border border-gray-300 bg-gray-100 text-sm text-gray-600" data-t="post.noComments">
          {t(lang, 'post.noComments')}
        </div>
      )}

      <div id="comment-login-required" class="mb-8 px-4 py-6 border border-gray-300 bg-gray-100 text-center">
        <p class="text-sm font-bold mb-1" data-t="post.loginToComment">{t(lang, 'post.loginToComment')}</p>
        <p class="text-xs text-gray-500 mb-3" data-t="post.loginToCommentDesc">{t(lang, 'post.loginToCommentDesc')}</p>
        <a href={loginUrl} class="inline-block px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-all" data-t="nav.login">{t(lang, 'nav.login')}</a>
      </div>

      <details class="hidden border border-black group">
        <summary class="list-none cursor-pointer px-4 py-3 text-sm font-bold uppercase tracking-widest select-none flex items-center justify-between">
          <span data-t="post.leaveComment">{t(lang, 'post.leaveComment')}</span>
          <span class="transition-transform group-open:rotate-45">+</span>
        </summary>
        <form id="comment-form" class="p-4 border-t border-black space-y-3">
          <style>{`#comment-form input::placeholder, #comment-form textarea::placeholder { color: #999; font-weight: 700; }`}</style>
          <div id="reply-indicator" class="hidden px-3 py-2 bg-gray-100 border border-gray-300 text-sm flex items-center justify-between">
            <span id="reply-indicator-text"></span>
            <button type="button" id="cancel-reply-btn" class="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all">{cancelReplyLabel}</button>
          </div>
          <input type="hidden" id="comment-parent-id" name="parentId" value="" />
          <div>
            <input type="text" id="authorName" name="authorName" maxlength={50}
              placeholder={t(lang, 'post.namePlaceholder')}
              data-placeholder="post.namePlaceholder"
              class="w-full px-3 py-2 border border-black text-sm focus:outline-none focus:border-black" />
          </div>
          <div>
            <input type="email" id="authorEmail" name="authorEmail" maxlength={100}
              placeholder={t(lang, 'post.emailLabel')}
              data-placeholder="post.emailLabel"
              class="w-full px-3 py-2 border border-black text-sm focus:outline-none focus:border-black" />
            <p class="text-xs text-gray-400 mt-1" data-t="post.emailNote">{t(lang, 'post.emailNote')}</p>
          </div>
          <div>
            <textarea id="content" name="content" required maxlength={1000} rows={4}
              placeholder={t(lang, 'post.contentLabel')}
              data-placeholder="post.contentLabel"
              class="w-full px-3 py-2 border border-black text-sm focus:outline-none focus:border-black resize-y"></textarea>
          </div>
          <button type="submit"
            class="px-8 py-3 font-bold text-sm border border-black rounded-none uppercase tracking-widest hover:bg-black hover:text-white transition-all" data-t="post.submit">
            {t(lang, 'post.submit')}
          </button>
        </form>
      </details>

      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var form = document.getElementById('comment-form');
  if (!form) return;
  var section = form.closest('section');
  function getMsg() { return section.getAttribute('data-comment-msg'); }
  function getErr() { return section.getAttribute('data-comment-err'); }
  function getUrl() { return section.getAttribute('data-comment-url'); }
  function getReplyLabel() { return section.getAttribute('data-reply-label'); }
  function getCancelReplyLabel() { return section.getAttribute('data-cancel-reply-label'); }
  var loginUrl = section.getAttribute('data-login-url');

  var parentInput = document.getElementById('comment-parent-id');
  var replyIndicator = document.getElementById('reply-indicator');
  var replyIndicatorText = document.getElementById('reply-indicator-text');
  var cancelReplyBtn = document.getElementById('cancel-reply-btn');

  function showToast(msg, type) {
    var el = document.createElement('div');
    el.className = 'comment-toast comment-toast--' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function() {
      el.classList.add('comment-toast--visible');
    });
    setTimeout(function() {
      el.classList.remove('comment-toast--visible');
      setTimeout(function() { el.remove(); }, 300);
    }, 4000);
  }

  function clearReply() {
    parentInput.value = '';
    replyIndicator.classList.add('hidden');
    replyIndicator.classList.remove('flex');
  }

  document.querySelectorAll('.reply-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!isLoggedIn) {
        window.location.href = loginUrl;
        return;
      }
      var replyTo = btn.getAttribute('data-reply-to');
      var replyName = btn.getAttribute('data-reply-name');
      parentInput.value = replyTo;
      replyIndicatorText.textContent = getReplyLabel() + ' ' + replyName;
      replyIndicator.classList.remove('hidden');
      replyIndicator.classList.add('flex');
      var details = form.closest('details');
      if (details) details.open = true;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.querySelector('#content').focus();
    });
  });

  cancelReplyBtn.addEventListener('click', function() {
    clearReply();
  });

  var savedName = localStorage.getItem('comment_authorName');
  var savedEmail = localStorage.getItem('comment_authorEmail');
  var visitorId = localStorage.getItem('comment_visitorId');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('comment_visitorId', visitorId);
  }
  var nameInput = form.querySelector('#authorName');
  var emailInput = form.querySelector('#authorEmail');
  if (nameInput && savedName) nameInput.value = savedName;
  if (emailInput && savedEmail) emailInput.value = savedEmail;

  var isLoggedIn = false;
  var loginPrompt = document.getElementById('comment-login-required');
  var detailsEl = form.closest('details');
  fetch('/auth/me', { credentials: 'include' }).then(function(r) { return r.json() }).then(function(d) {
    if (d && d.user) {
      isLoggedIn = true;
      if (loginPrompt) loginPrompt.classList.add('hidden');
      if (detailsEl) detailsEl.classList.remove('hidden');
      var u = d.user;
      if (nameInput) { nameInput.value = u.name; nameInput.closest('div').classList.add('hidden'); }
      if (emailInput) { emailInput.closest('div').classList.add('hidden'); }
      var loggedInAsTpl = section.getAttribute('data-logged-in-as') || '';
      var banner = document.createElement('div');
      banner.className = 'px-3 py-2 bg-gray-100 border border-gray-300 text-sm';
      banner.id = 'auth-user-banner';
      banner.textContent = loggedInAsTpl ? loggedInAsTpl.replace('{name}', u.name) : u.name;
      form.insertBefore(banner, form.firstChild);
    } else {
      if (loginPrompt) loginPrompt.classList.remove('hidden');
      if (detailsEl) detailsEl.classList.add('hidden');
    }
  }).catch(function() {
    if (loginPrompt) loginPrompt.classList.remove('hidden');
    if (detailsEl) detailsEl.classList.add('hidden');
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!isLoggedIn) {
      window.location.href = loginUrl;
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

    var authorName = isLoggedIn ? '' : (form.querySelector('#authorName').value.trim() || 'momo');
    var data = {
      authorName: authorName,
      authorEmail: isLoggedIn ? undefined : (form.querySelector('#authorEmail').value.trim() || undefined),
      visitorId: visitorId,
      content: form.querySelector('#content').value.trim()
    };
    var pid = parentInput.value;
    if (pid) data.parentId = pid;

    fetch(getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(res) {
      if (res.ok) {
        showToast(getMsg(), 'success');
        setTimeout(function() { window.location.reload(); }, 900);
      } else {
        return res.json().then(function(d) {
          showToast(d.error || getErr(), 'error');
        }).catch(function() {
          showToast(getErr(), 'error');
        });
      }
    }).catch(function() {
      showToast(getErr(), 'error');
    }).finally(function() {
      btn.disabled = false;
      btn.textContent = orig;
    });
  });
})();
      ` }} />
    </section>
  )
}

const PostNav: FC<{ prev: PostNav | null; next: PostNav | null; lang: Lang }> = ({ prev, next, lang }) => {
  if (!prev && !next) return <></>

  return (
    <nav class="mt-16 sm:mt-40 pt-3 border-t-2 border-black flex flex-col sm:flex-row gap-3 sm:justify-between">
      <div class="min-w-0">
        {prev && (
          <a href={langPath(`/posts/${prev.slug}`, lang)} class="text-sm font-bold text-black opacity-70 hover:opacity-100 no-underline transition-all inline-flex items-center gap-1.5 max-w-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
            <span class="truncate">{prev.title}</span>
          </a>
        )}
      </div>
      <div class="min-w-0">
        {next && (
          <a href={langPath(`/posts/${next.slug}`, lang)} class="text-sm font-bold text-black opacity-70 hover:opacity-100 no-underline transition-all inline-flex items-center gap-1.5 max-w-full justify-end text-right">
            <span class="truncate">{next.title}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </a>
        )}
      </div>
    </nav>
  )
}

const PostPage: FC<PostPageProps> = ({ lang, post, content, headings, comments, prev, next, authorProfile, collections }) => {
  const postUrl = langPath(`/posts/${post.slug}`, lang)
  const publishedTime = post.publishedAt ?? post.createdAt
  const modifiedTime = post.updatedAt !== publishedTime ? post.updatedAt : undefined
  const coverImageUrl = post.coverImageKey ? `/images/${post.coverImageKey}` : undefined
  const tagNames = post.tags.map((tag) => tag.name)
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = textContent ? countWords(textContent) : undefined

  return (
    <Layout
      title={post.title}
      description={post.excerpt || post.title}
      url={postUrl}
      image={coverImageUrl}
      type="article"
      tags={tagNames}
      authorProfile={authorProfile}
      sidebarExtra={collections && collections.length > 0 ? <SeriesCatalogSidebar collections={collections} currentPostId={post.id} lang={lang} /> : undefined}
      lang={lang}
      currentPath={`/posts/${post.slug}`}
      publishedTime={publishedTime}
      modifiedTime={modifiedTime}
      authorName="mrwuliu"
      extraHead={
        <>
          <ArticleSchema data={{
            title: post.title,
            description: post.excerpt || post.title,
            url: postUrl,
            datePublished: publishedTime,
            dateModified: modifiedTime,
            authorName: 'mrwuliu',
            imageUrl: coverImageUrl,
            tags: tagNames,
            lang,
            wordCount,
          }} />
          <BreadcrumbSchema items={[
            { name: lang === 'zh' ? '首页' : 'Home', url: langPath('/', lang) },
            { name: lang === 'zh' ? '文章' : 'Writings', url: langPath('/writings', lang) },
            { name: post.title, url: postUrl },
          ]} />
        </>
      }
    >
      <article>
        <h1 class="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">{post.title}</h1>
        <div class="mt-4 mb-4 flex flex-wrap items-center gap-3 sm:gap-4">
          <time datetime={post.publishedAt ?? ''} class="text-xs font-bold uppercase tracking-widest opacity-50">
            {formatDateLang(post.publishedAt, lang)}
          </time>
          {modifiedTime && (
            <span class="text-xs font-bold uppercase tracking-widest opacity-30">
              {lang === 'zh' ? `更新于 ${formatDateLang(modifiedTime, lang)}` : `Updated ${formatDateLang(modifiedTime, lang)}`}
            </span>
          )}
          {post.tags.length > 0 && (
            <ul class="flex flex-wrap gap-1.5 list-none p-0 m-0">
              {post.tags.map((pt) => (
                <li class="m-0">
                  <a class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline" href={langPath(`/tags/${pt.slug}`, lang)}>{pt.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="post-body-divider mb-3" />

        {collections && collections.length > 0 && (
          <div class="mb-8 border border-black rounded-none p-4 lg:hidden">
            {collections.map(collection => (
              <div key={collection.id} class="mb-4 last:mb-0">
                <h3 class="text-sm font-medium uppercase tracking-widest text-gray-500 mb-2">
                  <a href={langPath('/series/' + collection.slug, lang)} class="hover:text-black transition-colors no-underline text-gray-500">
                    {lang === 'en' && collection.nameEn ? collection.nameEn : collection.name}
                  </a>
                </h3>
                <ol class="space-y-1">
                  {collection.posts.map((cp, index) => (
                    <li key={cp.id}>
                      <a href={langPath('/posts/' + cp.slug, lang)}
                         class={`text-sm no-underline transition-colors ${cp.id === post.id ? 'font-bold text-black' : 'text-gray-600 hover:text-black'}`}>
                        {index + 1}. {cp.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        <Toc headings={headings} lang={lang} />

        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var toc = document.getElementById('toc-nav');
  if (!toc) return;
  toc.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href[0] !== '#') return;
    var target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', href);
  });
})();
        ` }} />

        <div
          class="post-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  function label(kind) {
    if (typeof window.__t === 'function') {
      if (kind === 'copy') return window.__t('post.copyCode') || 'Copy';
      if (kind === 'copied') return window.__t('post.copiedCode') || 'Copied';
      return window.__t('post.copyCodeFailed') || 'Failed';
    }
    return kind === 'copy' ? 'Copy' : kind === 'copied' ? 'Copied' : 'Failed';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        if (ok) resolve();
        else reject(new Error('copy failed'));
      } catch (e) {
        reject(e);
      }
    });
  }

  function mountCopyButtons() {
    var blocks = document.querySelectorAll('.post-content pre');
    blocks.forEach(function(pre) {
      if (pre.querySelector('.code-copy-btn')) return;
      var code = pre.querySelector('code');
      if (!code) return;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.textContent = label('copy');

      btn.addEventListener('click', function() {
        var text = code.textContent || '';
        copyText(text).then(function() {
          btn.textContent = label('copied');
          btn.classList.remove('is-failed');
          btn.classList.add('is-copied');
          setTimeout(function() {
            btn.textContent = label('copy');
            btn.classList.remove('is-copied');
          }, 1400);
        }).catch(function() {
          btn.textContent = label('failed');
          btn.classList.add('is-failed');
          setTimeout(function() {
            btn.textContent = label('copy');
            btn.classList.remove('is-failed');
          }, 1400);
        });
      });

      pre.appendChild(btn);
    });
  }

  function refreshCopyButtonLabels() {
    document.querySelectorAll('.post-content .code-copy-btn').forEach(function(btn) {
      if (btn.classList.contains('is-copied') || btn.classList.contains('is-failed')) return;
      btn.textContent = label('copy');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      mountCopyButtons();
      refreshCopyButtonLabels();
    });
  } else {
    mountCopyButtons();
    refreshCopyButtonLabels();
  }

  var html = document.documentElement;
  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === 'lang') {
        refreshCopyButtonLabels();
        break;
      }
    }
  });
  observer.observe(html, { attributes: true, attributeFilter: ['lang'] });
})();
       ` }} />

        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var sources = document.querySelectorAll('.post-content .mermaid-source');
  if (!sources.length) return;

  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
  s.onload = function() {
    var baseConfig = { startOnLoad: false, theme: 'base', look: 'handDrawn', securityLevel: 'strict' };
    var defaultVars = {
      fontFamily: '"Nunito", sans-serif', fontSize: '14px',
      primaryColor: '#eef2f7', primaryTextColor: '#2d3748', primaryBorderColor: '#94a3b8',
      lineColor: '#94a3b8', secondaryColor: '#f1f5f9', tertiaryColor: '#ffffff',
      background: '#fafafa', mainBkg: '#eef2f7', nodeBorder: '#94a3b8',
      clusterBkg: '#f8fafc', clusterBorder: '#94a3b8', titleColor: '#2d3748',
      edgeLabelBackground: '#f8fafc', nodeTextColor: '#2d3748', nodeBorderRadius: '12px',
    };
    var nodePalette = [
      { bg: '#FF6B6B', border: '#D94848', text: '#ffffff' },
      { bg: '#FFB347', border: '#E09530', text: '#ffffff' },
      { bg: '#6BCB77', border: '#4FAF5B', text: '#ffffff' },
      { bg: '#4D96FF', border: '#3078E0', text: '#ffffff' },
      { bg: '#9B72CF', border: '#7D52B0', text: '#ffffff' },
      { bg: '#FF6EB4', border: '#D94E94', text: '#ffffff' },
      { bg: '#45D4C8', border: '#28B5A9', text: '#ffffff' },
      { bg: '#FFD93D', border: '#E0BC20', text: '#ffffff' },
    ];

    mermaid.initialize(Object.assign({}, baseConfig, { themeVariables: defaultVars }));

    sources.forEach(function(el) {
      if (el.classList.contains('mermaid-rendered')) return;
      var rawCode = el.getAttribute('data-mermaid');
      if (!rawCode) return;
      var look = 'handDrawn';
      var allNodeIds = {};
      var m;
      var isSequence = /^\\s*sequenceDiagram\\b/mi.test(rawCode);
      if (isSequence) {
        var pParticipant = /^\\s*participant\\s+(\\S+)/gmi;
        while ((m = pParticipant.exec(rawCode)) !== null) allNodeIds[m[1]] = true;
        var pActor = /^\\s*actor\\s+(\\S+)/gmi;
        while ((m = pActor.exec(rawCode)) !== null) allNodeIds[m[1]] = true;
        var pArrow = /(\\w+)\\s*[+-]?\\s*(?:-{1,2}>{1,2}|--?x|--?\\))\\s*[+-]?\\s*(\\w+)/g;
        while ((m = pArrow.exec(rawCode)) !== null) {
          allNodeIds[m[1]] = true;
          allNodeIds[m[2]] = true;
        }
      } else {
        var p1 = /\\b([A-Za-z_][A-Za-z0-9_]*)\\s*[\\[\\{(]/g;
        while ((m = p1.exec(rawCode)) !== null) allNodeIds[m[1]] = true;
        var p2 = /(?:-->|---)\\s*(?:\\|[^|]*\\|\\s*)?([A-Za-z_][A-Za-z0-9_]*)/g;
        while ((m = p2.exec(rawCode)) !== null) allNodeIds[m[1]] = true;
      }
      var nodeIds = Object.keys(allNodeIds);
      var styleLines = '';
      if (!isSequence) {
        nodeIds.forEach(function(nid, i) {
          var c = nodePalette[i % nodePalette.length];
          styleLines += '\\nstyle ' + nid + ' fill:' + c.bg + ',stroke:' + c.border + ',color:' + c.text + ',font-weight:bold';
        });
      }
      var seqColors = { bkgColorArray: nodePalette.map(function(c){ return c.bg + '33'; }), borderColorArray: nodePalette.map(function(c){ return c.border; }) };
      var initTheme = isSequence ? 'redux-color' : 'base';
      var initVars = isSequence ? Object.assign({}, defaultVars, seqColors) : defaultVars;
      var initDir = '%%{init:' + JSON.stringify({ theme: initTheme, look: look, themeVariables: initVars }) + '}%%\\n';
      var code = initDir + rawCode + styleLines;
      var id = 'mermaid-' + Math.random().toString(36).substring(2, 10);
      mermaid.render(id, code).then(function(result) {
        var wrapper = document.createElement('div');
        wrapper.className = 'mermaid-diagram';
        wrapper.innerHTML = result.svg;
        var loading = el.querySelector('.mermaid-loading');
        if (loading) loading.style.display = 'none';
        el.insertBefore(wrapper, el.querySelector('pre'));
        el.classList.add('mermaid-rendered');
      }).catch(function() {
        var loading = el.querySelector('.mermaid-loading');
        if (loading) loading.style.display = 'none';
        var pre = el.querySelector('pre');
        if (pre) pre.style.display = '';
      });
    });
  };
  document.head.appendChild(s);
})();
        ` }} />

        {/* Scroll depth tracking */}
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var postId = '${post.id}';
  var maxDepth = 0;

  function getDepth() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h <= 0) return 100;
    return Math.round((window.scrollY / h) * 100);
  }

  function send(depth) {
    var payload = JSON.stringify({ postId: postId, scrollDepth: depth });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/scroll', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/scroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function(){});
    }
  }

  var timer;
  window.addEventListener('scroll', function() {
    var d = getDepth();
    if (d > maxDepth) maxDepth = d;
    clearTimeout(timer);
    timer = setTimeout(function() { send(maxDepth); }, 2000);
  }, { passive: true });

  window.addEventListener('beforeunload', function() {
    var d = getDepth();
    if (d > maxDepth) maxDepth = d;
    if (maxDepth > 0) send(maxDepth);
  });
})();
        ` }} />
       </article>

      <PostNav prev={prev} next={next} lang={lang} />

      <CommentSection comments={comments} postSlug={post.slug} lang={lang} />

      <button
        type="button"
        id="back-to-top"
        aria-label={t(lang, 'post.backToTop')}
        data-aria-zh={t('zh', 'post.backToTop')}
        data-aria-en={t('en', 'post.backToTop')}
        class="fixed bottom-6 right-6 z-40 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-white border border-black rounded-none opacity-0 pointer-events-none transition-opacity duration-300 hover:bg-black hover:text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
      </button>
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var btn = document.getElementById('back-to-top');
  if (!btn) return;

  function updateAria() {
    var l = (window.__cur === 'en') ? 'en' : 'zh';
    var v = btn.getAttribute('data-aria-' + l);
    if (v) btn.setAttribute('aria-label', v);
  }
  updateAria();
  var html = document.documentElement;
  var observer = new MutationObserver(function() { updateAria(); });
  observer.observe(html, { attributes: true, attributeFilter: ['lang'] });

  function onScroll() {
    if (window.scrollY > 400) {
      btn.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      btn.classList.add('opacity-0', 'pointer-events-none');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
      ` }} />
    </Layout>
  )
}

export default PostPage
