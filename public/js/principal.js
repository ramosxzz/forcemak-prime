// ============================================================
// JavaScript Principal - Forcemak Prime
// Animações GSAP, AOS, interações e carregamento de conteúdo
// ============================================================

// ─── Inicialização após carregamento ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  iniciarCaptchaWhatsApp();
  iniciarNavegacao();
  iniciarAnimacoesHero();
  iniciarAOS();
  iniciarContadores();
  carregarServicos();
  iniciarTransicoesDePagina();
  marcarLinkAtivo();
  iniciarHeroTicker();
  enviarCapiPageView();
  // Home
  if (document.getElementById('videos-especiais-container')) {
    carregarVideosEspeciais();
  }
  // Painéis legados (outras páginas que ainda usem)
  if (document.getElementById('painel-equip') && !document.getElementById('eq-destaque-grid')) {
    iniciarCarrosseis();
  }
});

// ════════════════════════════════════════════════════════════
// META CONVERSIONS API — duplicação server-side
// ════════════════════════════════════════════════════════════
function enviarCapiPageView() {
  fetch('/api/capi-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName:      'PageView',
      eventSourceUrl: window.location.href
    })
  }).catch(() => {});
}

function enviarCapiContato() {
  fetch('/api/capi-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName:      'Contact',
      eventSourceUrl: window.location.href
    })
  }).catch(() => {});
}

function enviarCapiLead() {
  fetch('/api/capi-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName:      'Lead',
      eventSourceUrl: window.location.href
    })
  }).catch(() => {});
}

function enviarCapiViewContent(nome, categoria) {
  fetch('/api/capi-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName:      'ViewContent',
      eventSourceUrl: window.location.href,
      customData:     { content_name: nome || '', content_category: categoria || '' }
    })
  }).catch(() => {});
}


// ════════════════════════════════════════════════════════════
// NAVEGAÇÃO
// ════════════════════════════════════════════════════════════

function iniciarNavegacao() {
  const nav         = document.getElementById('nav');
  const hamburguer  = document.getElementById('nav-hamburguer');
  const menu        = document.getElementById('nav-menu');

  if (!nav) return;

  // Muda aparência ao rolar
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      nav.classList.add('rolando');
    } else {
      nav.classList.remove('rolando');
    }
  }, { passive: true });

  // Menu mobile
  if (hamburguer && menu) {
    hamburguer.addEventListener('click', () => {
      hamburguer.classList.toggle('aberto');
      menu.classList.toggle('aberto');
      document.body.style.overflow = menu.classList.contains('aberto') ? 'hidden' : '';
    });

    // Fecha ao clicar em um link
    menu.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        hamburguer.classList.remove('aberto');
        menu.classList.remove('aberto');
        document.body.style.overflow = '';
      });
    });
  }
}

function marcarLinkAtivo() {
  const paginaAtual = window.location.pathname;
  document.querySelectorAll('.nav__link').forEach(link => {
    link.classList.remove('ativo');
    const href = link.getAttribute('href');
    if (
      href === paginaAtual ||
      (paginaAtual === '/' && href === '/') ||
      (paginaAtual.includes(href) && href !== '/')
    ) {
      link.classList.add('ativo');
    }
  });
}


// ════════════════════════════════════════════════════════════
// ANIMAÇÕES DO HERO (GSAP)
// ════════════════════════════════════════════════════════════

function iniciarAnimacoesHero() {
  if (typeof gsap === 'undefined') return;
  if (!document.querySelector('.hero')) return;

  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({ delay: 0.3 });

  // Animação sequencial dos elementos do hero
  tl.to('#hero-badge', {
    opacity:   1,
    y:         0,
    duration:  0.6,
    ease:      'power3.out',
    from:      { y: 30 }
  })
  .to('#hero-titulo', {
    opacity:   1,
    y:         0,
    duration:  0.8,
    ease:      'power3.out',
    from:      { y: 40 }
  }, '-=0.3')
  .to('#hero-subtitulo', {
    opacity:   1,
    y:         0,
    duration:  0.7,
    ease:      'power3.out',
    from:      { y: 30 }
  }, '-=0.4')
  .to('#hero-botoes', {
    opacity:   1,
    y:         0,
    duration:  0.6,
    ease:      'power3.out',
    from:      { y: 20 }
  }, '-=0.3')
  .to('#hero-imagem', {
    opacity:   1,
    x:         0,
    duration:  0.9,
    ease:      'power3.out',
    from:      { x: 60 }
  }, '-=0.6');

  // Animação parallax no scroll
  gsap.to('.hero__fundo', {
    scrollTrigger: {
      trigger: '.hero',
      start:   'top top',
      end:     'bottom top',
      scrub:   true
    },
    y: 120,
    ease: 'none'
  });
}


// ════════════════════════════════════════════════════════════
// AOS - ANIMAÇÕES DE SCROLL
// ════════════════════════════════════════════════════════════

function iniciarAOS() {
  if (typeof AOS === 'undefined') return;

  AOS.init({
    duration:   700,
    easing:     'ease-out-cubic',
    once:       true,
    offset:     80,
    delay:      0
  });
}


// ════════════════════════════════════════════════════════════
// CONTADORES ANIMADOS
// ════════════════════════════════════════════════════════════

function iniciarContadores() {
  const itens = document.querySelectorAll('[data-contador]');
  if (!itens.length) return;

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;

      const elemento  = entrada.target;
      const destino   = parseInt(elemento.dataset.contador);
      const duracao   = 2000;
      const intervalo = 16;
      const passos    = duracao / intervalo;
      const incremento = destino / passos;
      let atual = 0;

      const timer = setInterval(() => {
        atual += incremento;
        if (atual >= destino) {
          elemento.textContent = destino.toLocaleString('pt-BR');
          clearInterval(timer);
        } else {
          elemento.textContent = Math.floor(atual).toLocaleString('pt-BR');
        }
      }, intervalo);

      observer.unobserve(elemento);
    });
  }, { threshold: 0.5 });

  itens.forEach(item => observer.observe(item));
}


// ════════════════════════════════════════════════════════════
// CARREGAMENTO DINÂMICO DE SERVIÇOS
// ════════════════════════════════════════════════════════════

async function carregarServicos() {
  const grid = document.getElementById('servicos-grid');
  if (!grid) return;

  try {
    const resposta = await fetch('/api/conteudo');
    const dados    = await resposta.json();
    const servicos = dados.servicos || [];

    grid.innerHTML = servicos.map((s, i) => `
      <div class="servico-card" data-aos="fade-up" data-aos-delay="${i * 80}">
        <span class="servico-card__linha"></span>
        <span class="servico-card__icone">${s.icone}</span>
        <h3 class="servico-card__titulo">${s.titulo}</h3>
        <p class="servico-card__descricao">${s.descricao}</p>
      </div>
    `).join('');

    // Re-inicializa AOS para novos elementos
    if (typeof AOS !== 'undefined') AOS.refresh();

  } catch {
    grid.innerHTML = '<p style="text-align:center;color:#666;">Erro ao carregar serviços.</p>';
  }
}


// ════════════════════════════════════════════════════════════
// TRANSIÇÕES DE PÁGINA
// ════════════════════════════════════════════════════════════

function iniciarTransicoesDePagina() {
  const overlay = document.getElementById('overlay-transicao');
  if (!overlay || typeof gsap === 'undefined') return;

  // Garante que overlay some mesmo ao usar o botão "voltar" (bfcache)
  window.addEventListener('pageshow', (e) => {
    overlay.style.transform = 'scaleY(0)';
    overlay.style.pointerEvents = 'none';
  });

  // Animação de entrada (página está carregando)
  gsap.fromTo(overlay,
    { scaleY: 1, transformOrigin: 'top' },
    { scaleY: 0, duration: 0.6, ease: 'power3.inOut', delay: 0 }
  );

  // Intercepta cliques em links internos
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('http') ||
      href.startsWith('mailto') ||
      href.startsWith('tel') ||
      link.target === '_blank'
    ) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      const destino = href;

      gsap.fromTo(overlay,
        { scaleY: 0, transformOrigin: 'bottom' },
        {
          scaleY:   1,
          duration: 0.5,
          ease:     'power3.inOut',
          onComplete: () => { window.location.href = destino; }
        }
      );
    });
  });
}


// ════════════════════════════════════════════════════════════
// FORMULÁRIO DE CONTATO
// ════════════════════════════════════════════════════════════

const formContato = document.getElementById('form-contato');
if (formContato) {
  formContato.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn      = formContato.querySelector('button[type="submit"]');
    const msgEl    = document.getElementById('form-mensagem');
    const dados    = Object.fromEntries(new FormData(formContato));

    btn.disabled       = true;
    btn.innerHTML      = '<span class="spinner"></span> Enviando...';

    try {
      const res  = await fetch('/api/contato', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(dados)
      });
      const json = await res.json();

      if (json.sucesso) {
        msgEl.className   = 'formulario__mensagem sucesso';
        msgEl.textContent = '✅ Mensagem enviada com sucesso! Em breve entraremos em contato.';
        formContato.reset();
        if (typeof fbq !== 'undefined') fbq('track', 'Contact');
        enviarCapiContato();
      } else {
        throw new Error(json.erro);
      }
    } catch (err) {
      msgEl.className   = 'formulario__mensagem erro';
      msgEl.textContent = '❌ ' + (err.message || 'Erro ao enviar. Tente novamente.');
    }

    btn.disabled  = false;
    btn.innerHTML = 'Enviar Mensagem';
  });
}


// ════════════════════════════════════════════════════════════
// CARREGAMENTO DE PRODUTOS (página produtos.html)
// ════════════════════════════════════════════════════════════

async function carregarProdutos(filtro = 'Todos') {
  const grid = document.getElementById('produtos-grid');
  if (!grid) return;

  grid.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">Carregando...</p>';

  try {
    const res      = await fetch('/api/produtos');
    let produtos   = await res.json();

    if (filtro !== 'Todos') {
      produtos = produtos.filter(p => p.categoria === filtro);
    }

    if (!produtos.length) {
      grid.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">Nenhum produto encontrado.</p>';
      return;
    }

    grid.innerHTML = produtos.map((p, i) => `
      <a href="/produto.html?id=${p.id}" class="produto-card" data-aos="fade-up" data-aos-delay="${(i % 3) * 80}" style="display:block;text-decoration:none;color:inherit;">
        <div class="produto-card__imagem">
          ${p.imagem
            ? `<img src="${p.imagem}" alt="${p.nome}" style="width:100%;height:100%;object-fit:cover;">`
            : `<div style="width:100%;height:100%;background:var(--cinza-fundo);display:flex;align-items:center;justify-content:center;"><span style="font-size:1.5rem;color:var(--cinza-texto);font-weight:600;">${p.categoria}</span></div>`
          }
        </div>
        <div class="produto-card__corpo">
          <span class="produto-card__categoria">${p.categoria}</span>
          <h3 class="produto-card__nome">${p.nome}</h3>
          <p class="produto-card__descricao">${p.descricao}</p>
          <div class="produto-card__rodape">
            <span class="produto-card__unidade">${p.estoque > 0 ? 'Disponível' : 'Consultar'}</span>
            ${p.destaque ? '<span class="badge-destaque">Destaque</span>' : ''}
          </div>
        </div>
      </a>
    `).join('');

    if (typeof AOS !== 'undefined') AOS.refresh();

  } catch {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">Erro ao carregar produtos.</p>';
  }
}

// Filtros de categoria na página de produtos
document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    carregarProdutos(btn.dataset.filtro || 'Todos');
  });
});

// Iniciar carregamento se estiver na página de produtos
if (document.getElementById('produtos-grid')) {
  carregarProdutos();
}


// ════════════════════════════════════════════════════════════
// CARROSSEL DOS DOIS PAINÉIS (home)
// ════════════════════════════════════════════════════════════

const _car = {
  equip: { slides: [], atual: 0, timer: null, dados: [] },
  serv:  { slides: [], atual: 0, timer: null, dados: [] }
};

const SERVICOS_CAROUSEL = [
  { icone: '🔍', nome: 'Busca Inteligente',  bg: 'linear-gradient(160deg,#091520 0%,#0e2540 100%)' },
  { icone: '📋', nome: 'Laudo Cautelar',     bg: 'linear-gradient(160deg,#150e00 0%,#2e1f00 100%)' },
  { icone: '⭐', nome: 'Key Account Prime',  bg: 'linear-gradient(160deg,#0b0920 0%,#1a1540 100%)' },
  { icone: '🚜', nome: 'Mix de Frota',       bg: 'linear-gradient(160deg,#081508 0%,#102810 100%)' },
  { icone: '💰', nome: 'Venda do Ativo',     bg: 'linear-gradient(160deg,#150808 0%,#2e1010 100%)' },
  { icone: '🎯', nome: 'Equipamento Ideal',  bg: 'linear-gradient(160deg,#100815 0%,#201028 100%)' },
];

const CAT_BG = {
  'Colheitadeiras':         'linear-gradient(160deg,#081508 0%,#142814 100%)',
  'Tratores':               'linear-gradient(160deg,#091520 0%,#0e2a40 100%)',
  'Plantadeiras':           'linear-gradient(160deg,#081508 0%,#103010 100%)',
  'Pulverizadores':         'linear-gradient(160deg,#150808 0%,#301010 100%)',
  'Implementos':            'linear-gradient(160deg,#100815 0%,#201530 100%)',
  'Escavadeiras':           'linear-gradient(160deg,#150e00 0%,#2e2000 100%)',
  'Mini Escavadeiras':      'linear-gradient(160deg,#100808 0%,#251808 100%)',
  'Mini Carregadeiras':     'linear-gradient(160deg,#0a1020 0%,#142040 100%)',
  'Pás Carregadeiras':      'linear-gradient(160deg,#101510 0%,#203020 100%)',
  'Plataformas Elevatórias':'linear-gradient(160deg,#0d0d20 0%,#1a1a40 100%)',
  'Retroescavadeiras':      'linear-gradient(160deg,#180800 0%,#301800 100%)',
  'Motoniveladoras':        'linear-gradient(160deg,#100010 0%,#200820 100%)',
  'Manipuladores':          'linear-gradient(160deg,#001518 0%,#003040 100%)',
  'Fresadoras':             'linear-gradient(160deg,#181818 0%,#282828 100%)',
  'Caminhões':              'linear-gradient(160deg,#100810 0%,#201020 100%)',
};

const CAT_ICONE = {
  'Colheitadeiras':         '🌾',
  'Tratores':               '🚜',
  'Plantadeiras':           '🌱',
  'Pulverizadores':         '💨',
  'Implementos':            '⚙️',
  'Escavadeiras':           '⛏️',
  'Mini Escavadeiras':      '⛏️',
  'Mini Carregadeiras':     '🏗️',
  'Pás Carregadeiras':      '🏗️',
  'Plataformas Elevatórias':'🔝',
  'Retroescavadeiras':      '🏗️',
  'Motoniveladoras':        '🛣️',
  'Manipuladores':          '🦾',
  'Fresadoras':             '⚙️',
  'Caminhões':              '🚛',
};

function iniciarCarrosseis() {
  // Equipamentos (dinâmico via API) — API retorna array direto
  fetch('/api/produtos')
    .then(r => r.json())
    .then(lista => {
      if (!Array.isArray(lista) || !lista.length) {
        montarCarrossel('equip', [{ bg: CAT_BG['Tratores'], icone: '', nome: 'Equipamentos', categoria: 'Todos os tipos' }]);
        return;
      }
      // Seleciona 1 por categoria, priorizando destaques em estoque, máx 6 slides
      const comFoto    = lista.filter(p => p.imagem);
      const destaques  = comFoto.filter(p => p.destaque && p.estoque > 0);
      const outros     = comFoto.filter(p => !(p.destaque && p.estoque > 0));
      const porCat     = {};
      [...destaques, ...outros].forEach(p => {
        if (!porCat[p.categoria]) porCat[p.categoria] = [];
        if (porCat[p.categoria].length < 1) porCat[p.categoria].push(p);
      });
      const usarLista = Object.values(porCat).flat().slice(0, 6);
      montarCarrossel('equip', usarLista.map(p => ({
        bg:       p.imagem ? null : (CAT_BG[p.categoria] || 'linear-gradient(160deg,#091520,#0e2a40)'),
        img:      p.imagem || null,   // caminho completo: /imagens/uploads/...
        icone:    CAT_ICONE[p.categoria] || '🚜',
        nome:     p.nome,
        categoria:p.categoria,
        estoque:  p.estoque,
      })));
    })
    .catch(() => {
      montarCarrossel('equip', [{ bg: CAT_BG['Tratores'], icone: '', nome: 'Equipamentos', categoria: 'Forcemak Prime' }]);
    });
}

function montarCarrossel(id, slides) {
  const c       = _car[id];
  c.dados       = slides;
  const slidesEl = document.getElementById(`slides-${id}`);
  const dotsEl   = document.getElementById(`dots-${id}`);
  if (!slidesEl) return;

  slidesEl.innerHTML = slides.map((s, i) => {
    const style = s.img
      ? `background-image:url('${s.img}');background-size:cover;background-position:center;`
      : `background:${s.bg};`;
    // Emoji só aparece quando não há foto real
    const icone = s.img ? '' : `<div class="slide-icone-bg">${s.icone}</div>`;
    return `<div class="painel__slide${i === 0 ? ' ativo' : ''}" style="${style}" data-idx="${i}">${icone}</div>`;
  }).join('');

  if (dotsEl) {
    dotsEl.innerHTML = slides.map((_, i) =>
      `<button class="painel__dot${i === 0 ? ' ativo' : ''}" data-idx="${i}" aria-label="Slide ${i+1}"></button>`
    ).join('');
    dotsEl.querySelectorAll('.painel__dot').forEach(dot => {
      dot.addEventListener('click', () => {
        clearInterval(c.timer);
        _irParaSlide(id, parseInt(dot.dataset.idx));
        _iniciarAutoplay(id);
      });
    });
  }

  c.slides = Array.from(slidesEl.querySelectorAll('.painel__slide'));
  c.atual  = 0;
  _atualizarInfoSlide(id, 0);
  _iniciarAutoplay(id);

  const painel = document.getElementById(`painel-${id}`);
  if (painel) {
    _adicionarSwipe(painel, id);

    // Inject prev/next arrows
    ['prev','next'].forEach(dir => {
      const btn = document.createElement('button');
      btn.className = `painel__arrow painel__arrow--${dir}`;
      btn.setAttribute('aria-label', dir === 'prev' ? 'Anterior' : 'Próximo');
      btn.innerHTML = dir === 'prev'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        clearInterval(c.timer);
        _irParaSlide(id, c.atual + (dir === 'prev' ? -1 : 1));
        _iniciarAutoplay(id);
      });
      painel.appendChild(btn);
    });
  }
}

function _irParaSlide(id, idx) {
  const c = _car[id];
  if (!c.slides.length) return;

  c.slides[c.atual].classList.remove('ativo');
  const dots = document.getElementById(`dots-${id}`);
  if (dots) dots.querySelectorAll('.painel__dot')[c.atual]?.classList.remove('ativo');

  c.atual = ((idx % c.slides.length) + c.slides.length) % c.slides.length;
  // Force animation restart (Ken Burns)
  const nextSlide = c.slides[c.atual];
  nextSlide.style.animation = 'none';
  void nextSlide.offsetWidth; // reflow
  nextSlide.style.animation = '';
  nextSlide.classList.add('ativo');
  if (dots) dots.querySelectorAll('.painel__dot')[c.atual]?.classList.add('ativo');

  _atualizarInfoSlide(id, c.atual);
}

function _atualizarInfoSlide(id, idx) {
  const d = _car[id].dados[idx];
  if (!d) return;

  const nomeEl = document.getElementById(`${id}-nome`);
  const catEl  = document.getElementById(`${id}-cat`);

  if (nomeEl) {
    nomeEl.style.opacity = '0';
    setTimeout(() => { nomeEl.textContent = d.nome; nomeEl.style.opacity = '1'; }, 220);
  }
  if (catEl) catEl.textContent = d.categoria || 'Equipamento';

  if (id === 'equip') {
    const badgeEl = document.getElementById('equip-badge');
    if (badgeEl && d.estoque !== undefined) {
      badgeEl.style.display = 'inline-block';
      if (d.estoque > 3) {
        badgeEl.textContent = '● Em estoque';
        badgeEl.className = 'painel__badge painel__badge--verde';
      } else if (d.estoque > 0) {
        badgeEl.textContent = '● Última unidade';
        badgeEl.className = 'painel__badge painel__badge--amarelo';
      } else {
        badgeEl.textContent = '● Consultar disponibilidade';
        badgeEl.className = 'painel__badge painel__badge--cinza';
      }
    }
  }
}

function _iniciarAutoplay(id) {
  const c = _car[id];
  clearInterval(c.timer);
  c.timer = setInterval(() => _irParaSlide(id, c.atual + 1), 4200);
}

function _adicionarSwipe(el, id) {
  let sx = 0, sy = 0;
  el.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = sx - e.changedTouches[0].clientX;
    const dy = Math.abs(sy - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 48 && Math.abs(dx) > dy) {
      clearInterval(_car[id].timer);
      _irParaSlide(id, _car[id].atual + (dx > 0 ? 1 : -1));
      _iniciarAutoplay(id);
    }
  }, { passive: true });
}


// ════════════════════════════════════════════════════════════
// VÍDEOS ESPECIAIS — thumbnails clicáveis + modal
// ════════════════════════════════════════════════════════════

function carregarVideosEspeciais() {
  const container = document.getElementById('videos-especiais-container');
  const ctaEl     = document.getElementById('videos-canal-cta');
  if (!container) return;

  fetch('/api/conteudo')
    .then(r => r.json())
    .then(dados => {
      const videos = (dados.midia?.youtube?.videos || []).slice(0, 3);
      if (!videos.length) return;

      // Renderiza grade de thumbnails (não iframes — muito mais rápido)
      container.innerHTML = `
        <div class="yt-grid">
          ${videos.map(vid => `
            <div class="yt-thumb" onclick="abrirModalYT('${vid}')" role="button" aria-label="Assistir vídeo">
              <img src="https://img.youtube.com/vi/${vid}/hqdefault.jpg"
                   alt="Vídeo Forcemak Prime" loading="lazy">
              <div class="yt-thumb__play">
                <svg viewBox="0 0 68 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="68" height="48" rx="12" fill="#FF0000" opacity="0.9"/>
                  <polygon points="26,14 26,34 48,24" fill="white"/>
                </svg>
              </div>
            </div>`).join('')}
        </div>`;

      if (ctaEl) ctaEl.style.display = 'block';
    })
    .catch(() => {});
}

// ════════════════════════════════════════════════════════════
// MODAL DE EQUIPAMENTO (disponível em qualquer página)
// ════════════════════════════════════════════════════════════
function abrirEqModal(dadosEncoded) {
  const p = JSON.parse(decodeURIComponent(dadosEncoded));
  const modal = document.getElementById('eq-modal');
  if (!modal) return;

  document.getElementById('eq-modal-cat').textContent  = p.categoria;
  document.getElementById('eq-modal-nome').textContent = p.nome;
  document.getElementById('eq-modal-desc').textContent = p.descricao || 'Entre em contato para mais informações.';
  document.getElementById('eq-modal-cat-placeholder').textContent = p.categoria;

  const foto = document.getElementById('eq-modal-foto');
  const ph   = document.getElementById('eq-modal-placeholder');
  if (p.imagem) {
    foto.src = p.imagem; foto.alt = p.nome;
    foto.style.display = 'block'; ph.style.display = 'none';
  } else {
    foto.style.display = 'none'; ph.style.display = 'flex';
  }

  const status = document.getElementById('eq-modal-status');
  if (p.estoque > 0) {
    status.textContent = 'Disponível em estoque';
    status.className   = 'eq-modal__status eq-modal__status--ok';
  } else {
    status.textContent = 'Consultar disponibilidade';
    status.className   = 'eq-modal__status eq-modal__status--consultar';
  }

  const msg = encodeURIComponent(`Olá! Tenho interesse no equipamento: ${p.nome}. Poderia me passar mais informações?`);
  document.getElementById('eq-modal-wa').href = `https://wa.me/5551996050777?text=${msg}`;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (typeof fbq !== 'undefined') fbq('track', 'ViewContent', { content_name: p.nome, content_category: p.categoria });
  enviarCapiViewContent(p.nome, p.categoria);
}

function fecharEqModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('eq-modal__fechar')) return;
  const modal = document.getElementById('eq-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}


function abrirModalYT(videoId) {
  const modal  = document.getElementById('yt-modal');
  const iframe = document.getElementById('yt-modal-iframe');
  if (!modal || !iframe) return;
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModalYT(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('yt-modal__fechar')) return;
  const modal  = document.getElementById('yt-modal');
  const iframe = document.getElementById('yt-modal-iframe');
  if (!modal) return;
  modal.style.display = 'none';
  if (iframe) iframe.src = '';
  document.body.style.overflow = '';
}

// Fechar modal com ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') fecharModalYT({target: null, currentTarget: null});
});


// ════════════════════════════════════════════════════════════
// HERO TICKER ROTATIVO
// ════════════════════════════════════════════════════════════
function iniciarHeroTicker() {
  const el = document.getElementById('hero-ticker-texto');
  if (!el) return;

  const msgs = [
    '+10.000 clientes atendidos',
    'Consultoria do início ao fim',
    '+3.000 equipamentos negociados',
    '17 anos de mercado',
    'Laudo Cautelar especializado',
  ];

  let i = 0;
  setInterval(() => {
    el.classList.add('saindo');
    setTimeout(() => {
      i = (i + 1) % msgs.length;
      el.textContent = msgs[i];
      el.classList.remove('saindo');
      el.classList.add('entrando');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.remove('entrando'));
      });
    }, 380);
  }, 3200);
}


// ════════════════════════════════════════════════════════════
// EQUIPAMENTOS DESTAQUE (home — substitui carrossel)
// ════════════════════════════════════════════════════════════
function carregarEquipamentosDestaque() {
  const grid = document.getElementById('eq-destaque-grid');
  if (!grid) return;

  fetch('/api/produtos')
    .then(r => r.json())
    .then(lista => {
      if (!Array.isArray(lista) || !lista.length) return;

      // Prioriza destaques com foto, máximo 3
      const comFoto = lista.filter(p => p.imagem);
      const dest    = comFoto.filter(p => p.destaque && p.estoque > 0);
      const outros  = comFoto.filter(p => !(p.destaque && p.estoque > 0));
      const selecionados = [...dest, ...outros].slice(0, 3);

      if (!selecionados.length) return;

      grid.innerHTML = selecionados.map(p => {
        const dadosAttr = encodeURIComponent(JSON.stringify({
          id: p.id, nome: p.nome, categoria: p.categoria,
          descricao: p.descricao || '', imagem: p.imagem || '',
          estoque: p.estoque, destaque: p.destaque
        }));
        const statusHtml = p.estoque > 0
          ? '<span class="eq-destaque-card__status">Disponível</span>'
          : '<span class="eq-destaque-card__status eq-destaque-card__status--consultar">Consultar</span>';

        return `
          <div class="eq-destaque-card" onclick="abrirEqModal('${dadosAttr}')">
            <img src="${p.imagem}" alt="${p.nome}" class="eq-destaque-card__img"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="eq-destaque-card__img-placeholder" style="display:none;">
              <span>${p.categoria}</span>
            </div>
            <div class="eq-destaque-card__body">
              <span class="eq-destaque-card__cat">${p.categoria}</span>
              <h3 class="eq-destaque-card__nome">${p.nome}</h3>
              ${statusHtml}
            </div>
          </div>`;
      }).join('');
    })
    .catch(() => {});
}


// ════════════════════════════════════════════════════════════
// ABAS DE SERVIÇOS
// ════════════════════════════════════════════════════════════
(function iniciarAbasServicos() {
  const tabs    = Array.from(document.querySelectorAll('.sa-tab'));
  const paineis = document.querySelectorAll('.sa-painel');
  if (!tabs.length) return;

  let idx = 0;

  function irPara(novoIdx) {
    idx = ((novoIdx % tabs.length) + tabs.length) % tabs.length;
    tabs.forEach(t => t.classList.remove('ativo'));
    paineis.forEach(p => p.classList.remove('ativo'));
    tabs[idx].classList.add('ativo');
    const alvo = tabs[idx].dataset.tab;
    const painel = document.getElementById('tab-' + alvo);
    if (painel) painel.classList.add('ativo');

    const counter = document.getElementById('sa-counter');
    const btnPrev = document.getElementById('sa-prev');
    const btnNext = document.getElementById('sa-next');
    if (counter) counter.textContent = `${idx + 1} / ${tabs.length}`;
    if (btnPrev) btnPrev.disabled = idx === 0;
    if (btnNext) btnNext.disabled = idx === tabs.length - 1;
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => irPara(i));
  });

  // Botões prev/next mobile
  const btnPrev = document.getElementById('sa-prev');
  const btnNext = document.getElementById('sa-next');
  if (btnPrev) btnPrev.addEventListener('click', () => irPara(idx - 1));
  if (btnNext) btnNext.addEventListener('click', () => irPara(idx + 1));

  // Swipe no painel
  const paineis2 = document.querySelector('.sa-paineis');
  if (paineis2) {
    let sx = 0, sy = 0;
    paineis2.addEventListener('touchstart', e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    paineis2.addEventListener('touchend', e => {
      const dx = sx - e.changedTouches[0].clientX;
      const dy = Math.abs(sy - e.changedTouches[0].clientY);
      if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
        irPara(dx > 0 ? idx + 1 : idx - 1);
      }
    }, { passive: true });
  }

  irPara(0);
})();


// ════════════════════════════════════════════════════════════
// CAPTCHA WHATSAPP
// ════════════════════════════════════════════════════════════
function iniciarCaptchaWhatsApp() {
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]');
    if (!link) return;
    e.preventDefault();
    const destino = link.href;
    mostrarCaptchaWA(destino);
  });
}

function mostrarCaptchaWA(destino) {
  const overlay = document.createElement('div');
  overlay.className = 'wacaptcha-overlay';
  overlay.innerHTML = `
    <div class="wacaptcha-box">
      <div class="wacaptcha-header">
        <span>Verificação de Segurança</span>
        <span style="cursor:pointer;font-size:1.1rem;color:rgba(255,255,255,0.5);" id="wac-fechar">✕</span>
      </div>
      <div class="wacaptcha-body">
        <div class="wacaptcha-check-row">
          <div class="wacaptcha-checkbox" id="wac-checkbox">
            <div class="wacaptcha-spinner" id="wac-spinner"></div>
            <div class="wacaptcha-checkmark" id="wac-checkmark"></div>
          </div>
          <span class="wacaptcha-label">Não sou um robô</span>
          <div class="wacaptcha-brand">
            <span class="wacaptcha-brand__logo">🛡️</span>
            <span class="wacaptcha-brand__nome">Verificação<br>Segura</span>
          </div>
        </div>
        <p class="wacaptcha-footer">Ao continuar, você será redirecionado ao WhatsApp.</p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const fechar = overlay.querySelector('#wac-fechar');
  fechar.addEventListener('click', () => removerCaptchaWA(overlay));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removerCaptchaWA(overlay);
  });

  const checkbox = overlay.querySelector('#wac-checkbox');
  const spinner  = overlay.querySelector('#wac-spinner');
  const check    = overlay.querySelector('#wac-checkmark');
  let clicado = false;

  checkbox.addEventListener('click', () => {
    if (clicado) return;
    clicado = true;

    // Abre a janela imediatamente no gesto do usuário (evita bloqueio de popup)
    const waJanela = window.open('', '_blank');

    checkbox.classList.add('loading');
    spinner.style.display = 'block';

    setTimeout(() => {
      spinner.style.display = 'none';
      checkbox.classList.remove('loading');
      checkbox.classList.add('done');
      check.style.display = 'block';

      setTimeout(() => {
        removerCaptchaWA(overlay);
        if (waJanela) {
          waJanela.location.href = destino;
        } else {
          window.location.href = destino;
        }
        const isLaudo = window.location.pathname.includes('laudo');
        if (typeof fbq !== 'undefined') {
          fbq('track', 'Contact');
          if (isLaudo) fbq('track', 'Lead');
        }
        enviarCapiContato();
        if (isLaudo) enviarCapiLead();
      }, 600);
    }, 1400);
  });
}

function removerCaptchaWA(overlay) {
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.15s ease';
  setTimeout(() => {
    overlay.remove();
    document.body.style.overflow = '';
  }, 150);
}

