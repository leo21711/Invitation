// Vercel serverless function. Talks to Supabase with plain fetch (no library).
const SUPABASE_URL = 'https://gdlhkmaurgiqcicuowwg.supabase.co'; // must match Supabase > Data API > Project URL
const KEY = String(process.env.SUPABASE_SECRET_KEY || '').trim().replace(/^["']+|["']+$/g, '');
const TOKEN_RE = /^[A-Za-z0-9]{6,32}$/;

function headers(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json', ...extra };
  // Legacy service_role keys (start with eyJ) need Authorization; new sb_secret_ keys must not send it.
  if (KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY;
  return h;
}

async function rest(path, options) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, options);
  const text = await r.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + (body && body.message ? body.message : text));
  return body;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!KEY) throw new Error('SUPABASE_SECRET_KEY is missing in Vercel environment variables');

    if (req.method === 'GET') {
      const t = req.query.t;
      if (!TOKEN_RE.test(t || '')) return res.status(404).json({ error: 'Invitation not found.' });
      const rows = await rest(`guests?token=eq.${t}&select=name,status,party_size&limit=1`, { headers: headers() });
      if (!rows.length) return res.status(404).json({ error: 'Invitation not found.' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'POST') {
      const { token, status, party_size } = req.body || {};
      if (!TOKEN_RE.test(token || '')) return res.status(404).json({ error: 'Invitation not found.' });
      if (!['attending', 'declined'].includes(status)) return res.status(400).json({ error: 'Please choose Attending or Regrets.' });
      const pax = status === 'attending' ? parseInt(party_size, 10) : null;
      if (status === 'attending' && !(pax >= 1 && pax <= 3)) return res.status(400).json({ error: 'Number of guests must be between 1 and 3.' });

      const rows = await rest(`guests?token=eq.${token}`, {
        method: 'PATCH',
        headers: headers({ Prefer: 'return=representation' }),
        body: JSON.stringify({ status, party_size: pax, responded_at: new Date().toISOString() })
      });
      if
