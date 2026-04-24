// ============================================================
// Painel Administrativo - Forcemak Prime
// ============================================================

// ─── Autenticação ────────────────────────────────────────────
const token   = localStorage.getItem('forcemak_token');
const usuario = localStorage.getItem('forcemak_usuario');

if (!token) {
  window.location.href = '/admin/login.html';
}

// Preenche nome do usuário na sidebar
if (usuario) {
  const elNome   = document.getElementById('nome-usuario');
  const elAvatar = document.getElementById('avatar-letra');
  if (elNome)   elNome.textContent   = usuario;
  if (elAvatar) elAvatar.textContent = usuario.charAt(0).toUpperCase();
}

// Botão sair
document.getElementById('btn-sair')?.addEventListener('click', fazerLogout);

function fazerLogout() {
  localStorage.removeItem('forcemak_token');
  localStorage.removeItem('forcemak_usuario');
  window.location.href = '/admin/login.html';
}


// ─── Utilitários ─────────────────────────────────────────────
function cabecalhoAuth() {
  return {
    'Content-Type':  'application/json',
    'Authorization': 'Bearer ' + token
  };
}

function mostrarToast(msg, tipo = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast ' + tipo + ' visivel';
  setTimeout(() => el.classList.remove('visivel'), 3500);
}

function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}


// ─── Navegação entre seções ───────────────────────────────────
const titulos = {
  'visao-geral': 'Visão Geral',
  'mensagens':   'Mensagens',
  'produtos':    'Produtos',
  'estoque':     'Estoque',
  'textos':      'Textos do Site',
  'midias':      'Mídias Sociais',
  'facebook':    'Facebook / Meta',
  'senha':       'Alterar Senha'
};

function irParaSecao(nome) {
  // Atualiza links da sidebar
  document.querySelectorAll('.sidebar__link').forEach(l => {
    l.classList.toggle('ativo', l.dataset.secao === nome);
  });

  // Mostra/oculta seções
  document.querySelectorAll('.secao-painel').forEach(s => {
    s.classList.toggle('ativa', s.id === 'sec-' + nome);
  });

  // Atualiza título do topo
  const el = document.getElementById('titulo-secao');
  if (el) el.textContent = titulos[nome] || nome;

  // Carrega dados ao trocar de seção
  if (nome === 'visao-geral') carregarVisaoGeral();
  if (nome === 'mensagens')   carregarMensagens();
  if (nome === 'produtos')    carregarProdutosAdmin();
  if (nome === 'estoque')     carregarEstoque();
  if (nome === 'textos')      carregarTextosAdmin();
  if (nome === 'midias')      carregarMidias();
  if (nome === 'facebook')    carregarFacebook();
}

// Cliques na sidebar
document.querySelectorAll('.sidebar__link[data-secao]').forEach(btn => {
  btn.addEventListener('click', () => irParaSecao(btn.dataset.secao));
});

// Carrega visão geral ao iniciar
irParaSecao('visao-geral');


// ════════════════════════════════════════════════════════════
// VISÃO GERAL
// ════════════════════════════════════════════════════════════

async function carregarVisaoGeral() {
  try {
    const [resMsgs, resPrds] = await Promise.all([
      fetch('/api/contato',  { headers: cabecalhoAuth() }),
      fetch('/api/produtos', { headers: cabecalhoAuth() })
    ]);

    const msgs = await resMsgs.json();
    const prds = await resPrds.json();

    const naoLidas = Array.isArray(msgs) ? msgs.filter(m => !m.lida).length : 0;
    const destaque = Array.isArray(prds) ? prds.filter(p => p.destaque).length : 0;

    document.getElementById('total-mensagens').textContent = Array.isArray(msgs) ? msgs.length : 0;
    document.getElementById('total-nao-lidas').textContent = naoLidas;
    document.getElementById('total-produtos').textContent  = Array.isArray(prds) ? prds.length : 0;
    document.getElementById('total-destaque').textContent  = destaque;

    // Badge de não lidas na sidebar
    const badge = document.getElementById('badge-mensagens');
    if (badge && naoLidas > 0) {
      badge.textContent    = naoLidas;
      badge.style.display  = 'inline-block';
    }

    // Últimas 5 mensagens
    const ultimas = Array.isArray(msgs) ? msgs.slice(0, 5) : [];
    const tbody   = document.getElementById('tabela-ultimas-mensagens');
    if (!ultimas.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#999;">Nenhuma mensagem ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = ultimas.map(m => `
      <tr>
        <td><strong>${m.nome}</strong></td>
        <td>${m.email}</td>
        <td>${m.assunto || '—'}</td>
        <td style="font-size:0.82rem;color:#999;">${formatarData(m.data)}</td>
        <td><span class="badge ${m.lida ? 'badge--lida' : 'badge--nova'}">${m.lida ? 'Lida' : 'Nova'}</span></td>
      </tr>
    `).join('');

  } catch (e) {
    console.error('Erro ao carregar visão geral:', e);
  }
}


// ════════════════════════════════════════════════════════════
// MENSAGENS
// ════════════════════════════════════════════════════════════

async function carregarMensagens() {
  const tbody = document.getElementById('tabela-mensagens');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#999;">Carregando...</td></tr>';

  try {
    const res  = await fetch('/api/contato', { headers: cabecalhoAuth() });
    const msgs = await res.json();

    if (!Array.isArray(msgs) || !msgs.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#999;">Nenhuma mensagem recebida.</td></tr>';
      return;
    }

    tbody.innerHTML = msgs.map(m => `
      <tr id="msg-${m.id}">
        <td><strong>${m.nome}</strong></td>
        <td><a href="mailto:${m.email}" style="color:var(--azul);">${m.email}</a></td>
        <td>${m.telefone || '—'}</td>
        <td>${m.assunto || '—'}</td>
        <td style="max-width:200px;white-space:normal;font-size:0.82rem;">${m.mensagem}</td>
        <td style="font-size:0.78rem;color:#999;white-space:nowrap;">${formatarData(m.data)}</td>
        <td>
          ${!m.lida
            ? `<button class="btn-admin btn-admin--outline" style="font-size:0.78rem;"
                onclick="marcarLida(${m.id})">✓ Marcar lida</button>`
            : `<span class="badge badge--lida">Lida</span>`
          }
        </td>
      </tr>
    `).join('');

  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#e00;">Erro ao carregar mensagens.</td></tr>';
  }
}

async function marcarLida(id) {
  try {
    await fetch(`/api/contato/${id}/lida`, {
      method:  'PUT',
      headers: cabecalhoAuth()
    });
    mostrarToast('Mensagem marcada como lida', 'sucesso');
    carregarMensagens();
  } catch {
    mostrarToast('Erro ao atualizar mensagem', 'erro');
  }
}


// ════════════════════════════════════════════════════════════
// PRODUTOS
// ════════════════════════════════════════════════════════════

async function carregarProdutosAdmin() {
  const lista = document.getElementById('lista-produtos-admin');
  lista.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Carregando...</p>';

  try {
    const res   = await fetch('/api/produtos');
    const prods = await res.json();

    if (!prods.length) {
      lista.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhum produto cadastrado.</p>';
      return;
    }

    lista.innerHTML = prods.map(p => `
      <div class="produto-admin-item">
        <div class="produto-admin-item__info">
          <div class="produto-admin-item__nome">${p.nome}</div>
          <div class="produto-admin-item__categoria">
            ${p.categoria}${p.marca ? ` · ${p.marca}` : ''}${p.ano ? ` · ${p.ano}` : ''}${p.valor ? ` · ${p.valor}` : ''}${p.destaque ? ' ⭐' : ''}
          </div>
        </div>
        <div class="produto-admin-item__acoes">
          <button class="btn-admin btn-admin--outline" onclick="editarProduto(${p.id})">
            ✏️ Editar
          </button>
          <button class="btn-admin btn-admin--perigo" onclick="excluirProduto(${p.id}, '${p.nome.replace(/'/g,'`')}')">
            🗑️ Excluir
          </button>
        </div>
      </div>
    `).join('');

  } catch {
    lista.innerHTML = '<p style="color:#e00;text-align:center;">Erro ao carregar produtos.</p>';
  }
}

// Upload de fotos — slots 1 a 10
function criarUploadHandler(num) {
  const fileInput = document.getElementById(`prod-foto-file-${num}`);
  if (!fileInput) return;
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('upload-status');
    status.textContent = `Enviando foto ${num}...`;
    status.style.color = '#999';
    const formData = new FormData();
    formData.append('imagem', file);
    try {
      const res  = await fetch('/api/upload', {
        method:  'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body:    formData
      });
      const json = await res.json();
      if (json.url) {
        document.getElementById(`prod-imagem-${num}`).value = json.url;
        document.getElementById(`prod-foto-img-${num}`).src = json.url;
        document.getElementById(`prod-foto-preview-${num}`).style.display = 'block';
        status.textContent = `Foto ${num} enviada!`;
        status.style.color = '#22c55e';
        setTimeout(() => { status.textContent = ''; status.style.color = '#999'; }, 3000);
      } else {
        throw new Error(json.erro || 'Erro no upload');
      }
    } catch(err) {
      status.textContent = 'Erro: ' + err.message;
      status.style.color = '#ef4444';
    }
  });
}
for (let i = 1; i <= 10; i++) criarUploadHandler(i);

// Salvar produto (criar ou editar)
document.getElementById('form-produto').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id      = document.getElementById('produto-id').value;
  const estoque = parseInt(document.getElementById('prod-estoque').value) || 0;

  const imagens = [1,2,3,4,5,6,7,8,9,10]
    .map(n => document.getElementById(`prod-imagem-${n}`).value)
    .filter(Boolean);

  const dados = {
    nome:        document.getElementById('prod-nome').value,
    categoria:   document.getElementById('prod-categoria').value,
    descricao:   document.getElementById('prod-descricao').value,
    marca:       document.getElementById('prod-marca').value,
    peso:        document.getElementById('prod-peso').value,
    ano:         document.getElementById('prod-ano').value,
    horimetro:   document.getElementById('prod-horimetro').value,
    localizacao: document.getElementById('prod-localizacao').value,
    valor:       document.getElementById('prod-valor').value,
    condicao:    document.getElementById('prod-condicao').value,
    unidade:     'Unidade',
    estoque,
    imagem:      imagens[0] || '',
    imagens:     imagens,
    destaque:    document.getElementById('prod-destaque').checked
  };

  const btn = document.getElementById('btn-salvar-produto');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  try {
    const url    = id ? `/api/produtos/${id}` : '/api/produtos';
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method:  metodo,
      headers: cabecalhoAuth(),
      body:    JSON.stringify(dados)
    });
    const json = await res.json();

    if (json.sucesso || json.id) {
      mostrarToast(id ? 'Equipamento atualizado!' : 'Equipamento cadastrado!', 'sucesso');
      cancelarEdicaoProduto();
      carregarProdutosAdmin();
    } else {
      throw new Error(json.erro);
    }
  } catch (err) {
    mostrarToast(err.message || 'Erro ao salvar equipamento', 'erro');
  }

  btn.disabled = false;
  btn.textContent = 'Salvar Equipamento';
});

async function editarProduto(id) {
  try {
    const res   = await fetch('/api/produtos');
    const prods = await res.json();
    const prod  = prods.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('produto-id').value       = prod.id;
    document.getElementById('prod-nome').value        = prod.nome;
    document.getElementById('prod-categoria').value   = prod.categoria;
    document.getElementById('prod-descricao').value   = prod.descricao   || '';
    document.getElementById('prod-estoque').value     = prod.estoque ?? 1;
    document.getElementById('prod-marca').value       = prod.marca       || '';
    document.getElementById('prod-peso').value        = prod.peso        || '';
    document.getElementById('prod-ano').value         = prod.ano         || '';
    document.getElementById('prod-horimetro').value   = prod.horimetro   || '';
    document.getElementById('prod-localizacao').value = prod.localizacao || '';
    document.getElementById('prod-valor').value       = prod.valor       || '';
    document.getElementById('prod-condicao').value    = prod.condicao    || '';
    document.getElementById('prod-destaque').checked  = prod.destaque    || false;

    // Preenche slots de foto
    const todasFotos = (prod.imagens && prod.imagens.length > 0)
      ? prod.imagens
      : (prod.imagem ? [prod.imagem] : []);
    for (let n = 1; n <= 10; n++) {
      const url = todasFotos[n-1] || '';
      document.getElementById(`prod-imagem-${n}`).value = url;
      if (url) {
        document.getElementById(`prod-foto-img-${n}`).src = url;
        document.getElementById(`prod-foto-preview-${n}`).style.display = 'block';
      }
    }

    document.getElementById('titulo-form-produto').textContent = 'Editando Equipamento';
    document.getElementById('btn-salvar-produto').textContent  = 'Atualizar Equipamento';
    document.getElementById('btn-cancelar-produto').style.display = 'inline-flex';

    document.getElementById('form-produto').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    mostrarToast('Erro ao carregar equipamento', 'erro');
  }
}

function cancelarEdicaoProduto() {
  document.getElementById('form-produto').reset();
  document.getElementById('produto-id').value = '';
  for (let n = 1; n <= 10; n++) {
    document.getElementById(`prod-imagem-${n}`).value = '';
    document.getElementById(`prod-foto-preview-${n}`).style.display = 'none';
  }
  document.getElementById('titulo-form-produto').textContent = 'Adicionar Equipamento';
  document.getElementById('btn-salvar-produto').textContent  = 'Salvar Equipamento';
  document.getElementById('btn-cancelar-produto').style.display = 'none';
}

async function excluirProduto(id, nome) {
  if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
  try {
    const res  = await fetch(`/api/produtos/${id}`, {
      method:  'DELETE',
      headers: cabecalhoAuth()
    });
    const json = await res.json();
    if (json.sucesso) {
      mostrarToast('Produto excluído!', 'sucesso');
      carregarProdutosAdmin();
    }
  } catch {
    mostrarToast('Erro ao excluir produto', 'erro');
  }
}


// ════════════════════════════════════════════════════════════
// TEXTOS DO SITE
// ════════════════════════════════════════════════════════════

async function carregarTextosAdmin() {
  try {
    const res     = await fetch('/api/conteudo');
    const dados   = await res.json();

    // Hero
    if (dados.hero) {
      document.getElementById('hero-titulo').value        = dados.hero.titulo || '';
      document.getElementById('hero-subtitulo').value     = dados.hero.subtitulo || '';
      document.getElementById('hero-btn-principal').value = dados.hero.botaoPrincipal || '';
      document.getElementById('hero-btn-secundario').value= dados.hero.botaoSecundario || '';
    }

    // Sobre
    if (dados.sobre) {
      document.getElementById('sobre-destaque').value = dados.sobre.destaque   || '';
      document.getElementById('sobre-p1').value       = dados.sobre.paragrafo1 || '';
      document.getElementById('sobre-p2').value       = dados.sobre.paragrafo2 || '';
    }

    // Rodapé / Contato
    if (dados.rodape) {
      document.getElementById('rodape-email').value    = dados.rodape.email    || '';
      document.getElementById('rodape-telefone').value = dados.rodape.telefone || '';
      document.getElementById('rodape-cnpj').value     = dados.rodape.cnpj     || '';
      document.getElementById('rodape-endereco').value = dados.rodape.endereco || '';
    }
  } catch {
    mostrarToast('Erro ao carregar textos', 'erro');
  }
}

async function salvarSecao(secao, dados) {
  try {
    const res  = await fetch(`/api/conteudo/${secao}`, {
      method:  'PUT',
      headers: cabecalhoAuth(),
      body:    JSON.stringify(dados)
    });
    const json = await res.json();
    if (json.sucesso) mostrarToast('Salvo com sucesso!', 'sucesso');
    else throw new Error(json.erro);
  } catch (err) {
    mostrarToast(err.message || 'Erro ao salvar', 'erro');
  }
}

document.getElementById('form-hero').addEventListener('submit', async (e) => {
  e.preventDefault();
  await salvarSecao('hero', {
    titulo:          document.getElementById('hero-titulo').value,
    subtitulo:       document.getElementById('hero-subtitulo').value,
    botaoPrincipal:  document.getElementById('hero-btn-principal').value,
    botaoSecundario: document.getElementById('hero-btn-secundario').value
  });
});

document.getElementById('form-sobre').addEventListener('submit', async (e) => {
  e.preventDefault();
  await salvarSecao('sobre', {
    destaque:   document.getElementById('sobre-destaque').value,
    paragrafo1: document.getElementById('sobre-p1').value,
    paragrafo2: document.getElementById('sobre-p2').value
  });
});

document.getElementById('form-rodape').addEventListener('submit', async (e) => {
  e.preventDefault();
  await salvarSecao('rodape', {
    email:    document.getElementById('rodape-email').value,
    telefone: document.getElementById('rodape-telefone').value,
    cnpj:     document.getElementById('rodape-cnpj').value,
    endereco: document.getElementById('rodape-endereco').value
  });
});


// ════════════════════════════════════════════════════════════
// FACEBOOK / META
// ════════════════════════════════════════════════════════════

async function carregarFacebook() {
  const conteudo = document.getElementById('facebook-conteudo');
  conteudo.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Carregando dados...</p>';

  try {
    const res  = await fetch('/api/facebook/metricas', { headers: cabecalhoAuth() });
    const json = await res.json();

    if (!json.configurado) {
      conteudo.innerHTML = `
        <div class="facebook-config-aviso">
          <h4>⚠️ API do Facebook não configurada</h4>
          <p>${json.mensagem}</p>
        </div>
      `;
      return;
    }

    const d = json.dados || {};
    conteudo.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <p style="font-size:0.8rem;color:var(--cinza-texto);font-weight:600;">Nome do Pixel</p>
          <p style="font-weight:700;margin-top:4px;">${d.name || '—'}</p>
        </div>
        <div>
          <p style="font-size:0.8rem;color:var(--cinza-texto);font-weight:600;">Status</p>
          <p style="font-weight:700;margin-top:4px;color:${d.is_unavailable ? '#ef4444' : '#22c55e'};">
            ${d.is_unavailable ? '❌ Inativo' : '✅ Ativo'}
          </p>
        </div>
        <div>
          <p style="font-size:0.8rem;color:var(--cinza-texto);font-weight:600;">Último Disparo</p>
          <p style="font-weight:700;margin-top:4px;">${d.last_fired_time ? formatarData(d.last_fired_time) : '—'}</p>
        </div>
        <div>
          <p style="font-size:0.8rem;color:var(--cinza-texto);font-weight:600;">ID do Pixel</p>
          <p style="font-weight:700;margin-top:4px;">1433120138425099</p>
        </div>
      </div>
    `;
  } catch {
    conteudo.innerHTML = '<p style="color:#e00;text-align:center;">Erro ao conectar com a API do Facebook.</p>';
  }
}


// ════════════════════════════════════════════════════════════
// ESTOQUE
// ════════════════════════════════════════════════════════════

async function carregarEstoque() {
  const lista = document.getElementById('lista-estoque');
  if (!lista) return;
  lista.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Carregando...</p>';

  try {
    const res   = await fetch('/api/produtos');
    const prods = await res.json();

    if (!prods.length) {
      lista.innerHTML = '<p style="color:#999;text-align:center;">Nenhum produto cadastrado.</p>';
      return;
    }

    lista.innerHTML = `
      <div style="margin-bottom:14px;display:flex;justify-content:flex-end;">
        <button class="btn-admin btn-admin--laranja" onclick="irParaSecao('produtos')">
          + Adicionar Equipamento
        </button>
      </div>
      <table class="tabela">
        <thead>
          <tr>
            <th>Equipamento</th>
            <th>Categoria</th>
            <th style="text-align:center;">Qtd</th>
            <th>Ajustar</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${prods.map(p => `
            <tr id="estoque-row-${p.id}">
              <td><strong>${p.nome}</strong></td>
              <td style="font-size:0.82rem;">${p.categoria}</td>
              <td style="font-size:1.1rem;font-weight:800;text-align:center;"
                  id="estoque-val-${p.id}">${p.estoque || 0}</td>
              <td>
                <div class="estoque-controle">
                  <button class="estoque-btn" onclick="alterarEstoque(${p.id}, -1)">−</button>
                  <input type="number" class="estoque-numero" value="${p.estoque || 0}"
                    id="estoque-input-${p.id}" min="0"
                    onchange="salvarEstoqueDirecto(${p.id}, this.value)">
                  <button class="estoque-btn" onclick="alterarEstoque(${p.id}, 1)">+</button>
                </div>
              </td>
              <td>${badgeEstoqueAdmin(p.estoque || 0)}</td>
              <td>
                <button class="btn-admin btn-admin--perigo" style="padding:6px 12px;font-size:0.78rem;"
                  onclick="excluirProdutoEstoque(${p.id}, '${p.nome.replace(/'/g,'`')}')">
                  Remover
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch {
    lista.innerHTML = '<p style="color:#e00;text-align:center;">Erro ao carregar estoque.</p>';
  }
}

async function excluirProdutoEstoque(id, nome) {
  if (!confirm(`Remover "${nome}" do catálogo?\n\nEssa ação não pode ser desfeita.`)) return;
  try {
    const res  = await fetch(`/api/produtos/${id}`, {
      method:  'DELETE',
      headers: cabecalhoAuth()
    });
    const json = await res.json();
    if (json.sucesso) {
      mostrarToast('Equipamento removido!', 'sucesso');
      carregarEstoque();
    }
  } catch {
    mostrarToast('Erro ao remover equipamento', 'erro');
  }
}

function badgeEstoqueAdmin(qtd) {
  if (qtd <= 0)  return '<span class="badge" style="background:rgba(239,68,68,0.1);color:#dc2626;">Indisponível</span>';
  if (qtd <= 2)  return '<span class="badge badge--destaque">Últimas unidades</span>';
  return '<span class="badge badge--lida">Disponível</span>';
}

async function alterarEstoque(id, delta) {
  const input = document.getElementById(`estoque-input-${id}`);
  const novoValor = Math.max(0, parseInt(input.value || 0) + delta);
  input.value = novoValor;
  await salvarEstoqueDirecto(id, novoValor);
}

async function salvarEstoqueDirecto(id, valor) {
  const qtd = Math.max(0, parseInt(valor) || 0);
  try {
    await fetch(`/api/produtos/${id}/estoque`, {
      method:  'PATCH',
      headers: cabecalhoAuth(),
      body:    JSON.stringify({ estoque: qtd })
    });
    // Atualiza célula de valor e badge de status automaticamente
    const cell  = document.getElementById(`estoque-val-${id}`);
    const row   = document.getElementById(`estoque-row-${id}`);
    if (cell) cell.textContent = qtd;
    if (row) {
      const statusCell = row.querySelector('td:last-child');
      if (statusCell) statusCell.innerHTML = badgeEstoqueAdmin(qtd);
    }
    mostrarToast(qtd > 0 ? `Disponível — ${qtd} unidade(s)` : 'Marcado como indisponível', 'sucesso');
  } catch {
    mostrarToast('Erro ao atualizar estoque', 'erro');
  }
}


// ════════════════════════════════════════════════════════════
// MÍDIAS SOCIAIS
// ════════════════════════════════════════════════════════════

let videosIds    = [];
let instagramUrls = [];

async function carregarMidias() {
  try {
    const res   = await fetch('/api/conteudo');
    const dados = await res.json();
    videosIds     = dados.midia?.youtube?.videos     || [];
    instagramUrls = dados.midia?.instagram?.posts    || [];
    renderizarTagsVideos();
    renderizarTagsInstagram();
  } catch {
    mostrarToast('Erro ao carregar mídias', 'erro');
  }
}

function renderizarTagsVideos() {
  const el = document.getElementById('videos-tags');
  if (!el) return;
  el.innerHTML = videosIds.length
    ? videosIds.map((id, i) => `
        <span class="video-tag">
          🎬 ${id}
          <span class="video-tag__remover" onclick="removerVideo(${i})">×</span>
        </span>`).join('')
    : '<span style="color:#999;font-size:0.82rem;">Nenhum vídeo adicionado</span>';
}

function renderizarTagsInstagram() {
  const el = document.getElementById('instagram-tags');
  if (!el) return;
  el.innerHTML = instagramUrls.length
    ? instagramUrls.map((url, i) => `
        <span class="video-tag">
          📸 ${url.split('/p/')[1]?.replace('/','') || url}
          <span class="video-tag__remover" onclick="removerInstagram(${i})">×</span>
        </span>`).join('')
    : '<span style="color:#999;font-size:0.82rem;">Nenhum post adicionado</span>';
}

function adicionarVideo() {
  const input = document.getElementById('input-video-id');
  const raw   = input.value.trim();
  // Aceita URL completa, youtu.be, embed/, ou ID de 11 chars
  const match = raw.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const videoId = match ? match[1] : (raw.length === 11 ? raw : null);
  if (!videoId) {
    mostrarToast('Cole a URL do vídeo ou o ID (11 caracteres)', 'erro');
    return;
  }
  if (!videosIds.includes(videoId)) {
    videosIds.push(videoId);
    salvarMidias(false); // auto-salva
  }
  input.value = '';
  renderizarTagsVideos();
}

function removerVideo(idx) {
  videosIds.splice(idx, 1);
  renderizarTagsVideos();
  salvarMidias(false); // auto-salva ao remover
}

function adicionarInstagram() {
  const input = document.getElementById('input-instagram-url');
  const url   = input.value.trim();
  if (!url.includes('instagram.com/p/')) {
    mostrarToast('URL do Instagram inválida', 'erro');
    return;
  }
  if (!instagramUrls.includes(url)) instagramUrls.push(url);
  input.value = '';
  renderizarTagsInstagram();
}

function removerInstagram(idx) {
  instagramUrls.splice(idx, 1);
  renderizarTagsInstagram();
}

async function salvarMidias(mostrar = true) {
  try {
    const res   = await fetch('/api/conteudo');
    const dados = await res.json();

    const midiaAtualizada = {
      ...dados.midia,
      youtube:   { ...dados.midia?.youtube,   videos: videosIds },
      instagram: { ...dados.midia?.instagram, posts:  instagramUrls }
    };

    const r = await fetch('/api/conteudo/midia', {
      method:  'PUT',
      headers: cabecalhoAuth(),
      body:    JSON.stringify(midiaAtualizada)
    });
    const json = await r.json();
    if (!json.sucesso) throw new Error('Falha ao salvar');
    if (mostrar) mostrarToast('Vídeos salvos com sucesso!', 'sucesso');
  } catch {
    if (mostrar) mostrarToast('Erro ao salvar vídeos', 'erro');
  }
}


// ════════════════════════════════════════════════════════════
// ALTERAR SENHA
// ════════════════════════════════════════════════════════════

document.getElementById('form-senha').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nova     = document.getElementById('nova-senha').value;
  const confirma = document.getElementById('confirmar-senha').value;

  if (nova !== confirma) {
    mostrarToast('As senhas não coincidem', 'erro');
    return;
  }

  if (nova.length < 6) {
    mostrarToast('A senha deve ter ao menos 6 caracteres', 'erro');
    return;
  }

  try {
    const res  = await fetch('/api/admin/alterar-senha', {
      method:  'POST',
      headers: cabecalhoAuth(),
      body:    JSON.stringify({
        senhaAtual: document.getElementById('senha-atual').value,
        novaSenha:  nova
      })
    });
    const json = await res.json();

    if (json.sucesso) {
      mostrarToast('Senha alterada com sucesso!', 'sucesso');
      document.getElementById('form-senha').reset();
    } else {
      throw new Error(json.erro);
    }
  } catch (err) {
    mostrarToast(err.message || 'Erro ao alterar senha', 'erro');
  }
});
