// The API key and segment ID stay on the server. Without them, the form fails
// clearly instead of pretending to have registered a reader.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Méthode non autorisée.' });
  }

  const origin = req.headers?.origin;
  const host = req.headers?.host;
  let originHost = '';
  try { if (origin) originHost = new URL(origin).host; } catch { return res.status(403).json({ ok: false, message: 'Requête refusée.' }); }
  if (origin && (!host || originHost !== host)) {
    return res.status(403).json({ ok: false, message: 'Requête refusée.' });
  }

  let body;
  try {
    body = typeof req.body === 'string'
      ? (req.body.trim().startsWith('{') ? JSON.parse(req.body) : Object.fromEntries(new URLSearchParams(req.body)))
      : (req.body || {});
  } catch { return res.status(400).json({ ok: false, message: 'Requête invalide.' }); }
  const email = String(body.email || '').trim().toLowerCase();
  if (body.website) return res.status(200).json({ ok: true }); // champ piège
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true && body.consent !== 'on') {
    return res.status(400).json({ ok: false, message: 'Vérifiez l’adresse et votre accord avant de valider.' });
  }

  const key = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID;
  if (!key || !segmentId) {
    return res.status(503).json({ ok: false, message: 'Les inscriptions sont momentanément indisponibles. Réessayez plus tard.' });
  }

  try {
    const response = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segmentId }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      // Never reactivate an address that was previously unsubscribed.
      if (response.status === 409) return res.status(409).json({ ok: false, message: 'Cette adresse figure déjà dans nos contacts. Contactez-nous si nécessaire.' });
      return res.status(502).json({ ok: false, message: 'Inscription indisponible pour le moment. Réessayez plus tard.' });
    }
    return res.status(200).json({ ok: true, message: 'Votre inscription est enregistrée.' });
  } catch {
    return res.status(502).json({ ok: false, message: 'Inscription indisponible pour le moment. Réessayez plus tard.' });
  }
}
