import produtos from '../../dados/produtos.json';
import conteudo from '../../dados/conteudo.json';
import contatos from '../../dados/contatos.json';

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

  const results = [];

  await env.FORCEMAK_DATA.put('produtos.json', JSON.stringify(produtos, null, 2));
  results.push(`produtos.json: ${(produtos.produtos || []).length} produtos`);

  await env.FORCEMAK_DATA.put('conteudo.json', JSON.stringify(conteudo, null, 2));
  results.push('conteudo.json: ok');

  await env.FORCEMAK_DATA.put('contatos.json', JSON.stringify(contatos, null, 2));
  results.push('contatos.json: ok');

  return new Response(JSON.stringify({ sucesso: true, resultados: results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
