// ============================================================
// Busca Avançada com Sidebar + Filtro de Estoque
// Forcemak Prime
// ============================================================

// Estado dos filtros
const estado = {
  texto:        '',
  categorias:   new Set(),
  marcas:       new Set(),
  apenasEstoque: false,
  ordenar:      'padrao',
  precoMin:     '',
  precoMax:     '',
  anoMin:       '',
  anoMax:       '',
  horas:        '',
  pesoMax:      '',
  todos:        []  // cache dos produtos
};

// ─── Inicialização ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('produtos-grid')) return;

  await carregarTodosProdutos();
  iniciarEventos();
  renderizarProdutos(false);
});

async function carregarTodosProdutos() {
  try {
    const res = await fetch('/api/produtos');
    estado.todos = await res.json();
    montarFiltrosCategorias();
    montarFiltrosMarcas();
    ajustarFiltrosRanges();
  } catch {
    document.getElementById('produtos-grid').innerHTML = `
      <div class="sem-resultados">
        <p class="sem-resultados__titulo">Erro ao carregar equipamentos</p>
        <p class="sem-resultados__texto">Tente recarregar a página.</p>
      </div>`;
  }
}

// ─── Monta checkboxes de categorias dinamicamente ────────────
function montarFiltrosCategorias() {
  const container = document.getElementById('filtros-categorias');
  if (!container) return;

  const contagem = {};
  estado.todos.forEach(p => {
    contagem[p.categoria] = (contagem[p.categoria] || 0) + 1;
  });

  const categorias = Object.keys(contagem).sort();

  container.innerHTML = categorias.map(cat => `
    <label class="filtro-opcao">
      <input type="checkbox" value="${cat}" class="filtro-categoria-check">
      <span class="filtro-opcao__label">${cat}</span>
      <span class="filtro-opcao__contagem">${contagem[cat]}</span>
    </label>
  `).join('');

  container.querySelectorAll('.filtro-categoria-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) estado.categorias.add(cb.value);
      else            estado.categorias.delete(cb.value);
      renderizarProdutos(true);
    });
  });
}

// ─── Monta checkboxes de marcas dinamicamente ────────────────
function montarFiltrosMarcas() {
  const container = document.getElementById('filtros-marcas');
  if (!container) return;

  const contagem = {};
  estado.todos.forEach(p => {
    if (p.marca) contagem[p.marca] = (contagem[p.marca] || 0) + 1;
  });

  const marcas = Object.keys(contagem).sort();
  const grupo  = container.closest('.filtro-grupo');
  if (!marcas.length) { if (grupo) grupo.style.display = 'none'; return; }
  if (grupo) grupo.style.display = '';

  container.innerHTML = marcas.map(m => `
    <label class="filtro-opcao">
      <input type="checkbox" value="${m}" class="filtro-marca-check">
      <span class="filtro-opcao__label">${m}</span>
      <span class="filtro-opcao__contagem">${contagem[m]}</span>
    </label>
  `).join('');

  container.querySelectorAll('.filtro-marca-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) estado.marcas.add(cb.value);
      else            estado.marcas.delete(cb.value);
      renderizarProdutos(true);
    });
  });
}

// ─── Ajusta ranges/placeholders e esconde filtros vazios ──────
function ajustarFiltrosRanges() {
  function mostrarGrupo(id, mostrar) {
    const el = document.getElementById(id);
    if (el) el.closest('.filtro-grupo').style.display = mostrar ? '' : 'none';
  }

  // Preço
  const precos = estado.todos.map(p => extrairNumero(p.valor)).filter(v => v !== null);
  if (precos.length) {
    const mn = Math.min(...precos), mx = Math.max(...precos);
    const fmt = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
    document.getElementById('filtro-preco-min').placeholder = fmt(mn);
    document.getElementById('filtro-preco-max').placeholder = fmt(mx);
    mostrarGrupo('filtro-preco-min', true);
  } else {
    mostrarGrupo('filtro-preco-min', false);
  }

  // Ano
  const anos = estado.todos.map(p => parseInt(p.ano)).filter(v => !isNaN(v));
  if (anos.length) {
    document.getElementById('filtro-ano-min').placeholder = Math.min(...anos);
    document.getElementById('filtro-ano-max').placeholder = Math.max(...anos);
    mostrarGrupo('filtro-ano-min', true);
  } else {
    mostrarGrupo('filtro-ano-min', false);
  }

  // Horímetro
  const horas = estado.todos.map(p => extrairNumero(p.horimetro)).filter(v => v !== null);
  if (horas.length) {
    document.getElementById('filtro-horas-max').placeholder = 'Máx: ' + Math.max(...horas).toLocaleString('pt-BR') + 'h';
    mostrarGrupo('filtro-horas-max', true);
  } else {
    mostrarGrupo('filtro-horas-max', false);
  }

  // Peso
  const pesos = estado.todos.map(p => extrairNumero(p.peso)).filter(v => v !== null);
  if (pesos.length) {
    document.getElementById('filtro-peso-max').placeholder = 'Máx: ' + Math.max(...pesos) + 't';
    mostrarGrupo('filtro-peso-max', true);
  } else {
    mostrarGrupo('filtro-peso-max', false);
  }
}

// ─── Eventos ─────────────────────────────────────────────────
function iniciarEventos() {
  const inputBusca = document.getElementById('busca-input');
  if (inputBusca) {
    inputBusca.addEventListener('input', () => {
      estado.texto = inputBusca.value.trim().toLowerCase();
      renderizarProdutos(true);
    });
  }

  const toggleEstoque = document.getElementById('toggle-estoque');
  const switchEl      = document.getElementById('switch-estoque');
  if (toggleEstoque) {
    toggleEstoque.addEventListener('click', () => {
      estado.apenasEstoque = !estado.apenasEstoque;
      switchEl.classList.toggle('ativo', estado.apenasEstoque);
      renderizarProdutos(true);
    });
  }

  const select = document.getElementById('ordenar-select');
  if (select) {
    select.addEventListener('change', () => {
      estado.ordenar = select.value;
      renderizarProdutos(true);
    });
  }

  // Filtros extras
  bindFiltroInput('filtro-preco-min',  v => { estado.precoMin = v; });
  bindFiltroInput('filtro-preco-max',  v => { estado.precoMax = v; });
  bindFiltroInput('filtro-ano-min',    v => { estado.anoMin   = v; });
  bindFiltroInput('filtro-ano-max',    v => { estado.anoMax   = v; });
  bindFiltroInput('filtro-horas-max',  v => { estado.horas    = v; });
  bindFiltroInput('filtro-peso-max',   v => { estado.pesoMax  = v; });

  const btnLimpar = document.getElementById('btn-limpar-filtros');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparFiltros);
  }
}

function bindFiltroInput(id, setter) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => { setter(el.value.trim()); renderizarProdutos(true); });
}

function limparFiltros() {
  estado.texto          = '';
  estado.categorias     = new Set();
  estado.marcas         = new Set();
  estado.apenasEstoque  = false;
  estado.ordenar        = 'padrao';
  estado.precoMin       = '';
  estado.precoMax       = '';
  estado.anoMin         = '';
  estado.anoMax         = '';
  estado.horas          = '';
  estado.pesoMax        = '';

  ['busca-input','filtro-preco-min','filtro-preco-max','filtro-ano-min','filtro-ano-max','filtro-horas-max','filtro-peso-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('switch-estoque')?.classList.remove('ativo');
  const select = document.getElementById('ordenar-select');
  if (select) select.value = 'padrao';
  document.querySelectorAll('.filtro-categoria-check, .filtro-marca-check').forEach(cb => cb.checked = false);

  renderizarProdutos(true);
}

// ─── Filtragem ────────────────────────────────────────────────
function filtrarProdutos() {
  return estado.todos.filter(p => {
    // Texto
    if (estado.texto) {
      const t = estado.texto;
      const match = (p.nome        || '').toLowerCase().includes(t) ||
                    (p.descricao   || '').toLowerCase().includes(t) ||
                    (p.categoria   || '').toLowerCase().includes(t) ||
                    (p.marca       || '').toLowerCase().includes(t);
      if (!match) return false;
    }

    // Categorias
    if (estado.categorias.size > 0 && !estado.categorias.has(p.categoria)) return false;

    // Apenas em estoque
    if (estado.apenasEstoque && p.estoque <= 0) return false;

    // Faixa de preço
    if (estado.precoMin || estado.precoMax) {
      const preco = extrairNumero(p.valor);
      if (preco !== null) {
        if (estado.precoMin && preco < parseFloat(estado.precoMin)) return false;
        if (estado.precoMax && preco > parseFloat(estado.precoMax)) return false;
      }
    }

    // Ano
    if (estado.anoMin && p.ano && parseInt(p.ano) < parseInt(estado.anoMin)) return false;
    if (estado.anoMax && p.ano && parseInt(p.ano) > parseInt(estado.anoMax)) return false;

    // Horas máximas
    if (estado.horas && p.horimetro) {
      const h = extrairNumero(p.horimetro);
      if (h !== null && h > parseFloat(estado.horas)) return false;
    }

    // Marcas (checkboxes — qualquer marcada deve corresponder)
    if (estado.marcas.size > 0 && !estado.marcas.has(p.marca || '')) return false;

    // Peso máximo (em toneladas — extrai número do campo)
    if (estado.pesoMax) {
      const pesoNum = extrairNumero(p.peso);
      if (pesoNum !== null && pesoNum > parseFloat(estado.pesoMax)) return false;
    }

    return true;
  });
}

function extrairNumero(str) {
  if (!str) return null;
  const n = parseFloat(String(str).replace(/[^\d,\.]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function ordenarProdutos(lista) {
  const copia = [...lista];
  switch (estado.ordenar) {
    case 'nome-az':        return copia.sort((a, b) => a.nome.localeCompare(b.nome));
    case 'nome-za':        return copia.sort((a, b) => b.nome.localeCompare(a.nome));
    case 'preco-menor':    return copia.sort((a, b) => (extrairNumero(a.valor)||Infinity) - (extrairNumero(b.valor)||Infinity));
    case 'preco-maior':    return copia.sort((a, b) => (extrairNumero(b.valor)||0) - (extrairNumero(a.valor)||0));
    case 'ano-novo':       return copia.sort((a, b) => (parseInt(b.ano)||0) - (parseInt(a.ano)||0));
    case 'estoque-maior':  return copia.sort((a, b) => (b.estoque || 0) - (a.estoque || 0));
    case 'destaque':       return copia.sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
    default:               return copia;
  }
}

// ─── Renderização ─────────────────────────────────────────────
function renderizarProdutos(rolarParaGrid = false) {
  const grid   = document.getElementById('produtos-grid');
  const contEl = document.getElementById('contagem-resultados');
  if (!grid) return;

  const filtrados = ordenarProdutos(filtrarProdutos());

  if (contEl) {
    contEl.innerHTML = `<strong>${filtrados.length}</strong> equipamento${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}`;
  }

  if (!filtrados.length) {
    grid.innerHTML = `
      <div class="sem-resultados" style="grid-column:1/-1;">
        <div class="sem-resultados__icone"></div>
        <p class="sem-resultados__titulo">Nenhum equipamento encontrado</p>
        <p class="sem-resultados__texto">Tente ajustar os filtros ou pesquise por outro termo.</p>
        <button onclick="limparFiltros()" class="btn btn--azul" style="margin-top:20px;">Limpar filtros</button>
      </div>`;
  } else {
    grid.innerHTML = filtrados.map((p, i) => gerarCardHTML(p, i)).join('');
  }

  if (typeof AOS !== 'undefined') AOS.refresh();

  if (rolarParaGrid && window.innerWidth <= 1024) {
    setTimeout(() => {
      document.getElementById('produtos-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }
}

// ─── Card Marketplace ─────────────────────────────────────────
function gerarCardHTML(p, i) {
  const semEstoque = p.estoque <= 0 ? 'sem-estoque' : '';

  // Badges de condição (esquerda)
  const badgeCondicao = p.condicao ? badgeCondicaoHTML(p.condicao) : '';
  // Marca d'água CheckMaq (canto superior direito)
  const sealWatermark = p.destaque ? '<img src="/imagens/uploads/checkmaq-aprovado.png" class="mkt-seal-watermark" alt="CheckMaq Aprovado">' : '';

  const precoHTML = p.valor
    ? `<div class="mkt-preco">${formatarPreco(p.valor)}</div>`
    : '';

  const imgHTML = p.imagem
    ? `<img src="${p.imagem}" alt="${p.nome}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-size:0.8rem;font-weight:600;color:var(--cinza-texto);text-transform:uppercase;letter-spacing:0.08em;">${p.categoria}</span>`;

  return `
    <article class="produto-card mkt-card ${semEstoque}" data-aos="fade-up" data-aos-delay="${(i % 3) * 50}"
         onclick="window.location.href='/produto.html?id=${p.id}'" style="cursor:pointer;">
      <div class="produto-card__imagem mkt-card__img">
        ${imgHTML}
        <div class="mkt-badges-topo">
          ${badgeCondicao}
        </div>
        ${sealWatermark}
      </div>
      <div class="produto-card__corpo mkt-card__corpo">
        <span class="produto-card__categoria">${p.categoria}</span>
        <h3 class="produto-card__nome">${destacarTexto(p.nome, estado.texto)}</h3>
        ${precoHTML}
        <div class="mkt-card__rodape">
          ${badgeEstoqueHTML(p.estoque)}
          <span class="mkt-ver-btn">Ver detalhes →</span>
        </div>
      </div>
    </article>
  `;
}

// ─── Helpers ─────────────────────────────────────────────────
function badgeEstoqueHTML(qtd) {
  if (qtd <= 0) {
    return `<span class="estoque-badge estoque-badge--indisponivel"><span class="estoque-badge__dot"></span> Indisponível</span>`;
  }
  if (qtd <= 2) {
    return `<span class="estoque-badge estoque-badge--ultima"><span class="estoque-badge__dot"></span> Última${qtd > 1 ? 's ' + qtd : ''} unidade${qtd > 1 ? 's' : ''}</span>`;
  }
  return `<span class="estoque-badge estoque-badge--disponivel"><span class="estoque-badge__dot"></span> Disponível</span>`;
}

function badgeCondicaoHTML(condicao) {
  const mapa = {
    'seminova':    { label: 'Seminova',    cor: 'verde' },
    'oportunidade':{ label: 'Oportunidade',cor: 'laranja' },
    'nova':        { label: 'Nova',        cor: 'azul' },
    'usada':       { label: 'Usada',       cor: 'cinza' },
  };
  const chave = (condicao || '').toLowerCase();
  const cfg = mapa[chave] || { label: condicao, cor: 'cinza' };
  return `<span class="mkt-badge mkt-badge--${cfg.cor}">${cfg.label}</span>`;
}

function formatarPreco(valor) {
  if (!valor) return '';
  const num = extrairNumero(valor);
  if (num !== null) {
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return String(valor);
}

function destacarTexto(texto, termo) {
  if (!termo) return texto;
  const re = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return texto.replace(re, '<mark style="background:rgba(232,98,42,0.2);border-radius:2px;padding:0 2px;">$1</mark>');
}

// ─── Preenche campo de contato com equipamento selecionado ───
document.addEventListener('DOMContentLoaded', () => {
  const params      = new URLSearchParams(window.location.search);
  const equipamento = params.get('equipamento');
  const campoAssunto = document.getElementById('assunto');
  if (equipamento && campoAssunto) {
    const opcaoExistente = [...campoAssunto.options].find(o =>
      o.value.toLowerCase().includes(equipamento.toLowerCase())
    );
    if (!opcaoExistente) {
      const op = new Option(`Equipamento: ${equipamento}`, equipamento, true, true);
      campoAssunto.add(op);
    }
  }
});
