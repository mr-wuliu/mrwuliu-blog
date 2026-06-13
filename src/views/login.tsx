import type { FC } from 'hono/jsx'
import Layout from './layout'
import { type Lang, t, langPath } from '../i18n'

type LoginPageProps = {
  lang: Lang
  nextPath?: string
}

const LoginPage: FC<LoginPageProps> = ({ lang, nextPath }) => {
  const loginPath = langPath('/login', lang)
  const next = nextPath || langPath('/', lang)

  return (
    <Layout
      title={t(lang, 'login.title')}
      lang={lang}
      currentPath={loginPath}
    >
      <div class="grid grid-cols-1 lg:grid-cols-2 border border-black bg-white overflow-hidden max-w-4xl mx-auto">
        {/* Left panel — decorative SVG illustration */}
        <div class="hidden lg:flex items-center justify-center bg-neutral-50 border-r border-black px-12 py-8 relative overflow-hidden">
          <svg viewBox="0 0 400 540" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#0a0a0a" class="w-full h-auto relative z-10" style="max-width: 14rem; max-height: 260px;">
            {/* Concentric arcs — focal rhythm */}
            <circle cx="200" cy="200" r="160" stroke-width="0.5" opacity="0.15" />
            <circle cx="200" cy="200" r="120" stroke-width="0.5" opacity="0.2" />
            <circle cx="200" cy="200" r="80" stroke-width="1" opacity="0.3" />
            {/* Bold focal circle */}
            <circle cx="200" cy="200" r="48" stroke-width="2.5" />
            <circle cx="200" cy="200" r="6" fill="#0a0a0a" stroke="none" />
            {/* Offset ghost circle for depth */}
            <circle cx="214" cy="186" r="48" stroke-width="1" opacity="0.15" stroke-dasharray="3 4" />
            {/* Bold vertical accent */}
            <rect x="56" y="80" width="3" height="200" fill="#0a0a0a" stroke="none" />
            {/* Triangle accent — Bauhaus energy */}
            <path d="M 280 380 L 340 460 L 220 460 Z" stroke-width="1.5" opacity="0.7" />
            <path d="M 280 380 L 340 460" stroke-width="3" opacity="1" />
            {/* Document card — tilted, layered */}
            <g transform="rotate(-4 150 380)">
              <rect x="70" y="320" width="160" height="120" fill="#ffffff" stroke-width="2" />
              <rect x="76" y="326" width="160" height="120" fill="none" stroke-width="0.5" opacity="0.2" />
              <line x1="90" y1="350" x2="200" y2="350" stroke-width="1" opacity="0.5" />
              <line x1="90" y1="370" x2="180" y2="370" stroke-width="0.8" opacity="0.4" />
              <line x1="90" y1="390" x2="210" y2="390" stroke-width="0.8" opacity="0.4" />
              <line x1="90" y1="410" x2="160" y2="410" stroke-width="0.8" opacity="0.3" />
              {/* Folded corner */}
              <path d="M 210 320 L 230 320 L 230 340 Z" fill="#0a0a0a" stroke="none" opacity="0.08" />
            </g>
            {/* Crosshair marks */}
            <line x1="200" y1="16" x2="200" y2="30" stroke-width="1.5" />
            <line x1="200" y1="0" x2="200" y2="10" stroke-width="0.5" opacity="0.4" />
            <line x1="370" y1="200" x2="384" y2="200" stroke-width="1.5" />
            <line x1="386" y1="200" x2="396" y2="200" stroke-width="0.5" opacity="0.4" />
            {/* Small dots — constellation */}
            <circle cx="350" cy="100" r="2.5" fill="#0a0a0a" stroke="none" />
            <circle cx="60" cy="320" r="2" fill="#0a0a0a" stroke="none" />
            <circle cx="340" cy="280" r="1.5" fill="#0a0a0a" stroke="none" />
            <circle cx="90" cy="130" r="1.5" fill="#0a0a0a" stroke="none" />
            {/* Diagonal fine line — movement */}
            <line x1="56" y1="500" x2="140" y2="440" stroke-width="0.5" opacity="0.3" />
            <line x1="260" y1="80" x2="330" y2="40" stroke-width="0.5" opacity="0.3" />
            {/* Small square — anchor */}
            <rect x="48" y="496" width="16" height="16" fill="#0a0a0a" stroke="none" />
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

            <div id="login-step-email" class="space-y-4">
              <div>
                <label for="login-email" class="block text-xs font-bold uppercase tracking-widest text-black mb-2">{t(lang, 'login.emailLabel')}</label>
                <input
                  type="email"
                  id="login-email"
                  autocomplete="email"
                  class="w-full px-3 py-2.5 border border-black text-sm bg-white text-black transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 focus:border-black"
                  placeholder={t(lang, 'login.emailPlaceholder')}
                  data-t="login.emailPlaceholder"
                  data-placeholder="login.emailPlaceholder"
                />
              </div>
              <button
                type="button"
                id="login-send-btn"
                class="w-full py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-all duration-200"
              >
                {t(lang, 'login.sendCode')}
              </button>
            </div>

            <div id="login-step-code" class="space-y-4 hidden">
              <div>
                <label for="login-code" class="block text-xs font-bold uppercase tracking-widest text-black mb-2">{t(lang, 'login.codeLabel')}</label>
                <input
                  type="text"
                  id="login-code"
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
              </div>
              <button
                type="button"
                id="login-verify-btn"
                class="w-full py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-all duration-200"
              >
                {t(lang, 'login.verify')}
              </button>
              <button
                type="button"
                id="login-back-btn"
                class="w-full text-xs text-gray-500 hover:text-black transition-all duration-200"
              >
                {t(lang, 'login.changeEmail')}
              </button>
            </div>

            <div id="login-error" class="mt-4 text-sm text-red-600 hidden"></div>
            <div id="login-success" class="mt-4 text-sm text-green-600 hidden"></div>

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
            var nextPath = ${JSON.stringify(next)};
            var lang = ${JSON.stringify(lang)};
            var currentEmail = '';
            var resendTimer = null;

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
            function getMsg(key) {
              var d = lang === 'zh' ? __zh : __en;
              return d[key] || '';
            }

            function startResendCountdown(seconds) {
              var remaining = seconds;
              sendBtn.disabled = true;
              sendBtn.style.opacity = '0.5';
              function update() {
                if (remaining <= 0) {
                  sendBtn.disabled = false;
                  sendBtn.style.opacity = '';
                  sendBtn.textContent = getMsg('login.resend');
                  clearInterval(resendTimer);
                  return;
                }
                sendBtn.textContent = getMsg('login.resend') + ' (' + remaining + 's)';
                remaining--;
              }
              update();
              resendTimer = setInterval(update, 1000);
            }

            function sendCode() {
              var email = emailInput.value.trim().toLowerCase();
              if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
                showError(getMsg('login.invalidEmail'));
                return;
              }
              hideMsg();
              sendBtn.disabled = true;
              sendBtn.textContent = getMsg('login.sending');

              fetch('/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, lang: lang })
              }).then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d } }) })
                .then(function(result) {
                  sendBtn.disabled = false;
                  sendBtn.textContent = getMsg('login.sendCode');
                  if (result.ok) {
                    currentEmail = email;
                    emailStep.classList.add('hidden');
                    codeStep.classList.remove('hidden');
                    codeHint.textContent = getMsg('login.codeSent') + ' ' + email;
                    codeInput.focus();
                    startResendCountdown(60);
                  } else if (result.data.error === 'rate_limited') {
                    showError(getMsg('login.rateLimited'));
                  } else {
                    showError(getMsg('login.sendFailed'));
                  }
                })
                .catch(function() {
                  sendBtn.disabled = false;
                  sendBtn.textContent = getMsg('login.sendCode');
                  showError(getMsg('login.sendFailed'));
                });
            }

            function verifyCode() {
              var code = codeInput.value.trim();
              if (!/^\\d{6}$/.test(code)) {
                showError(getMsg('login.invalidCode'));
                return;
              }
              hideMsg();
              verifyBtn.disabled = true;
              verifyBtn.textContent = getMsg('login.verifying');

              fetch('/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, code: code })
              }).then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d } }) })
                .then(function(result) {
                  verifyBtn.disabled = false;
                  verifyBtn.textContent = getMsg('login.verify');
                  if (result.ok) {
                    showSuccess(getMsg('login.loginSuccess'));
                    setTimeout(function() {
                      window.location.href = nextPath;
                    }, 500);
                  } else if (result.data.error === 'rate_limited') {
                    showError(getMsg('login.rateLimited'));
                  } else {
                    showError(getMsg('login.invalidCode'));
                    codeInput.value = '';
                    codeInput.focus();
                  }
                })
                .catch(function() {
                  verifyBtn.disabled = false;
                  verifyBtn.textContent = getMsg('login.verify');
                  showError(getMsg('login.invalidCode'));
                });
            }

            function backToEmail() {
              codeStep.classList.add('hidden');
              emailStep.classList.remove('hidden');
              codeInput.value = '';
              hideMsg();
              if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
              sendBtn.disabled = false;
              sendBtn.style.opacity = '';
              sendBtn.textContent = getMsg('login.sendCode');
              emailInput.focus();
            }

            sendBtn.addEventListener('click', sendCode);
            verifyBtn.addEventListener('click', verifyCode);
            backBtn.addEventListener('click', backToEmail);

            emailInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); sendCode(); } });
            codeInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); verifyCode(); } });
          })();
        `}} />
    </Layout>
  )
}

export default LoginPage
