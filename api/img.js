import { createHash } from 'node:crypto';

const DB = process.env.FIREBASE_DB_URL || 'https://bella-esencial-default-rtdb.firebaseio.com';
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

// Sirve una foto base64 guardada en Firebase como imagen real y cacheable.
export default async function handler(req, res) {
  const id = String(req.query.id || '');
  const i = String(req.query.i ?? '0');
  const v = String(req.query.v || '');
  if (!/^[\w-]{1,80}$/.test(id) || !/^(m|\d{1,2})$/.test(i)) return res.status(400).end();

  try {
    const path = i === 'm' ? `products/${id}/img` : `products/${id}/imgs/${i}`;
    const r = await fetch(`${DB}/${path}.json`);
    const src = r.ok ? await r.json() : null;
    const m = typeof src === 'string' && /^data:(image\/[a-z+.-]+);base64,/i.exec(src);
    const type = m && m[1].toLowerCase();
    if (!type || !TYPES.has(type)) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      return res.status(404).end();
    }

    const fresh = v && createHash('sha1').update(src).digest('hex').slice(0, 12) === v;
    res.setHeader('Content-Type', type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Cache-Control',
      fresh
        ? 'public, max-age=31536000, s-maxage=31536000, immutable'
        : 'public, max-age=60, s-maxage=60'
    );
    return res.status(200).send(Buffer.from(src.slice(m[0].length), 'base64'));
  } catch (err) {
    console.error('img error:', err);
    return res.status(502).end();
  }
}
