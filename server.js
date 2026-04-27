// ============================================================
// Servidor Principal - Forcemak Prime
// ============================================================
require('dotenv').config();

const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');
const multer    = require('multer');
const https     = require('https');
const crypto    = require('crypto');

const app          = express();
const PORTA        = process.env.PORT || 3000;
const JWT_SEGREDO  = process.env.JWT_SEGREDO || 'forcemak_segredo_padrao';
const PIXEL_ID     = process.env.FACEBOOK_PIXEL_ID  || '1433120138425099';
const CAPI_TOKEN   = process.env.FACEBOOK_ACCESS_TOKEN;

// ─── Meta Conversions API ─────────────────────────────────────
function hashSHA256(valor) {
  if (!valor) return null;
  return crypto.createHash('sha256').update(String(valor).toLowerCase().trim()).digest('hex');
}

function enviarEventoCAPI(eventos) {
  if (!CAPI_TOKEN) return Promise.resolve();
  const body = JSON.stringify({ data: eventos });
  return new Promise((resolve) => {
    const options = {
      hostname: 'graph.facebook.com',
      path:     `/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', () => resolve({}));
    req.write(body);
    req.end();
  });
}

// ─── Middlewares ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Disco persistente (Render Disk em /var/data) ────────────
const DISK_BASE   = fs.existsSync('/var/data') ? '/var/data' : path.join(__dirname);
const uploadsDir  = path.join(DISK_BASE, 'uploads');
const dadosDir    = path.join(DISK_BASE, 'dados');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dadosDir))   fs.mkdirSync(dadosDir,   { recursive: true });

// Migração: copia dados do repo para o disco na primeira inicialização
const dadosLocais = path.join(__dirname, 'dados');
if (dadosLocais !== dadosDir && fs.existsSync(dadosLocais)) {
  fs.readdirSync(dadosLocais).forEach(arq => {
    const dest = path.join(dadosDir, arq);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(dadosLocais, arq), dest);
  });
}

// Serve imagens do disco persistente em /imagens/uploads (antes do static geral)
app.use('/imagens/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

const armazenamento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage: armazenamento,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const permitidos = /jpeg|jpg|png|gif|webp|svg/;
    if (permitidos.test(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

// ─── Utilitários de dados ─────────────────────────────────────
function lerDados(arquivo) {
  const caminho = path.join(dadosDir, arquivo);
  if (!fs.existsSync(caminho)) return {};
  try { return JSON.parse(fs.readFileSync(caminho, 'utf8')); }
  catch { return {}; }
}

function salvarDados(arquivo, dados) {
  const caminho = path.join(dadosDir, arquivo);
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
}

// ─── Middleware de autenticação ───────────────────────────────
function verificarToken(req, res, next) {
  const cabecalho = req.headers['authorization'];
  const token = cabecalho && cabecalho.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Acesso não autorizado' });

  try {
    req.usuario = jwt.verify(token, JWT_SEGREDO);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// ─── Criação do admin inicial ─────────────────────────────────
// Roda ao iniciar: cria o admin padrão se não existir nenhum
function inicializarAdmin() {
  const usuarios = lerDados('usuarios.json');
  if (!usuarios.admins || usuarios.admins.length === 0) {
    const senhaHash = bcrypt.hashSync('admin123', 10);
    usuarios.admins = [{ usuario: 'admin', senhaHash }];
    salvarDados('usuarios.json', usuarios);
    console.log('\n🔐 Admin inicial criado!');
    console.log('   Usuário : admin');
    console.log('   Senha   : admin123');
    console.log('   ⚠️  Troque a senha após o primeiro login!\n');
  }
}


// ╔══════════════════════════════════════════════════════════════╗
// ║  ROTAS - AUTENTICAÇÃO                                        ║
// ╚══════════════════════════════════════════════════════════════╝

app.post('/api/admin/login', async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ erro: 'Preencha todos os campos' });

  const dados   = lerDados('usuarios.json');
  const admin   = (dados.admins || []).find(a => a.usuario === usuario);
  if (!admin) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const senhaOk = await bcrypt.compare(senha, admin.senhaHash);
  if (!senhaOk) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const token = jwt.sign({ usuario: admin.usuario, tipo: 'admin' }, JWT_SEGREDO, { expiresIn: '8h' });
  res.json({ token, usuario: admin.usuario });
});

app.post('/api/admin/alterar-senha', verificarToken, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha) return res.status(400).json({ erro: 'Preencha todos os campos' });

  const dados = lerDados('usuarios.json');
  const idx   = dados.admins.findIndex(a => a.usuario === req.usuario.usuario);
  if (idx === -1) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const senhaOk = await bcrypt.compare(senhaAtual, dados.admins[idx].senhaHash);
  if (!senhaOk) return res.status(401).json({ erro: 'Senha atual incorreta' });

  dados.admins[idx].senhaHash = bcrypt.hashSync(novaSenha, 10);
  salvarDados('usuarios.json', dados);
  res.json({ sucesso: true });
});


// ╔══════════════════════════════════════════════════════════════╗
// ║  ROTAS - CONTEÚDO (público: leitura / admin: escrita)        ║
// ╚══════════════════════════════════════════════════════════════╝

app.get('/api/conteudo', (req, res) => {
  res.json(lerDados('conteudo.json'));
});

app.put('/api/conteudo/:secao', verificarToken, (req, res) => {
  const conteudo = lerDados('conteudo.json');
  conteudo[req.params.secao] = req.body;
  salvarDados('conteudo.json', conteudo);
  res.json({ sucesso: true });
});


// ╔══════════════════════════════════════════════════════════════╗
// ║  ROTAS - PRODUTOS                                            ║
// ╚══════════════════════════════════════════════════════════════╝

// Busca avançada com filtros de texto, categoria e estoque
app.get('/api/produtos', (req, res) => {
  const dados = lerDados('produtos.json');
  let lista   = dados.produtos || [];

  const { q, categoria, estoque, ordenar } = req.query;

  if (q) {
    const termo = q.toLowerCase();
    lista = lista.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo) ||
      p.categoria.toLowerCase().includes(termo)
    );
  }

  if (categoria) {
    lista = lista.filter(p => p.categoria === categoria);
  }

  if (estoque === 'true') {
    lista = lista.filter(p => (p.estoque || 0) > 0);
  }

  if (ordenar === 'nome') lista.sort((a, b) => a.nome.localeCompare(b.nome));
  if (ordenar === 'estoque') lista.sort((a, b) => (b.estoque || 0) - (a.estoque || 0));

  res.json(lista);
});

app.post('/api/produtos', verificarToken, (req, res) => {
  const dados = lerDados('produtos.json');
  if (!dados.produtos) dados.produtos = [];
  const novo = { id: Date.now(), ...req.body };
  dados.produtos.push(novo);
  salvarDados('produtos.json', dados);
  res.json({ sucesso: true, produto: novo });
});

app.put('/api/produtos/:id', verificarToken, (req, res) => {
  const dados = lerDados('produtos.json');
  const idx = (dados.produtos || []).findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Produto não encontrado' });
  dados.produtos[idx] = { ...dados.produtos[idx], ...req.body };
  salvarDados('produtos.json', dados);
  res.json({ sucesso: true });
});

// Atualizar apenas o estoque de um produto
app.patch('/api/produtos/:id/estoque', verificarToken, (req, res) => {
  const { estoque } = req.body;
  if (estoque === undefined || isNaN(parseInt(estoque))) {
    return res.status(400).json({ erro: 'Valor de estoque inválido' });
  }
  const dados = lerDados('produtos.json');
  const idx = (dados.produtos || []).findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Produto não encontrado' });
  dados.produtos[idx].estoque = Math.max(0, parseInt(estoque));
  salvarDados('produtos.json', dados);
  res.json({ sucesso: true, estoque: dados.produtos[idx].estoque });
});

app.delete('/api/produtos/:id', verificarToken, (req, res) => {
  const dados = lerDados('produtos.json');
  const produto = (dados.produtos || []).find(p => p.id == req.params.id);
  // Remove imagens do disco ao deletar produto
  if (produto && Array.isArray(produto.imagens)) {
    produto.imagens.forEach(url => {
      const nome = path.basename(url);
      const arq  = path.join(uploadsDir, nome);
      if (fs.existsSync(arq)) fs.unlinkSync(arq);
    });
  }
  dados.produtos = (dados.produtos || []).filter(p => p.id != req.params.id);
  salvarDados('produtos.json', dados);
  res.json({ sucesso: true });
});


// ╔══════════════════════════════════════════════════════════════╗
// ║  MARCA D'ÁGUA — CheckMaq (top-right, branca, semi-opaca)     ║
// ╚══════════════════════════════════════════════════════════════╝

const LOGO_PATH = path.join(__dirname, 'public', 'imagens', 'uploads', 'checkmaq-laudo.png');

async function aplicarMarcaDagua(imagemPath) {
  const ext = path.extname(imagemPath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;
  if (!fs.existsSync(LOGO_PATH)) return;

  try {
    const { Jimp } = await import('jimp');

    const imagem = await Jimp.read(imagemPath);
    const logo   = await Jimp.read(LOGO_PATH);

    // Redimensiona logo para ~13% da largura da foto
    const logoW = Math.round(imagem.bitmap.width * 0.13);
    logo.resize({ w: logoW });

    // Converte pixels escuros em branco semi-transparente (marca d'água clara)
    logo.scan(0, 0, logo.bitmap.width, logo.bitmap.height, (px, py, idx) => {
      const r   = logo.bitmap.data[idx];
      const g   = logo.bitmap.data[idx + 1];
      const b   = logo.bitmap.data[idx + 2];
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      // Pixels escuros → opaco; pixels claros → transparente
      logo.bitmap.data[idx]     = 255;
      logo.bitmap.data[idx + 1] = 255;
      logo.bitmap.data[idx + 2] = 255;
      logo.bitmap.data[idx + 3] = Math.round((255 - lum) * 0.72);
    });

    // Canto superior direito, margem de 2% da largura
    const margem = Math.round(imagem.bitmap.width * 0.02);
    const x = imagem.bitmap.width  - logo.bitmap.width  - margem;
    const y = margem;

    imagem.composite(logo, x, y);
    await imagem.write(imagemPath);
  } catch (e) {
    console.error('[watermark]', e.message);
  }
}


// ╔══════════════════════════════════════════════════════════════╗
// ║  ROTAS - UPLOAD DE IMAGENS                                   ║
// ╚══════════════════════════════════════════════════════════════╝

app.post('/api/upload', verificarToken, upload.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem recebida' });
  await aplicarMarcaDagua(req.file.path);
  res.json({ url: '/imagens/uploads/' + req.file.filename });
});

app.delete('/api/upload', verificarToken, (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ erro: 'URL não informada' });
  const nome = path.basename(url);
  const arq  = path.join(uploadsDir, nome);
  if (fs.existsSync(arq)) fs.unlinkSync(arq);
  res.json({ sucesso: true });
});


// ╔══════════════════════════════════════════════════════════════╗
// ║  ROTAS - FORMULÁRIO DE CONTATO                               ║
// ╚══════════════════════════════════════════════════════════════╝

app.post('/api/contato', (req, res) => {
  const { nome, email, telefone, mensagem } = req.body;
  if (!nome || !email || !mensagem) return res.status(400).json({ erro: 'Preencha os campos obrigatórios' });

  const dados = lerDados('contatos.json');
  if (!dados.mensagens) dados.mensagens = [];
  dados.mensagens.unshift({
    id:       Date.now(),
    data:     new Date().toISOString(),
    lida:     false,
    nome,
    email,
    telefone: telefone || '',
    mensagem
  });
  salvarDados('contatos.json', dados);

  // Dispara evento Lead na Conversions API (server-side)
  enviarEventoCAPI([{
    event_name:       'Lead',
    event_time:       Math.floor(Date.now() / 1000),
    action_source:    'website',
    event_source_url: req.headers.referer || 'https://forcemakprime.com.br/contato.html',
    user_data: {
      em:                  hashSHA256(email)    ? [hashSHA256(email)]    : undefined,
      ph:                  hashSHA256(telefone) ? [hashSHA256(telefone)] : undefined,
      client_ip_address:   req.ip,
      client_user_agent:   req.headers['user-agent']
    }
  }]).catch(() => {});

  res.json({ sucesso: true });
});

// Endpoint para eventos CAPI disparados pelo browser (PageView, ViewContent, Contact, Lead)
app.post('/api/capi-event', (req, res) => {
  const { eventName, eventSourceUrl, eventId, customData } = req.body;
  if (!eventName) return res.status(400).json({ erro: 'eventName obrigatório' });

  const evento = {
    event_name:       eventName,
    event_time:       Math.floor(Date.now() / 1000),
    action_source:    'website',
    event_source_url: eventSourceUrl || req.headers.referer,
    user_data: {
      client_ip_address: req.ip,
      client_user_agent: req.headers['user-agent']
    },
    ...(eventId     ? { event_id:    eventId }    : {}),
    ...(customData  ? { custom_data: customData }  : {})
  };

  enviarEventoCAPI([evento]).catch(() => {});
  res.json({ sucesso: true });
});

app.get('/api/contato', verificarToken, (req, res) => {
  const dados = lerDados('contatos.json');
  res.json(dados.mensagens || []);
});

app.put('/api/contato/:id/lida', verificarToken, (req, res) => {
  const dados = lerDados('contatos.json');
  const msg = (dados.mensagens || []).find(m => m.id == req.params.id);
  if (!msg) return res.status(404).json({ erro: 'Mensagem não encontrada' });
  msg.lida = true;
  salvarDados('contatos.json', dados);
  res.json({ sucesso: true });
});


// ╔══════════════════════════════════════════════════════════════╗
// ║  ROTAS - FACEBOOK API (métricas do pixel)                    ║
// ╚══════════════════════════════════════════════════════════════╝

app.get('/api/facebook/metricas', verificarToken, (req, res) => {
  const token    = process.env.FACEBOOK_ACCESS_TOKEN;
  const pixelId  = process.env.FACEBOOK_PIXEL_ID;

  if (!token || token === 'seu_access_token_aqui') {
    return res.json({
      configurado: false,
      mensagem: 'Configure o FACEBOOK_ACCESS_TOKEN no arquivo .env para ver as métricas.'
    });
  }

  // Busca estatísticas do pixel via Graph API
  const url = `https://graph.facebook.com/v18.0/${pixelId}?fields=name,creation_time,last_fired_time,is_unavailable&access_token=${token}`;

  https.get(url, (resposta) => {
    let corpo = '';
    resposta.on('data', chunk => corpo += chunk);
    resposta.on('end', () => {
      try {
        const dados = JSON.parse(corpo);
        res.json({ configurado: true, dados });
      } catch {
        res.status(500).json({ erro: 'Erro ao processar resposta do Facebook' });
      }
    });
  }).on('error', () => {
    res.status(500).json({ erro: 'Erro ao conectar com a API do Facebook' });
  });
});


// ╔══════════════════════════════════════════════════════════════╗
// ║  ROTAS - VÍDEOS YOUTUBE (RSS)                                ║
// ╚══════════════════════════════════════════════════════════════╝

const YT_CHANNEL_ID  = 'UChd5w1hoWx9wbBqU_UtTp7g';
const YT_RSS_URL     = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`;
let   ytCache        = null;
let   ytCacheTs      = 0;
const YT_CACHE_TTL   = 15 * 60 * 1000; // 15 minutos

function fetchYouTubeRSS() {
  return new Promise((resolve, reject) => {
    https.get(YT_RSS_URL, (res) => {
      let xml = '';
      res.on('data', c => xml += c);
      res.on('end', () => {
        try {
          const entries = [];
          const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
          let m;
          while ((m = entryRegex.exec(xml)) !== null) {
            const block = m[1];
            const videoId    = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)     || [])[1] || '';
            const title      = (block.match(/<title>([^<]+)<\/title>/)               || [])[1] || '';
            const published  = (block.match(/<published>([^<]+)<\/published>/)       || [])[1] || '';
            const thumbnail  = (block.match(/media:thumbnail url="([^"]+)"/)         || [])[1] || '';
            if (videoId) entries.push({ videoId, title: title.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'"), published, thumbnail });
          }
          resolve(entries);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

app.get('/api/videos-youtube', async (req, res) => {
  try {
    const agora = Date.now();
    if (!ytCache || agora - ytCacheTs > YT_CACHE_TTL) {
      ytCache  = await fetchYouTubeRSS();
      ytCacheTs = agora;
    }
    res.json(ytCache);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar vídeos', detalhe: e.message });
  }
});


// ─── Fallback: envia index.html para rotas do frontend ────────
app.get('*', (req, res) => {
  // Só redireciona se não for rota de API ou arquivo estático
  if (!req.path.startsWith('/api') && !req.path.includes('.')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ erro: 'Rota não encontrada' });
  }
});


// ─── Iniciar servidor ─────────────────────────────────────────
inicializarAdmin();
app.listen(PORTA, () => {
  console.log(`✅ Servidor Forcemak Prime rodando em http://localhost:${PORTA}`);
});
