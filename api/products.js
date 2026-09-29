const DB = process.env.FIREBASE_DB_URL || 'https://bella-esencial-default-rtdb.firebaseio.com';

// Catálogo sin fotos (~158 KB). Las fotos se sirven aparte por /api/img.
//
// Lee productMeta, no products: products guarda las fotos en base64 y pesa
// 117 MB, así que leerlo aquí haría que cada fallo de caché del CDN bajara
// 117 MB desde Firebase. productMeta ya trae las URLs de /api/img resueltas
// (campos `pics` y `thumb`), así que esto es un reenvío directo.
export default async function handler(req, res) {
  try {
    const r = await fetch(`${DB}/productMeta.json`);
    if (!r.ok) return res.status(502).json({ error: 'firebase' });
    const data = (await r.json()) || {};

    res.setHeader(
      'Cache-Control',
      req.query.fresh
        ? 'no-store'
        : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    );
    return res.status(200).json(data);
  } catch (err) {
    console.error('products error:', err);
    return res.status(500).json({ error: 'server' });
  }
}
