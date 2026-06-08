export async function onRequestGet(context) {
  const key = getKey(context.params.path);
  if (!key) return new Response('Not found', { status: 404 });

  if (!context.env.FORCEMAK_UPLOADS) {
    return new Response('R2 binding FORCEMAK_UPLOADS not configured', { status: 500 });
  }

  const object = await context.env.FORCEMAK_UPLOADS.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (!headers.has('content-type')) headers.set('content-type', contentType(key));

  return new Response(object.body, { headers });
}

function getKey(path) {
  if (!path) return '';
  return (Array.isArray(path) ? path : [path]).map((p) => decodeURIComponent(p)).join('/');
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
