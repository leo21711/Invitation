const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false }
});
const TOKEN_RE = /^[A-Za-z0-9]{6,32}$/;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const t = req.query.t;
      if (!TOKEN_RE.test(t || '')) return res.status(404).json({ error: 'Invitation not found.' });
      const { data, error } = await db.from('guests').select('name,status,party_size').eq('token', t).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Invitation not found.' });
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { token, status, party_size } = req.body || {};
      if (!TOKEN_RE.test(token || '')) return res.status(404).json({ error: 'Invitation not found.' });
      if (!['attending', 'declined'].includes(status)) return res.status(400).json({ error: 'Please choose Attending or Regrets.' });
      const pax = status === 'attending' ? parseInt(party_size, 10) : null;
      if (status === 'attending' && !(pax >= 1 && pax <= 3)) return res.status(400).json({ error: 'Number of guests must be between 1 and 3.' });

      const { data, error } = await db.from('guests')
        .update({ status, party_size: pax, responded_at: new Date().toISOString() })
        .eq('token', token).select('name').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Invitation not found.' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again shortly.' });
  }
};
