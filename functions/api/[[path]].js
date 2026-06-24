const DATA_KEYS = {
  conteudo: 'conteudo.json',
  produtos: 'produtos.json',
  contatos: 'contatos.json',
  usuarios: 'usuarios.json'
};

const YT_CHANNEL_ID = 'UChd5w1hoWx9wbBqU_UtTp7g';
const YT_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`;
const YT_CHANNEL_URL = 'https://www.youtube.com/@forcemak/videos';
const YT_CACHE_KEY = 'cache:videos-youtube';
const YT_CACHE_TTL_MS = 2 * 60 * 1000;

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return json({}, 204);
  }

  try {
    const url = new URL(request.url);
    const segments = getSegments(context.params.path);

    if (segments[0] === 'admin' && segments[1] === 'login' && request.method === 'POST') {
      return login(context);
    }

    if (segments[0] === 'admin' && segments[1] === 'alterar-senha' && request.method === 'POST') {
      const auth = await requireAuth(context);
      if (auth instanceof Response) return auth;
      return alterarSenha(context, auth);
    }

    if (segments[0] === 'conteudo' && segments.length === 1 && request.method === 'GET') {
      return json(await readData(context.env, DATA_KEYS.conteudo, {}));
    }

    if (segments[0] === 'conteudo' && segments.length === 2 && request.method === 'PUT') {
      const auth = await requireAuth(context);
      if (auth instanceof Response) return auth;
      const conteudo = await readData(context.env, DATA_KEYS.conteudo, {});
      conteudo[segments[1]] = await request.json();
      await writeData(context.env, DATA_KEYS.conteudo, conteudo);
      return json({ sucesso: true });
    }

    if (segments[0] === 'produtos') {
      return routeProdutos(context, segments, url);
    }

    if (segments[0] === 'upload') {
      return routeUpload(context, segments);
    }

    if (segments[0] === 'contato') {
      return routeContato(context, segments);
    }

    if (segments[0] === 'capi-event' && request.method === 'POST') {
      return capiEvent(context);
    }

    if (segments[0] === 'facebook' && segments[1] === 'metricas' && request.method === 'GET') {
      const auth = await requireAuth(context);
      if (auth instanceof Response) return auth;
      return facebookMetricas(context);
    }

    if (segments[0] === 'videos-youtube' && request.method === 'GET') {
      return videosYoutube(context);
    }

    return json({ erro: 'Rota não encontrada' }, 404);
  } catch (error) {
    console.error('[api]', error);
    return json({ erro: 'Erro interno', detalhe: error.message }, 500);
  }
}

async function routeProdutos(context, segments, url) {
  const { request } = context;

  if (segments.length === 1 && request.method === 'GET') {
    const dados = await readData(context.env, DATA_KEYS.produtos, { produtos: [] });
    let lista = dados.produtos || [];
    const q = url.searchParams.get('q');
    const categoria = url.searchParams.get('categoria');
    const estoque = url.searchParams.get('estoque');
    const ordenar = url.searchParams.get('ordenar');

    if (q) {
      const termo = q.toLowerCase();
      lista = lista.filter((p) =>
        String(p.nome || '').toLowerCase().includes(termo) ||
        String(p.descricao || '').toLowerCase().includes(termo) ||
        String(p.categoria || '').toLowerCase().includes(termo)
      );
    }

    if (categoria) lista = lista.filter((p) => p.categoria === categoria);
    if (estoque === 'true') lista = lista.filter((p) => (p.estoque || 0) > 0);
    if (ordenar === 'nome') lista.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
    if (ordenar === 'estoque') lista.sort((a, b) => (b.estoque || 0) - (a.estoque || 0));

    return json(lista);
  }

  if (segments.length === 1 && request.method === 'POST') {
    const auth = await requireAuth(context);
    if (auth instanceof Response) return auth;
    const dados = await readData(context.env, DATA_KEYS.produtos, { produtos: [] });
    const novo = { id: Date.now(), ...(await request.json()) };
    dados.produtos = dados.produtos || [];
    dados.produtos.push(novo);
    await writeData(context.env, DATA_KEYS.produtos, dados);
    return json({ sucesso: true, produto: novo });
  }

  if (segments.length === 2 && request.method === 'PUT') {
    const auth = await requireAuth(context);
    if (auth instanceof Response) return auth;
    const dados = await readData(context.env, DATA_KEYS.produtos, { produtos: [] });
    const idx = (dados.produtos || []).findIndex((p) => String(p.id) === String(segments[1]));
    if (idx === -1) return json({ erro: 'Produto não encontrado' }, 404);
    dados.produtos[idx] = { ...dados.produtos[idx], ...(await request.json()) };
    await writeData(context.env, DATA_KEYS.produtos, dados);
    return json({ sucesso: true });
  }

  if (segments.length === 3 && segments[2] === 'estoque' && request.method === 'PATCH') {
    const auth = await requireAuth(context);
    if (auth instanceof Response) return auth;
    const { estoque } = await request.json();
    const valor = parseInt(estoque, 10);
    if (Number.isNaN(valor)) return json({ erro: 'Valor de estoque inválido' }, 400);

    const dados = await readData(context.env, DATA_KEYS.produtos, { produtos: [] });
    const idx = (dados.produtos || []).findIndex((p) => String(p.id) === String(segments[1]));
    if (idx === -1) return json({ erro: 'Produto não encontrado' }, 404);
    dados.produtos[idx].estoque = Math.max(0, valor);
    await writeData(context.env, DATA_KEYS.produtos, dados);
    return json({ sucesso: true, estoque: dados.produtos[idx].estoque });
  }

  if (segments.length === 2 && request.method === 'DELETE') {
    const auth = await requireAuth(context);
    if (auth instanceof Response) return auth;
    const dados = await readData(context.env, DATA_KEYS.produtos, { produtos: [] });
    const produto = (dados.produtos || []).find((p) => String(p.id) === String(segments[1]));
    dados.produtos = (dados.produtos || []).filter((p) => String(p.id) !== String(segments[1]));
    await writeData(context.env, DATA_KEYS.produtos, dados);

    if (produto && Array.isArray(produto.imagens)) {
      context.waitUntil(Promise.all(produto.imagens.map((url) => deleteUpload(context.env, url))));
    }

    return json({ sucesso: true });
  }

  return json({ erro: 'Rota não encontrada' }, 404);
}

async function routeUpload(context) {
  const { request, env } = context;
  const auth = await requireAuth(context);
  if (auth instanceof Response) return auth;

  if (!env.FORCEMAK_UPLOADS) {
    return json({ erro: 'Binding FORCEMAK_UPLOADS não configurado' }, 500);
  }

  if (request.method === 'POST') {
    const form = await request.formData();
    const file = form.get('imagem');
    if (!file || typeof file === 'string') return json({ erro: 'Nenhuma imagem recebida' }, 400);

    const name = sanitizeFileName(file.name || 'upload.bin');
    const key = `${Date.now()}-${name}`;
    await env.FORCEMAK_UPLOADS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || contentType(key) }
    });
    return json({ url: `/imagens/uploads/${key}` });
  }

  if (request.method === 'DELETE') {
    const { url } = await request.json();
    if (!url) return json({ erro: 'URL não informada' }, 400);
    await deleteUpload(env, url);
    return json({ sucesso: true });
  }

  return json({ erro: 'Método não permitido' }, 405);
}

async function routeContato(context, segments) {
  const { request } = context;

  if (segments.length === 1 && request.method === 'POST') {
    const { nome, email, telefone, mensagem } = await request.json();
    if (!nome || !email || !mensagem) return json({ erro: 'Preencha os campos obrigatórios' }, 400);

    const dados = await readData(context.env, DATA_KEYS.contatos, { mensagens: [] });
    dados.mensagens = dados.mensagens || [];
    dados.mensagens.unshift({
      id: Date.now(),
      data: new Date().toISOString(),
      lida: false,
      nome,
      email,
      telefone: telefone || '',
      mensagem
    });
    await writeData(context.env, DATA_KEYS.contatos, dados);

    context.waitUntil(sendCapi(context, [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: request.headers.get('referer') || new URL(request.url).origin + '/contato.html',
      user_data: {
        em: email ? [await hashSHA256(email)] : undefined,
        ph: telefone ? [await hashSHA256(telefone)] : undefined,
        client_ip_address: request.headers.get('cf-connecting-ip') || '',
        client_user_agent: request.headers.get('user-agent') || ''
      }
    }]));

    return json({ sucesso: true });
  }

  if (segments.length === 1 && request.method === 'GET') {
    const auth = await requireAuth(context);
    if (auth instanceof Response) return auth;
    const dados = await readData(context.env, DATA_KEYS.contatos, { mensagens: [] });
    return json(dados.mensagens || []);
  }

  if (segments.length === 3 && segments[2] === 'lida' && request.method === 'PUT') {
    const auth = await requireAuth(context);
    if (auth instanceof Response) return auth;
    const dados = await readData(context.env, DATA_KEYS.contatos, { mensagens: [] });
    const msg = (dados.mensagens || []).find((m) => String(m.id) === String(segments[1]));
    if (!msg) return json({ erro: 'Mensagem não encontrada' }, 404);
    msg.lida = true;
    await writeData(context.env, DATA_KEYS.contatos, dados);
    return json({ sucesso: true });
  }

  return json({ erro: 'Rota não encontrada' }, 404);
}

async function login(context) {
  const { usuario, senha } = await context.request.json();
  if (!usuario || !senha) return json({ erro: 'Preencha todos os campos' }, 400);

  const dados = await readData(context.env, DATA_KEYS.usuarios, { admins: [] });
  if (!dados.admins || dados.admins.length === 0) {
    dados.admins = [{ usuario: 'admin', senhaHash: await hashPassword('admin123') }];
    await writeData(context.env, DATA_KEYS.usuarios, dados);
  }
  const admin = (dados.admins || []).find((a) => a.usuario === usuario);
  if (!admin) return json({ erro: 'Credenciais inválidas' }, 401);

  const senhaOk = await verifyPassword(senha, admin.senhaHash);
  if (!senhaOk) return json({ erro: 'Credenciais inválidas' }, 401);

  const token = await createToken(context.env, { usuario: admin.usuario, tipo: 'admin' });
  return json({ token, usuario: admin.usuario });
}

async function alterarSenha(context, auth) {
  const { senhaAtual, novaSenha } = await context.request.json();
  if (!senhaAtual || !novaSenha) return json({ erro: 'Preencha todos os campos' }, 400);

  const dados = await readData(context.env, DATA_KEYS.usuarios, { admins: [] });
  const idx = (dados.admins || []).findIndex((a) => a.usuario === auth.usuario);
  if (idx === -1) return json({ erro: 'Usuário não encontrado' }, 404);

  const senhaOk = await verifyPassword(senhaAtual, dados.admins[idx].senhaHash);
  if (!senhaOk) return json({ erro: 'Senha atual incorreta' }, 401);

  dados.admins[idx].senhaHash = await hashPassword(novaSenha);
  await writeData(context.env, DATA_KEYS.usuarios, dados);
  return json({ sucesso: true });
}

async function capiEvent(context) {
  const { eventName, eventSourceUrl, eventId, customData } = await context.request.json();
  if (!eventName) return json({ erro: 'eventName obrigatório' }, 400);

  const evento = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: eventSourceUrl || context.request.headers.get('referer') || '',
    user_data: {
      client_ip_address: context.request.headers.get('cf-connecting-ip') || '',
      client_user_agent: context.request.headers.get('user-agent') || ''
    },
    ...(eventId ? { event_id: eventId } : {}),
    ...(customData ? { custom_data: customData } : {})
  };

  context.waitUntil(sendCapi(context, [evento]));
  return json({ sucesso: true });
}

async function facebookMetricas(context) {
  const token = context.env.FACEBOOK_ACCESS_TOKEN;
  const pixelId = context.env.FACEBOOK_PIXEL_ID;

  if (!token || token === 'seu_access_token_aqui') {
    return json({
      configurado: false,
      mensagem: 'Configure o FACEBOOK_ACCESS_TOKEN para ver as métricas.'
    });
  }

  const url = `https://graph.facebook.com/v18.0/${pixelId}?fields=name,creation_time,last_fired_time,is_unavailable&access_token=${token}`;
  const resposta = await fetch(url);
  if (!resposta.ok) return json({ erro: 'Erro ao conectar com a API do Facebook' }, 500);
  return json({ configurado: true, dados: await resposta.json() });
}

async function videosYoutube(context) {
  const cached = await readData(context.env, YT_CACHE_KEY, null);
  if (cached && cached.ts && Date.now() - cached.ts < YT_CACHE_TTL_MS && Array.isArray(cached.videos)) {
    return json(cached.videos);
  }

  const videosRss = await fetchYouTubeRSS().catch(() => []);
  const videosCanal = videosRss.length ? videosRss : await fetchYouTubeChannelPage().catch(() => []);
  const videos = videosCanal.length ? videosCanal : await videosYoutubeFallback(context.env);

  await writeData(context.env, YT_CACHE_KEY, { ts: Date.now(), videos });
  return json(videos);
}

async function fetchYouTubeRSS() {
  const response = await fetch(YT_RSS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return [];
  const xml = await response.text();
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const videoId = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || '';
    const title = (block.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
    const published = (block.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
    const thumbnail = (block.match(/media:thumbnail url="([^"]+)"/) || [])[1] || '';
    if (videoId) entries.push({ videoId, title: decodeYouTubeText(title), published, thumbnail });
  }

  return entries;
}

async function fetchYouTubeChannelPage() {
  const response = await fetch(YT_CHANNEL_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  if (!response.ok) return [];
  const html = await response.text();
  const entries = [];
  const seen = new Set();
  const videoRegex = /"videoId":"([^"]+)"/g;
  let match;

  while ((match = videoRegex.exec(html)) !== null && entries.length < 30) {
    const videoId = match[1];
    if (seen.has(videoId)) continue;
    seen.add(videoId);

    const block = html.slice(match.index, match.index + 15000);
    const title =
      (block.match(/"lockupMetadataViewModel":\{"title":\{"content":"([^"]+)"/) || [])[1] ||
      (block.match(/"title":\{"runs":\[\{"text":"([^"]+)"/) || [])[1] ||
      '';
    const published =
      (block.match(/"metadataRows":\[\{"metadataParts":\[\{"text":\{"content":"[^"]*"\}\},\{"text":\{"content":"([^"]+)"/) || [])[1] ||
      '';

    if (title) {
      entries.push({
        videoId,
        title: decodeYouTubeText(title),
        published: decodeYouTubeText(published),
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      });
    }
  }

  return entries;
}

async function videosYoutubeFallback(env) {
  const conteudo = await readData(env, DATA_KEYS.conteudo, {});
  const videos = conteudo.midia && conteudo.midia.youtube && Array.isArray(conteudo.midia.youtube.videos)
    ? conteudo.midia.youtube.videos
    : [];

  return videos.filter(Boolean).map((videoId, index) => ({
    videoId,
    title: `Video Forcemak Prime ${index + 1}`,
    published: '',
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  }));
}

async function requireAuth(context) {
  const header = context.request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ erro: 'Acesso não autorizado' }, 401);

  const payload = await verifyToken(context.env, token);
  if (!payload) return json({ erro: 'Token inválido ou expirado' }, 401);
  return payload;
}

async function createToken(env, payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 };
  const unsigned = `${base64urlJson(header)}.${base64urlJson(body)}`;
  const signature = await hmac(env, unsigned);
  return `${unsigned}.${signature}`;
}

async function verifyToken(env, token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = await hmac(env, `${parts[0]}.${parts[1]}`);
  if (!timingSafeEqual(expected, parts[2])) return null;

  try {
    const payload = JSON.parse(textFromBase64url(parts[1]));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hmac(env, value) {
  const secret = env.JWT_SEGREDO || 'forcemak_segredo_padrao';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64urlBytes(new Uint8Array(sig));
}

async function readData(env, key, fallback) {
  if (!env.FORCEMAK_DATA) throw new Error('Binding FORCEMAK_DATA não configurado');
  const value = await env.FORCEMAK_DATA.get(key, 'json');
  return value ?? fallback;
}

async function writeData(env, key, value) {
  if (!env.FORCEMAK_DATA) throw new Error('Binding FORCEMAK_DATA não configurado');
  await env.FORCEMAK_DATA.put(key, JSON.stringify(value, null, 2));
}

async function deleteUpload(env, url) {
  if (!env.FORCEMAK_UPLOADS || !url) return;
  const key = decodeURIComponent(String(url).split('/').pop() || '');
  if (key) await env.FORCEMAK_UPLOADS.delete(key);
}

async function sendCapi(context, events) {
  const token = context.env.FACEBOOK_ACCESS_TOKEN;
  const pixelId = context.env.FACEBOOK_PIXEL_ID || '1433120138425099';
  if (!token) return;

  await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: events })
  }).catch(() => {});
}

async function hashSHA256(value) {
  if (!value) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value).toLowerCase().trim()));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getSegments(path) {
  if (!path) return [];
  return (Array.isArray(path) ? path : [path]).filter(Boolean).map((p) => decodeURIComponent(p));
}

function json(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function sanitizeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'upload.bin';
}

function contentType(name) {
  const ext = name.toLowerCase().split('.').pop();
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml'
  };
  return types[ext] || 'application/octet-stream';
}

function decodeYouTubeText(text = '') {
  return text
    .replace(/\\u0026/g, '&')
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function base64urlJson(value) {
  return base64urlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64urlBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function textFromBase64url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const saltHex = [...salt].map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  if (stored.startsWith('pbkdf2:')) {
    const [, saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const hash = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      key,
      256
    );
    const computed = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return timingSafeEqual(computed, hashHex);
  }
  if (stored.startsWith('$2')) {
    try {
      const bcrypt = await import('bcryptjs');
      const cmp = bcrypt.compare || bcrypt.default?.compare;
      if (cmp) return cmp(password, stored);
    } catch {}
    return false;
  }
  return false;
}
