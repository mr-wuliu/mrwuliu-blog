import type { FC } from 'hono/jsx'
import Layout from './layout'
import { type Lang, t, langPath } from '../i18n'
import { userAvatarHtml } from '../utils/avatar'
import type { SessionUser } from '../services/auth'

type SettingsPageProps = {
  lang: Lang
  user: SessionUser
}

const SettingsPage: FC<SettingsPageProps> = ({ lang, user }) => {
  return (
    <Layout
      title={t(lang, 'settings.title')}
      lang={lang}
      currentPath={langPath('/settings', lang)}
    >
      <div class="max-w-md mx-auto">
        <h1 class="text-xl font-bold text-black mb-8 tracking-tight">{t(lang, 'settings.title')}</h1>

        <div class="space-y-8">
          {/* Avatar */}
          <section>
            <h2 class="block text-xs font-bold uppercase tracking-widest text-black mb-4">{t(lang, 'settings.avatar')}</h2>
            <div
              id="settings-avatar"
              class="h-20 w-20 border border-black overflow-hidden flex-shrink-0 mb-4"
              style="line-height:0;font-size:0"
              dangerouslySetInnerHTML={{ __html: userAvatarHtml({
                avatarType: user.avatarType,
                avatarR2Key: user.avatarR2Key,
                email: user.email,
                avatarSeed: user.avatarSeed,
                id: user.id,
              }, 80) }}
            />
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{t(lang, 'settings.avatarSource')}</p>
            <div class="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                id="avatar-source-identicon"
                data-source="identicon"
                class="avatar-source-btn px-3 py-2 border border-black text-xs font-bold uppercase tracking-widest text-black bg-white hover:bg-black hover:text-white transition-all duration-200"
              >
                {t(lang, 'settings.randomAvatar')}
              </button>
              <button
                type="button"
                id="avatar-regenerate"
                class="px-3 py-2 border border-black text-xs font-bold uppercase tracking-widest text-black bg-white hover:bg-black hover:text-white transition-all duration-200"
              >
                {t(lang, 'settings.changeAvatar')}
              </button>
              <button
                type="button"
                id="avatar-source-gravatar"
                data-source="gravatar"
                class="avatar-source-btn px-3 py-2 border border-black text-xs font-bold uppercase tracking-widest text-black bg-white hover:bg-black hover:text-white transition-all duration-200"
              >
                {t(lang, 'settings.useGravatar')}
              </button>
              <button
                type="button"
                id="avatar-source-uploaded"
                data-source="uploaded"
                class="avatar-source-btn px-3 py-2 border border-black text-xs font-bold uppercase tracking-widest text-black bg-white hover:bg-black hover:text-white transition-all duration-200"
              >
                {t(lang, 'settings.uploadAvatar')}
              </button>
            </div>
            <input
              type="file"
              id="settings-avatar-file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
            />
            <p class="text-xs text-gray-400">{t(lang, 'settings.uploadHint')}</p>
          </section>

          {/* Profile */}
          <section>
            <h2 class="block text-xs font-bold uppercase tracking-widest text-black mb-4">{t(lang, 'settings.profile')}</h2>
            <div class="space-y-4">
              <div class="flex flex-col gap-1">
                <label for="settings-name-input" class="text-xs font-bold uppercase tracking-widest text-gray-400">{t(lang, 'settings.name')}</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    id="settings-name-input"
                    maxlength={32}
                    value={user.name}
                    class="flex-1 px-3 py-2 border border-black text-sm text-black bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    id="settings-name-save"
                    class="px-4 py-2 border border-black text-xs font-bold uppercase tracking-widest text-black bg-white hover:bg-black hover:text-white transition-all duration-200"
                  >
                    {t(lang, 'settings.editName')}
                  </button>
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-widest text-gray-400">{t(lang, 'settings.email')}</span>
                <span class="text-sm text-black break-all">{user.email}</span>
              </div>
            </div>
          </section>

          {/* Reply notification preference */}
          <section>
            <h2 class="block text-xs font-bold uppercase tracking-widest text-black mb-4">{t(lang, 'settings.replyNotify')}</h2>
            <label class="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="settings-notify-reply"
                class="mt-1 h-4 w-4 border border-black accent-black cursor-pointer flex-shrink-0"
                checked={user.notifyOnReply}
              />
              <span class="text-sm text-black">{t(lang, 'settings.replyNotifyDesc')}</span>
            </label>
          </section>

          {/* Logout */}
          <section class="pt-4 border-t border-black">
            <button
              type="button"
              id="settings-logout"
              class="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-all"
            >
              {t(lang, 'nav.logout')}
            </button>
          </section>
        </div>

        <div id="settings-toast" class="mt-6 text-sm text-green-600 hidden"></div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          function identicon(seed, size) {
            function hashStr(s) {
              var h = 0x811c9dc5;
              for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
              return h >>> 0;
            }
            var h0 = hashStr(seed), h1 = hashStr(seed + '#1');
            var hue = (h0 % 360 + 360) % 360;
            var fg = 'hsl(' + hue + ',65%,55%)';
            var cells = [], gridSize = 5, cellSize = size / gridSize;
            for (var row = 0; row < gridSize; row++) {
              for (var col = 0; col < 3; col++) {
                var bit = (h1 >>> (row * 3 + col)) & 1;
                if (bit) {
                  var x = col * cellSize, y = row * cellSize;
                  cells.push('<rect x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="' + fg + '"/>');
                  if (col < 2) cells.push('<rect x="' + (gridSize - 1 - col) * cellSize + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="' + fg + '"/>');
                }
              }
            }
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" style="display:block">' + cells.join('') + '</svg>';
          }
          var lang = ${JSON.stringify(lang)};
          function getMsg(key) { var d = lang === 'zh' ? __zh : __en; return d[key] || ''; }
          var avatarBox = document.getElementById('settings-avatar');
          var regenBtn = document.getElementById('avatar-regenerate');
          var srcIdenticon = document.getElementById('avatar-source-identicon');
          var srcGravatar = document.getElementById('avatar-source-gravatar');
          var srcUploaded = document.getElementById('avatar-source-uploaded');
          var fileInput = document.getElementById('settings-avatar-file');
          var nameInput = document.getElementById('settings-name-input');
          var nameSave = document.getElementById('settings-name-save');
          var notifyInput = document.getElementById('settings-notify-reply');
          var logoutBtn = document.getElementById('settings-logout');
          var toast = document.getElementById('settings-toast');
          var toastTimer = null;
          var currentType = ${JSON.stringify(user.avatarType)};

          function showToast(msg) {
            toast.textContent = msg;
            toast.classList.remove('hidden');
            toast.classList.add('text-green-600');
            toast.classList.remove('text-red-600');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(function() { toast.classList.add('hidden'); }, 2500);
          }
          function showError(msg) {
            toast.textContent = msg;
            toast.classList.remove('hidden');
            toast.classList.add('text-red-600');
            toast.classList.remove('text-green-600');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(function() { toast.classList.add('hidden'); }, 2500);
          }
          function renderAvatar(u) {
            var seed = u.avatarSeed || u.id;
            if (u.avatarUrl) {
              var fb = 'data:image/svg+xml,' + encodeURIComponent(identicon(seed, 80));
              avatarBox.innerHTML = '<img src="' + u.avatarUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.onerror=null;this.src=\\'' + fb + '\\'" />';
            } else {
              avatarBox.innerHTML = identicon(seed, 80);
            }
          }
          function setActiveSource(type) {
            currentType = type;
            document.querySelectorAll('.avatar-source-btn').forEach(function(b) {
              var on = b.getAttribute('data-source') === type;
              if (on) { b.classList.add('bg-black','text-white'); b.classList.remove('bg-white','text-black'); }
              else { b.classList.remove('bg-black','text-white'); b.classList.add('bg-white','text-black'); }
            });
          }
          setActiveSource(currentType);

          function putSettings(payload) {
            return fetch('/auth/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(payload)
            }).then(function(r) { return r.json(); });
          }

          regenBtn.addEventListener('click', function() {
            regenBtn.disabled = true;
            var seed = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
            putSettings({ avatarType: 'identicon', avatarSeed: seed }).then(function(d) {
              regenBtn.disabled = false;
              if (d && d.user) { renderAvatar(d.user); setActiveSource('identicon'); showToast(getMsg('settings.saved')); }
              else { showError(getMsg('settings.error')); }
            }).catch(function() { regenBtn.disabled = false; showError(getMsg('settings.error')); });
          });

          srcIdenticon.addEventListener('click', function() {
            putSettings({ avatarType: 'identicon' }).then(function(d) {
              if (d && d.user) { renderAvatar(d.user); setActiveSource('identicon'); showToast(getMsg('settings.saved')); }
              else { showError(getMsg('settings.error')); }
            }).catch(function() { showError(getMsg('settings.error')); });
          });

          srcGravatar.addEventListener('click', function() {
            putSettings({ avatarType: 'gravatar' }).then(function(d) {
              if (d && d.user) { renderAvatar(d.user); setActiveSource('gravatar'); showToast(getMsg('settings.saved')); }
              else { showError(getMsg('settings.error')); }
            }).catch(function() { showError(getMsg('settings.error')); });
          });

          srcUploaded.addEventListener('click', function() { fileInput.click(); });
          fileInput.addEventListener('change', function() {
            var f = fileInput.files && fileInput.files[0];
            if (!f) return;
            if (f.size > 2 * 1024 * 1024) { fileInput.value = ''; showError(getMsg('settings.fileTooLarge')); return; }
            var fd = new FormData();
            fd.append('file', f);
            fetch('/auth/avatar', { method: 'POST', credentials: 'include', body: fd })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                fileInput.value = '';
                if (d && d.user) { renderAvatar(d.user); setActiveSource('uploaded'); showToast(getMsg('settings.saved')); }
                else { showError(d && d.error === 'file_too_large' ? getMsg('settings.fileTooLarge') : getMsg('settings.error')); }
              })
              .catch(function() { fileInput.value = ''; showError(getMsg('settings.error')); });
          });

          nameSave.addEventListener('click', function() {
            var name = nameInput.value.trim();
            if (!name) { showError(getMsg('settings.error')); return; }
            nameSave.disabled = true;
            putSettings({ name: name }).then(function(d) {
              nameSave.disabled = false;
              if (d && d.user) { nameInput.value = d.user.name; showToast(getMsg('settings.nameSaved')); }
              else { showError(getMsg('settings.error')); }
            }).catch(function() { nameSave.disabled = false; showError(getMsg('settings.error')); });
          });

          notifyInput.addEventListener('change', function() {
            var val = notifyInput.checked;
            putSettings({ notifyOnReply: val }).then(function(d) {
              if (d && d.user) { notifyInput.checked = d.user.notifyOnReply; showToast(getMsg('settings.saved')); }
              else { showError(getMsg('settings.error')); }
            }).catch(function() { showError(getMsg('settings.error')); });
          });

          logoutBtn.addEventListener('click', function() {
            fetch('/auth/logout', { method: 'POST', credentials: 'include' }).then(function() {
              window.location.href = ${JSON.stringify(langPath('/', lang))};
            }).catch(function() { window.location.href = ${JSON.stringify(langPath('/', lang))}; });
          });
        })();
      ` }} />
    </Layout>
  )
}

export default SettingsPage
