// GET /api/tile?s=sat|street&z=&x=&y=  Map tiles for the PDF reports, served from our own address so the
// browser may draw them into the report (map servers do not always allow that directly).
// Only tiles over Lesotho, zoom 8 to 19, are served, so this cannot be used as a general map proxy.
const SRC = {
  sat: process.env.TILE_SAT_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  street: process.env.TILE_STREET_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
};
const tileX = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
const tileY = (lat, z) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };
const cache = new Map(); // small in-memory cache: key -> {buf, type}
export default async function handler(req, res) {
  const p = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const s = SRC[p.s] ? p.s : 'sat'; const z = Number(p.z), x = Number(p.x), y = Number(p.y);
  const bad = m => { res.statusCode = 400; res.setHeader('Content-Type', 'text/plain'); res.end(m); };
  if (![z, x, y].every(Number.isInteger) || z < 8 || z > 19) return bad('Bad tile');
  // Lesotho with a margin: lat -31 to -28.3, lon 26.8 to 29.7
  if (x < tileX(26.8, z) || x > tileX(29.7, z) || y < tileY(-28.3, z) || y > tileY(-31, z)) return bad('Outside Lesotho');
  const key = `${s}/${z}/${x}/${y}`;
  let hit = cache.get(key);
  if (!hit) {
    try {
      const r = await fetch(SRC[s].replace('{z}', z).replace('{x}', x).replace('{y}', y), { headers: { 'User-Agent': 'Rasiti/1.0 (RSL Taxathon demo; reports)', 'Referer': 'https://rasiti.statspack.africa/' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) { res.statusCode = 502; return res.end('Tile server answered ' + r.status); }
      hit = { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'image/png' };
      if (cache.size > 1500) cache.delete(cache.keys().next().value);
      cache.set(key, hit);
    } catch (e) { res.statusCode = 502; return res.end('Tile server not reachable'); }
  }
  res.statusCode = 200; res.setHeader('Content-Type', hit.type); res.setHeader('Cache-Control', 'public, max-age=604800'); res.end(hit.buf);
}
