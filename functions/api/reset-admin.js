export async function onRequestPost(context) {
  const { env } = context;
  const secret = env.SEED_SECRET || env.JWT_SEGREDO;
  const auth = context.request.headers.get('authorization');

  if (!auth || auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ erro: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.FORCEMAK_DATA) {
    return new Response(JSON.stringify({ erro: 'KV não configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const senhaHash = await hashPassword('admin123');
  const dados = { admins: [{ usuario: 'admin', senhaHash }] };
  await env.FORCEMAK_DATA.put('usuarios.json', JSON.stringify(dados, null, 2));

  return new Response(JSON.stringify({ sucesso: true, usuario: 'admin', senha: 'admin123' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const saltHex = [...salt].map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}
