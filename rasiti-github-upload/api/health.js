// GET /api/health -> {ok:true}. Cheap check for uptime monitors; does not touch the database.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, time: new Date().toISOString() });
}
