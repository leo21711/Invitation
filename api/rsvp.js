// Vercel serverless function: relays RSVP requests to the Google Apps Script web app.
// Paste the Apps Script "Web app URL" (ends in /exec) between the quotation marks.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVOcjXfJuOY55LXSnjMYFDGtcatwg8orvsFGa2z45Zvm-_huXEkY5Tz3lsYI9y7T9KGg/exec';

async function callScript(payload) {
  const r = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Apps Script did not return JSON. Check the deployment is set to "Anyone". Response began: ' + text.slice(0, 120)); }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!/^https:\/\/script\.google\.com\//.test(APPS_SCRIPT_URL)) throw new Error('APPS_SCRIPT_URL has not been set in api/rsvp.js');

    // GET /api/rsvp?name=Bapak+Joko  -> has this guest already replied?
    if (req.method === 'GET') {
      const name = String(req.query.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Name is required.' });
      return res.status(200).json(await callScript({ action: 'lookup', name }));
    }

    // POST /api/rsvp  -> save the reply
    if (req.method === 'POST') {
      const { name, status, party_size } = req.body || {};
      const data = await callScript({ action: 'submit', name, status, party_size });
      return res.status(data.ok ? 200 : 400).json(data);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (e) {
    console.error(e);
    // Remove "detail" before sending invitations.
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again shortly.', detail: e.message });
  }
};
