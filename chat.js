export default async function handler(req, res) {
  // Méthode autorisée : POST uniquement
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Vérification que le body est présent
  if (!req.body || !req.body.messages) {
    return res.status(400).json({ error: 'Body invalide' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // ← jamais exposée au navigateur
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: req.body.model || 'claude-sonnet-4-20250514',
        max_tokens: req.body.max_tokens || 1200,
        system: req.body.system || '',
        messages: req.body.messages
      })
    });

    const data = await response.json();

    // Propagation du status Anthropic (429 rate limit, 400 bad request, etc.)
    return res.status(response.status).json(data);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Erreur interne du proxy' });
  }
}
