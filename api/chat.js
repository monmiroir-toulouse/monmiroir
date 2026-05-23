module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, language, mode } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  // ── MODE TRADUCTEUR ──
  if (mode === 'translate') {
    const systemPrompt = `Tu es un traducteur expert en Darija marocain.
Ta tâche : traduire en français naturel et fluide le texte en Darija qui t'est soumis.
- Conserve le sens exact et les nuances
- Traduis en français courant, pas en arabe classique
- Si le texte contient des mots français mélangés au Darija, garde-les
- Réponds UNIQUEMENT avec la traduction — aucun commentaire, aucune explication
- Si tu ne comprends pas un mot, laisse-le tel quel entre parenthèses`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({model: 'claude-sonnet-4-5', max_tokens: 300, system: systemPrompt, messages })
      });
      const data = await response.json();
      return res.status(200).json({ reply: data.content?.[0]?.text || '...' });
    } catch (err) {
      return res.status(500).json({ error: 'Translation error' });
    }
  }

  // ── MODE MIROIR ──
  const langInstructions = {
    fr: 'Tu parles UNIQUEMENT en français simple et chaleureux.',
    ar: 'Tu parles UNIQUEMENT en arabe dialectal (darija), simple et chaleureux.',
    ber: 'Tu parles en français simple. Si possible, glisse quelques mots en tamazight.',
    en: 'You speak ONLY in simple, warm English.',
    bm: 'Tu parles en français simple. Glisse quelques mots en bambara si naturel.',
    ti: 'Tu parles en français simple. Glisse quelques mots en tigrigna si naturel.',
  };

  const lang = language || 'fr';
  const systemPrompt = `Tu es le Miroir — un espace d'écoute bienveillant pour des jeunes étrangers non accompagnés (MNA) au sein du Tribunal pour Enfants de Toulouse.

Ton rôle : accueillir, écouter, permettre au jeune de se raconter à son rythme.

Langue : ${langInstructions[lang] || langInstructions['fr']}
Phrases courtes. Douceur. Présence. Jamais de jargon juridique ou médical.

Posture :
- Tu ne poses jamais de question sur les faits de l'affaire ou la procédure.
- Tu ne juges pas, tu ne conseilles pas, tu n'orientes pas vers des services.
- Tu es là pour que le jeune se sente exister.
- Si le jeune ne parle pas : "Je suis là."
- Tu t'adaptes à l'humeur : colère, silence, tristesse — tu reçois tout.

Tu n'es pas un assistant. Tu es un miroir — tu reflètes, tu accueilles, tu témoignes.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 200, system: systemPrompt, messages })
    });
    const data = await response.json();
    res.status(200).json({ reply: data.content?.[0]?.text || 'Je suis là.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
