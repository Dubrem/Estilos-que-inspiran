import { createHash } from 'node:crypto';

const DB = process.env.FIREBASE_DB_URL || 'https://bella-esencial-default-rtdb.firebaseio.com';

const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 12);

// Catálogo sin fotos base64 (~36 MB → ~40 KB). Cada foto se sirve aparte por /api/img.
export default async function handler(req, res) {
  try {
    const r = await fetch(`${DB}/products.json`);
    if (!r.ok) return res.status(502).json({ error: 'firebase' });
    const data = (await r.json()) || {};

    const out = {};
    for (const [key, p] of Object.entries(data)) {
      if (!p || typeof p !== 'object') continue;
      const { img, imgs, ...meta } = p;
      const list = Array.isArray(imgs) && imgs.length ? imgs : (img ? [img] : []);
      const fromImg = !(Array.isArray(imgs) && imgs.length);
      const pics = list
        .map((src, i) => {
          if (typeof src !== 'string' || !src) return null;
          if (/^data:image\//i.test(src)) {
            return `/api/img?id=${encodeURIComponent(key)}&i=${fromImg ? 'm' : i}&v=${hash(src)}`;
          }
          // URLs externas se usan tal cual; se descarta cualquier otro esquema o caracteres que rompan el HTML
          return /^(https?:\/\/|\/|[\w-]+\/)[^\s"'<>]*$/i.test(src) ? src : null;
        })
        .filter(Boolean);
      if (pics.length) meta.pics = pics;
      out[key] = meta;
    }

    res.setHeader(
      'Cache-Control',
      req.query.fresh
        ? 'no-store'
        : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    );
    return res.status(200).json(out);
  } catch (err) {
    console.error('products error:', err);
    return res.status(500).json({ error: 'server' });
  }
}
