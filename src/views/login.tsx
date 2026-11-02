import { scriptJson, safeNextPath } from '../utils/html'
import type { FC } from 'hono/jsx'
import Layout from './layout'
import { type Lang, t, langPath } from '../i18n'

type LoginPageProps = {
  lang: Lang
  nextPath?: string
}

const LoginPage: FC<LoginPageProps> = ({ lang, nextPath }) => {
  const next = safeNextPath(nextPath, langPath('/', lang))

  return (
    <Layout
      title={t(lang, 'login.title')}
      lang={lang}
      currentPath="/login"
      languageSwitchPath={`/login?next=${encodeURIComponent(next)}`}
      extraHead={<meta name="robots" content="noindex, nofollow" />}
    >
      <div class="login-panel grid grid-cols-1 lg:grid-cols-2">
        {/* Left panel — decorative SVG illustration */}
        <div class="login-art hidden lg:flex items-center justify-center px-12 py-8 relative overflow-hidden">
          <svg viewBox="0 0 400 540" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" class="w-full h-auto relative z-10" style="max-width: 14rem; max-height: 260px;">
            {/* Concentric arcs — focal rhythm */}
            <circle cx="200" cy="200" r="160" stroke-width="0.5" opacity="0.15" />
            <circle cx="200" cy="200" r="120" stroke-width="0.5" opacity="0.2" />
            <circle cx="200" cy="200" r="80" stroke-width="1" opacity="0.3" />
            {/* Bold focal circle */}
            <circle cx="200" cy="200" r="48" stroke-width="2.5" />
            <circle cx="200" cy="200" r="6" fill="currentColor" stroke="none" />
            {/* Offset ghost circle for depth */}
            <circle cx="214" cy="186" r="48" stroke-width="1" opacity="0.15" stroke-dasharray="3 4" />
            {/* Bold vertical accent */}
            <rect x="56" y="80" width="3" height="200" fill="currentColor" stroke="none" />
            {/* Triangle accent — Bauhaus energy */}
            <path d="M 280 380 L 340 460 L 220 460 Z" stroke-width="1.5" opacity="0.7" />
            <path d="M 280 380 L 340 460" stroke-width="3" opacity="1" />
            {/* Document card — tilted, layered */}
            <g transform="rotate(-4 150 380)">
              <rect x="70" y="320" width="160" height="120" fill="var(--surface)" stroke-width="2" />
              <rect x="76" y="326" width="160" height="120" fill="none" stroke-width="0.5" opacity="0.2" />
              <line x1="90" y1="350" x2="200" y2="350" stroke-width="1" opacity="0.5" />
              <line x1="90" y1="370" x2="180" y2="370" stroke-width="0.8" opacity="0.4" />
              <line x1="90" y1="390" x2="210" y2="390" stroke-width="0.8" opacity="0.4" />
              <line x1="90" y1="410" x2="160" y2="410" stroke-width="0.8" opacity="0.3" />
              {/* Folded corner */}
              <path d="M 210 320 L 230 320 L 230 340 Z" fill="currentColor" stroke="none" opacity="0.08" />
            </g>
            {/* Crosshair marks */}
            <line x1="200" y1="16" x2="200" y2="30" stroke-width="1.5" />
            <line x1="200" y1="0" x2="200" y2="10" stroke-width="0.5" opacity="0.4" />
            <line x1="370" y1="200" x2="384" y2="200" stroke-width="1.5" />
            <line x1="386" y1="200" x2="396" y2="200" stroke-width="0.5" opacity="0.4" />
            {/* Small dots — constellation */}
            <circle cx="350" cy="100" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="60" cy="320" r="2" fill="currentColor" stroke="none" />
            <circle cx="340" cy="280" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="90" cy="130" r="1.5" fill="currentColor" stroke="none" />
            {/* Diagonal fine line — movement */}
            <line x1="56" y1="500" x2="140" y2="440" stroke-width="0.5" opacity="0.3" />
            <line x1="260" y1="80" x2="330" y2="40" stroke-width="0.5" opacity="0.3" />
            {/* Small square — anchor */}
            <rect x="48" y="496" width="16" height="16" fill="currentColor" stroke="none" />
            {/* Envelope hint — auth theme */}
            <rect x="300" y="490" width="60" height="36" stroke-width="1.5" opacity="0.6" />
            <path d="M 300 490 L 330 508 L 360 490" stroke-width="1.5" opacity="0.6" />
          </svg>
          {/* Background texture dots */}
          <div class="absolute inset-0" style="opacity: 0.03; background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px;" />
        </div>

        {/* Login-flow animations — fire when JS removes .hidden (display:none → block restarts the animation) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes login-step-in {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes login-msg-in {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          #login-step-email:not(.hidden),
          #login-step-code:not(.hidden) {
            animation: login-step-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          }
          #login-error:not(.hidden),
          #login-success:not(.hidden) {
            animation: login-msg-in 0.3s ease-out;
          }
          @media (prefers-reduced-motion: reduce) {
            #login-step-email:not(.hidden),
            #login-step-code:not(.hidden),
            #login-error:not(.hidden),
            #login-success:not(.hidden) {
              animation: none;
            }
          }
          #login-send-btn:active:not(:disabled),
          #login-verify-btn:active:not(:disabled),
          #login-back-btn:active:not(:disabled) {
            transform: scale(0.98);
          }
        `}} />

        {/* Right panel — login form */}
        <div class="flex flex-col justify-center px-6 py-8 sm:px-12 lg:px-16 xl:px-20">
          <div class="w-full max-w-sm mx-auto">
            <h1 class="text-xl font-bold text-black mb-1 tracking-tight">{t(lang, 'login.title')}</h1>
            <p class="text-sm text-gray-500 mb-8">{t(lang, 'login.subtitle')}</p>

            <form id="login-step-email" class="space-y-4">
              <div>
                <label for="login-email" class="block text-xs font-bold uppercase tracking-widest text-black mb-2">{t(lang, 'login.emailLabel')}</label>
                <input
                  type="email"
                  id="login-email"
                  required
                  maxlength={254}
                  autocomplete="email"
                  class="w-full px-3 py-2.5 border border-black text-sm bg-white text-black transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 focus:border-black"
                  placeholder={t(lang, 'login.emailPlaceholder')}
                  data-t="login.emailPlaceholder"
                  data-placeholder="login.emailPlaceholder"
                />
              </div>
              <button
                type="submit"
                id="login-send-btn"
                class="w-full py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-all duration-200"
              >
                {t(lang, 'login.sendCode')}
              </button>
            </form>

            <form id="login-step-code" class="space-y-4 hidden">
              <div>
                <label for="login-code" class="block text-xs font-bold uppercase tracking-widest text-black mb-2">{t(lang, 'login.codeLabel')}</label>
                <input
                  type="text"
                  id="login-code"
                  required
                  inputmode="numeric"
                  pattern="\d{6}"
                  maxlength={6}
                  autocomplete="one-time-code"
                  class="w-full px-3 py-2.5 border border-black text-sm bg-white text-black text-center text-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 focus:border-black"
                  style="letter-spacing: 0.5em;"
                  placeholder={t(lang, 'login.codePlaceholder')}
                  data-t="login.codePlaceholder"
                  data-placeholder="login.codePlaceholder"
                />
                <p id="login-code-hint" class="text-xs text-gray-500 mt-2"></p>
                <p class="text-xs text-gray-500 mt-2">{t(lang, 'login.codeSentDesc')}</p>
              </div>
              <button
                type="submit"
                id="login-verify-btn"
                class="w-full py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-all duration-200"
              >
                {t(lang, 'login.verify')}
              </button>
              <button type="button" id="login-resend-btn" class="w-full text-xs font-bold text-black hover:opacity-70 transition-all duration-200">
                {t(lang, 'login.resend')}
              </button>
              <button
                type="button"
                id="login-back-btn"
                class="w-full text-xs text-gray-500 hover:text-black transition-all duration-200"
              >
                {t(lang, 'login.changeEmail')}
              </button>
            </form>

            <div id="login-error" role="alert" class="mt-4 text-sm text-red-600 hidden"></div>
            <div id="login-success" role="status" class="mt-4 text-sm text-green-600 hidden"></div>

            <div class="mt-8">
              <a href={langPath('/', lang)} data-thref="/" class="text-xs text-gray-500 hover:text-black transition-all">{t(lang, 'login.backHome')}</a>
            </div>
          </div>
        </div>
      </div>

        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var emailStep = document.getElementById('login-step-email');
            var codeStep = document.getElementById('login-step-code');
            var emailInput = document.getElementById('login-email');
            var codeInput = document.getElementById('login-code');
            var sendBtn = document.getElementById('login-send-btn');
            var verifyBtn = document.getElementById('login-verify-btn');
            var backBtn = document.getElementById('login-back-btn');
            var errorDiv = document.getElementById('login-error');
            var successDiv = document.getElementById('login-success');
            var codeHint = document.getElementById('login-code-hint');
            var nextPath = ${scriptJson(next)};
            var currentEmail = '';
            var resendBtn = document.getElementById('login-resend-btn');
            var resendTimer = null;
            var sending = false;
            var verifying = false;
            var loggedIn = false;
            var resendAt = 0;
            var pendingEmail = '';
            var cooldowns = {};
            try { cooldowns = JSON.parse(sessionStorage.getItem('login-cooldowns') || '{}') || {}; } catch (e) {}
            try { pendingEmail = sessionStorage.getItem('login-pending-email') || ''; } catch (e) {}

            function showError(msg) {
              errorDiv.textContent = msg;
              errorDiv.classList.remove('hidden');
              successDiv.classList.add('hidden');
            }
            function showSuccess(msg) {
              successDiv.textContent = msg;
              successDiv.classList.remove('hidden');
              errorDiv.classList.add('hidden');
            }
            function hideMsg() {
              errorDiv.classList.add('hidden');
              successDiv.classList.add('hidden');
            }
            function getMsg(key) { return __t(key); }
            function updateButtons() {
              var remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
              var canContinue = emailInput.value.trim().toLowerCase() === pendingEmail && remaining > 0;
              sendBtn.disabled = sending || verifying || loggedIn || (remaining > 0 && !canContinue);
              resendBtn.disabled = sending || verifying || loggedIn || remaining > 0;
              verifyBtn.disabled = sending || verifying || loggedIn;
              backBtn.disabled = sending || verifying || loggedIn;
              sendBtn.style.opacity = sendBtn.disabled ? '0.5' : '';
              resendBtn.style.opacity = resendBtn.disabled ? '0.5' : '';
              sendBtn.textContent = sending ? getMsg('login.sending') : canContinue ? getMsg('login.continueCode') : remaining ? getMsg('login.resend') + ' (' + remaining + 's)' : getMsg('login.sendCode');
              resendBtn.textContent = sending ? getMsg('login.sending') : remaining ? getMsg('login.resend') + ' (' + remaining + 's)' : getMsg('login.resend');
              verifyBtn.textContent = loggedIn ? getMsg('login.redirecting') : verifying ? getMsg('login.verifying') : getMsg('login.verify');
            }
            function rememberCooldown(email, seconds) {
              cooldowns[email] = Date.now() + seconds * 1000;
              resendAt = cooldowns[email];
              try { sessionStorage.setItem('login-cooldowns', JSON.stringify(cooldowns)); } catch (e) {}
              updateButtons();
            }
            async function sendCode() {
              if (sending || verifying || loggedIn) return;
              var email = emailInput.value.trim().toLowerCase();
              if (!emailInput.checkValidity() || !email) {
                emailInput.reportValidity();
                return;
              }
              resendAt = Number(cooldowns[email]) || 0;
              if (emailStep.classList.contains('hidden') === false && email === pendingEmail && resendAt > Date.now()) {
                currentEmail = email;
                showCodeStep();
                return;
              }
              if (resendAt > Date.now()) { updateButtons(); return; }
              hideMsg();
              sending = true;
              updateButtons();
              try {
                var response = await fetch('/auth/otp/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: email, lang: __cur }),
                  signal: AbortSignal.timeout(20000)
                });
                var data = await response.json();
                if (response.ok) {
                  currentEmail = email;
                  pendingEmail = email;
                  try { sessionStorage.setItem('login-pending-email', email); } catch (e) {}
                  codeInput.value = '';
                  rememberCooldown(email, 60);
                  showCodeStep();
                } else if (data.error === 'rate_limited') {
                  rememberCooldown(email, Number(response.headers.get('Retry-After')) || 300);
                  showError(getMsg('login.rateLimited'));
                } else {
                  showError(getMsg('login.sendFailed'));
                }
              } catch (e) {
                showError(getMsg('login.sendFailed'));
              } finally {
                sending = false;
                updateButtons();
              }
            }
            async function verifyCode() {
              if (sending || verifying || loggedIn) return;
              var code = codeInput.value.trim();
              if (!/^[0-9]{6}$/.test(code)) {
                showError(getMsg('login.invalidCode'));
                codeInput.focus();
                return;
              }
              hideMsg();
              verifying = true;
              updateButtons();
              try {
                var response = await fetch('/auth/otp/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: currentEmail, code: code }),
                  signal: AbortSignal.timeout(20000)
                });
                var data = await response.json();
                if (response.ok) {
                  loggedIn = true;
                  try { sessionStorage.removeItem('login-pending-email'); } catch (e) {}
                  showSuccess(getMsg('login.loginSuccess'));
                  window.location.replace(nextPath);
                } else {
                  var key = data.error === 'rate_limited' ? 'login.rateLimited' : data.error === 'banned_user' ? 'login.bannedUser' : response.status >= 500 ? 'login.verifyFailed' : 'login.invalidCode';
                  showError(getMsg(key));
                  codeInput.focus();
                  codeInput.select();
                }
              } catch (e) {
                showError(getMsg('login.verifyFailed'));
              } finally {
                verifying = false;
                updateButtons();
              }
            }
            function backToEmail() {
              if (sending || verifying || loggedIn) return;
              codeStep.classList.add('hidden');
              emailStep.classList.remove('hidden');
              codeInput.value = '';
              hideMsg();
              emailInput.focus();
              updateButtons();
            }
            function showCodeStep() {
              emailStep.classList.add('hidden');
              codeStep.classList.remove('hidden');
              codeHint.textContent = getMsg('login.codeSent') + ' ' + currentEmail;
              hideMsg();
              codeInput.focus();
              updateButtons();
            }
            emailStep.addEventListener('submit', function(e) { e.preventDefault(); sendCode(); });
            codeStep.addEventListener('submit', function(e) { e.preventDefault(); verifyCode(); });
            resendBtn.addEventListener('click', sendCode);
            backBtn.addEventListener('click', backToEmail);
            emailInput.addEventListener('input', function() {
              resendAt = Number(cooldowns[emailInput.value.trim().toLowerCase()]) || 0;
              updateButtons();
            });
            resendTimer = setInterval(updateButtons, 1000);
            window.addEventListener('pagehide', function() { clearInterval(resendTimer); });
            if (pendingEmail) {
              emailInput.value = pendingEmail;
              currentEmail = pendingEmail;
              resendAt = Number(cooldowns[pendingEmail]) || 0;
              showCodeStep();
            }
            updateButtons();
          })();
        `}} />
    </Layout>
  )
}

export default LoginPage
