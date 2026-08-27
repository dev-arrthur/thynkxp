from pathlib import Path
import re

INDEX = Path('index.html')
html = INDEX.read_text(encoding='utf-8')

trusted = '''    <section class="trusted-section">
      <h2 class="trusted-title">Empresa que confia em nosso serviço.</h2>
      <div class="trusted-carousel">
        <div class="trusted-track">
          <img src="empresas/logo1.png" alt="Habi">
          <img src="empresas/logo1.png" alt="Habi">
          <img src="empresas/logo1.png" alt="Habi">
          <img src="empresas/logo1.png" alt="Habi">
          <img src="empresas/logo1.png" alt="Habi">
          <img src="empresas/logo1.png" alt="Habi">
        </div>
      </div>
    </section>'''
html, count = re.subn(r'    <section class="trusted-section">.*?    </section>', trusted, html, count=1, flags=re.S)
if count != 1:
    raise SystemExit('trusted-section not found')

css = r'''

    /* ===== THYNKXP PROJECTS — SPOTLIGHT EXPERIENCE ===== */
    #projetos.projects-section{position:relative;width:calc(100% - 48px)!important;max-width:1540px!important;margin:70px auto!important;padding:88px 54px 72px!important;transform:none!important;border-radius:38px;overflow:hidden;background:#0d0d0f!important;color:#fff!important;isolation:isolate}
    #projetos.projects-section::before{content:"";position:absolute;width:620px;height:620px;left:-260px;top:-280px;border-radius:50%;background:radial-gradient(circle,rgba(255,106,0,.25),transparent 68%);filter:blur(12px);pointer-events:none;z-index:-1}
    #projetos.projects-section::after{content:"PROJECTS / 01";position:absolute;right:42px;top:34px;color:rgba(255,255,255,.28);font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.22em;pointer-events:none}
    #projetos .projects-left{max-width:900px!important;margin:0 0 48px!important;text-align:left!important}
    #projetos .projects-left h2{color:#fff!important;font-size:clamp(42px,5.6vw,82px)!important;line-height:.91!important;letter-spacing:-3.5px!important;max-width:900px}
    #projetos .projects-left h2 span{background:linear-gradient(135deg,#ff9b2f,#ff6a00,#ffb45f);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    #projetos .projects-left p{color:rgba(255,255,255,.58)!important;max-width:620px!important;font-size:16px;line-height:1.65;margin:20px 0 24px!important}
    #projetos .projects-btn{box-shadow:0 16px 34px rgba(255,106,0,.24)}
    #projetos .projects-right.projects-carousel-infinite{margin:0!important}
    #projetos .projects-marquee{animation-duration:34s!important;gap:18px}
    #projetos .projects-loop-group{--projects-gap:18px;gap:var(--projects-gap)}
    #projetos .projects-carousel-infinite .project-card,#projetos .projects-carousel-infinite .project-card.featured-project{position:relative;flex:0 0 clamp(340px,34vw,500px)!important;width:clamp(340px,34vw,500px)!important;min-height:560px!important;padding:28px!important;border-radius:34px!important;border:1px solid rgba(255,255,255,.10)!important;background:#151518!important;box-shadow:0 30px 80px rgba(0,0,0,.30)!important;overflow:hidden}
    #projetos .projects-carousel-infinite .project-card:first-child{border-radius:34px!important}
    #projetos .projects-carousel-infinite .project-card.featured-project{background:linear-gradient(145deg,#ff8c00 0%,#ff5e00 55%,#c84600 100%)!important;box-shadow:0 32px 90px rgba(255,106,0,.25)!important}
    #projetos .project-image,#projetos .project-card.featured-project .project-image{opacity:1!important}
    #projetos .project-image::after{background:linear-gradient(180deg,rgba(0,0,0,.02) 12%,rgba(0,0,0,.78) 100%)!important}
    #projetos .project-card::before{content:"01";position:absolute;top:28px;right:28px;z-index:6;color:rgba(255,255,255,.62);font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:.12em}
    #projetos .project-card.featured-project::before{content:"02";color:rgba(255,255,255,.72)}
    #projetos .project-card::after{content:"↗"!important;left:24px!important;top:24px!important;width:44px!important;height:44px!important;color:#fff!important;background:rgba(255,255,255,.10)!important;border:1px solid rgba(255,255,255,.16)!important;backdrop-filter:blur(12px);font-size:17px!important}
    #projetos .project-copy{margin-top:auto;max-width:100%!important;padding-top:260px}
    #projetos .project-category{background:rgba(255,106,0,.88)!important;color:#fff!important;border:1px solid rgba(255,255,255,.14)}
    #projetos .project-copy h3{font-size:clamp(34px,4vw,56px)!important;letter-spacing:-2px!important;margin-bottom:10px!important}
    #projetos .project-copy p{color:rgba(255,255,255,.76)!important;max-width:390px!important;font-size:14px!important}
    #projetos .project-card:hover{transform:translateY(-10px) scale(1.012)!important;border-color:rgba(255,255,255,.20)!important}
    #projetos .project-card:hover::after{transform:rotate(8deg) scale(1.08)!important;background:rgba(255,106,0,.88)!important}
    @media(max-width:991px){#projetos.projects-section{width:calc(100% - 24px)!important;margin:40px 12px!important;padding:58px 18px 42px!important;border-radius:28px}#projetos.projects-section::after{right:20px;top:22px}#projetos .projects-left{padding:0!important;margin-bottom:20px!important;text-align:left!important}#projetos .projects-left h2{font-size:clamp(38px,11vw,58px)!important;letter-spacing:-2.2px!important}#projetos .projects-left p{font-size:14px}#projetos .projects-right.projects-carousel-infinite{margin:0!important}#projetos .projects-marquee{animation-duration:28s!important}#projetos .projects-carousel-infinite .project-card,#projetos .projects-carousel-infinite .project-card.featured-project{flex-basis:min(78vw,350px)!important;width:min(78vw,350px)!important;min-height:500px!important;padding:20px!important;border-radius:28px!important}#projetos .project-copy{padding-top:220px}#projetos .project-copy h3{font-size:38px!important}}

    /* ===== COOKIE CONSENT ===== */
    .thynk-cookie-banner{position:fixed;left:22px;right:22px;bottom:22px;z-index:10050;display:grid;grid-template-columns:1fr auto;gap:22px;align-items:center;max-width:1080px;margin:0 auto;padding:18px 20px;background:rgba(17,17,17,.96);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.28);backdrop-filter:blur(18px);transform:translateY(130%);opacity:0;pointer-events:none;transition:.35s ease}
    .thynk-cookie-banner.is-visible{transform:translateY(0);opacity:1;pointer-events:auto}
    .thynk-cookie-copy strong{display:block;font-size:15px;margin-bottom:4px}
    .thynk-cookie-copy p{margin:0;color:rgba(255,255,255,.68);font-size:12px;line-height:1.5}
    .thynk-cookie-copy a{color:#ff9b2f;text-decoration:underline}
    .thynk-cookie-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .thynk-cookie-actions button{border:0;border-radius:999px;padding:10px 15px;font:700 12px Inter,system-ui,sans-serif;cursor:pointer;transition:.2s ease}
    .thynk-cookie-reject,.thynk-cookie-preferences{color:#fff;background:#252525;border:1px solid rgba(255,255,255,.12)!important}
    .thynk-cookie-accept{color:#111;background:#fff}
    .thynk-cookie-actions button:hover{transform:translateY(-1px)}
    .thynk-cookie-settings{position:fixed;left:18px;bottom:18px;z-index:10049;width:42px;height:42px;border:1px solid rgba(0,0,0,.08);border-radius:50%;background:#fff;color:#111;box-shadow:0 12px 30px rgba(0,0,0,.16);display:none;place-items:center;cursor:pointer}
    .thynk-cookie-settings.is-visible{display:grid}
    @media(max-width:700px){.thynk-cookie-banner{left:12px;right:12px;bottom:12px;grid-template-columns:1fr;gap:14px;border-radius:18px;padding:16px}.thynk-cookie-actions{justify-content:stretch}.thynk-cookie-actions button{flex:1 1 calc(50% - 8px)}.thynk-cookie-accept{flex-basis:100%!important}}
'''

if 'THYNKXP PROJECTS — SPOTLIGHT EXPERIENCE' not in html:
    html = html.replace('</style>', css + '\n  </style>', 1)

cookie_html = '''
  <div class="thynk-cookie-banner" id="thynkCookieBanner" role="dialog" aria-label="Preferências de cookies" aria-live="polite">
    <div class="thynk-cookie-copy"><strong>🍪 Sua privacidade importa.</strong><p>Usamos cookies necessários para o funcionamento do site e, com sua autorização, cookies opcionais para entender o uso da página e melhorar sua experiência. <a href="politica-privacidade.html">Saiba mais</a>.</p></div>
    <div class="thynk-cookie-actions"><button type="button" class="thynk-cookie-reject" id="thynkCookieReject">Recusar opcionais</button><button type="button" class="thynk-cookie-preferences" id="thynkCookiePreferences">Preferências</button><button type="button" class="thynk-cookie-accept" id="thynkCookieAccept">Aceitar cookies</button></div>
  </div>
  <button class="thynk-cookie-settings" id="thynkCookieSettings" type="button" aria-label="Abrir preferências de cookies"><i class="fa-solid fa-cookie-bite"></i></button>
'''

if 'id="thynkCookieBanner"' not in html:
    script = r'''
  <script>
    (() => {
      const KEY = 'thynkxp_cookie_consent_v1';
      const banner = document.getElementById('thynkCookieBanner');
      const settings = document.getElementById('thynkCookieSettings');
      const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
      const save = (analytics) => { localStorage.setItem(KEY, JSON.stringify({necessary:true,analytics:!!analytics,updatedAt:new Date().toISOString()})); banner.classList.remove('is-visible'); settings.classList.add('is-visible'); };
      const show = () => { banner.classList.add('is-visible'); settings.classList.remove('is-visible'); };
      document.getElementById('thynkCookieAccept').addEventListener('click', () => save(true));
      document.getElementById('thynkCookieReject').addEventListener('click', () => save(false));
      document.getElementById('thynkCookiePreferences').addEventListener('click', () => save(window.confirm('Permitir cookies opcionais de análise?\n\nOK = permitir\nCancelar = somente cookies necessários')));
      settings.addEventListener('click', show);
      if (!read()) show(); else settings.classList.add('is-visible');
    })();
  </script>
'''
    html = html.replace('</body>', cookie_html + script + '</body>', 1)

INDEX.write_text(html, encoding='utf-8')
print('ThynkXP site updates applied.')
