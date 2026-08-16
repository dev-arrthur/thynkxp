from pathlib import Path
import re
import shutil

NEW_LOCAL = "32988221108"
NEW_WA = "5532988221108"
INSTAGRAM = "https://www.instagram.com/thynkxp/"

ROOT_PAGES = list(Path(".").glob("*.html"))

PHONE_REPLACEMENTS = {
    "5532984690215": NEW_WA,
    "32984690215": NEW_LOCAL,
    "(32) 9 8469-0215": "(32) 9 8822-1108",
    "(32) 98469-0215": "(32) 98822-1108",
    "32 9 8469-0215": "32 9 8822-1108",
    "32 98469-0215": "32 98822-1108",
    "+55 32 98469-0215": "+55 32 98822-1108",
}

INSTAGRAM_PLACEHOLDER = re.compile(
    r'<a\b([^>]*)href=(["\'])#\2([^>]*)>(\s*<i\b[^>]*fa-instagram[^>]*></i>\s*)</a>',
    re.I,
)


def update_contacts(text: str) -> str:
    text = re.sub(r"https://wa\.me/\d+", f"https://wa.me/{NEW_WA}", text)
    text = re.sub(r"(?i)tel:\+?[\d\s().-]{10,20}", f"tel:+{NEW_WA}", text)
    for old, new in PHONE_REPLACEMENTS.items():
        text = text.replace(old, new)

    def instagram_repl(match: re.Match) -> str:
        before = match.group(1).strip()
        after = match.group(3).strip()
        attrs = " ".join(part for part in (before, after) if part)
        attrs = f"{attrs} " if attrs else ""
        return (
            f'<a {attrs}href="{INSTAGRAM}" target="_blank" '
            f'rel="noopener noreferrer">{match.group(4)}</a>'
        )

    return INSTAGRAM_PLACEHOLDER.sub(instagram_repl, text)


for page in ROOT_PAGES:
    original = page.read_text(encoding="utf-8")
    updated = update_contacts(original)
    if updated != original:
        page.write_text(updated, encoding="utf-8")

index_path = Path("index.html")
text = index_path.read_text(encoding="utf-8")

section_start = text.find('    <section class="projects-section" id="projetos">')
section_end = text.find('    <section class="testimonials-section">', section_start)
if section_start == -1 or section_end == -1:
    raise SystemExit("Nao foi possivel localizar a secao de projetos em index.html")

pagbank_card = '''<a href="pagbanknext.html" class="project-card">
                <div class="project-image">
                  <img src="img/projeto3.png" alt="Projeto PagBank Next">
                </div>
                <div class="project-copy">
                  <span class="project-category">UI Design</span>
                  <h3>PagBank Next</h3>
                  <p>Experiência digital para uma solução financeira moderna, clara e confiável.</p>
                </div>
                <p class="project-label">→ UI Design</p>
              </a>'''

saboratti_card = '''<a href="saboratti.html" class="project-card featured-project">
                <div class="project-image">
                  <img class="project-mobile-image" src="img/projeto1.png" alt="Projeto Saboratti">
                  <img class="project-feature-image" src="img/destaque.png" alt="Imagem de destaque do projeto Saboratti">
                </div>
                <div class="project-copy">
                  <h3>Saboratti</h3>
                  <p>Branding com personalidade, presença visual marcante e comunicação feita para vender.</p>
                </div>
                <p class="project-label">→ Branding</p>
              </a>'''

new_projects = f'''    <section class="projects-section" id="projetos">

      <div class="projects-left">
        <h2><span>Projetos.</span> Visual com estratégia, solução com resultado.</h2>
        <p>
          Tudo é pensado de forma personalizada para sua marca se comunicar com clareza,
          se conectar com o público certo e crescer com consistência.
        </p>
        <a href="https://wa.me/{NEW_WA}?text=Ol%C3%A1%21%20Tudo%20bem%3F%20Vi%20alguns%20projetos%20de%20voc%C3%AAs%20no%20site%20e%20gostaria%20de%20tirar%20algumas%20d%C3%BAvidas%20sobre%20como%20funciona%20o%20processo." target="_blank" rel="noopener noreferrer" class="projects-btn">Quero um orçamento →</a>
      </div>

      <div class="projects-right projects-carousel-infinite">
        <div class="projects-track-wrapper" aria-label="Cases em destaque">
          <div class="projects-marquee">
            <div class="projects-loop-group">
              {pagbank_card}
              {saboratti_card}
            </div>
            <div class="projects-loop-group" aria-hidden="true">
              {pagbank_card}
              {saboratti_card}
            </div>
          </div>
        </div>
      </div>
    </section>

'''

text = text[:section_start] + new_projects + text[section_end:]

text = re.sub(
    r'\n\s*<script>\s*const track = document\.getElementById\("projectsTrack"\);.*?</script>\s*',
    "\n",
    text,
    count=1,
    flags=re.S,
)
text = re.sub(
    r'\n\s*<script>\s*const projectsInfiniteWrapper = document\.querySelector\("\.projects-track-wrapper"\);.*?</script>\s*',
    "\n",
    text,
    count=1,
    flags=re.S,
)

CSS_MARKER = "/* THYNKXP PROJECTS INFINITE CAROUSEL */"
if CSS_MARKER not in text:
    css = r'''
    /* THYNKXP PROJECTS INFINITE CAROUSEL */
    #projetos {
      overflow: hidden;
    }

    #projetos .projects-right.projects-carousel-infinite {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow: hidden !important;
    }

    #projetos .projects-carousel-infinite .projects-track-wrapper {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow: hidden !important;
      padding: 8px 0 16px;
      scrollbar-width: none;
    }

    #projetos .projects-marquee {
      display: flex;
      width: max-content;
      max-width: none;
      will-change: transform;
      animation: thynkProjectsMarquee 24s linear infinite;
    }

    #projetos .projects-loop-group {
      --projects-gap: 18px;
      display: flex;
      flex: 0 0 auto;
      align-items: stretch;
      gap: var(--projects-gap);
      padding-right: var(--projects-gap);
    }

    #projetos .projects-carousel-infinite .project-card,
    #projetos .projects-carousel-infinite .project-card.featured-project {
      flex: 0 0 clamp(310px, 30vw, 430px) !important;
      width: clamp(310px, 30vw, 430px) !important;
      max-width: none !important;
      min-width: 0 !important;
      grid-column: auto !important;
      grid-row: auto !important;
      margin: 0 !important;
    }

    #projetos .projects-carousel-infinite .project-card.featured-project::before {
      pointer-events: none;
    }

    #projetos .projects-marquee:hover {
      animation-play-state: paused;
    }

    @keyframes thynkProjectsMarquee {
      from { transform: translate3d(0, 0, 0); }
      to { transform: translate3d(-50%, 0, 0); }
    }

    @media (max-width: 991px) {
      #projetos .projects-carousel-infinite .projects-track-wrapper {
        overflow: hidden !important;
        scroll-snap-type: none !important;
        -webkit-overflow-scrolling: auto;
      }

      #projetos .projects-loop-group {
        --projects-gap: 14px;
      }

      #projetos .projects-carousel-infinite .project-card,
      #projetos .projects-carousel-infinite .project-card.featured-project {
        flex-basis: min(82vw, 340px) !important;
        width: min(82vw, 340px) !important;
      }

      #projetos .projects-marquee {
        animation-duration: 18s;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #projetos .projects-marquee {
        animation: none;
      }
    }
'''
    text = text.replace("</style>", css + "\n  </style>", 1)

text = update_contacts(text)
index_path.write_text(text, encoding="utf-8")

for target in [
    Path("larrisamoraes.html"),
    Path("velora.html"),
    Path("projetos-em-breve.html"),
    Path("img/projeto2.png"),
    Path("img/projeto4.png"),
]:
    if target.exists():
        target.unlink()

larissa_assets = Path("img/larrisamoraes")
if larissa_assets.exists():
    shutil.rmtree(larissa_assets)

check = index_path.read_text(encoding="utf-8")
assert NEW_WA in check
assert INSTAGRAM in check
assert "projects-marquee" in check
assert "larrisamoraes.html" not in check
assert "velora.html" not in check
assert "projetos-em-breve.html" not in check

print("ThynkXP atualizada com sucesso.")
