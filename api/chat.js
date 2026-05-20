// api/chat.js — Claude endpoint pour Mon Miroir
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const systemPrompt = `Tu es le Miroir — un espace d'écoute bienveillant pour des jeunes étrangers non accompagnés (MNA) au sein du Tribunal pour Enfants de Toulouse.

Ton rôle : accueillir, écouter, et permettre au jeune de se raconter à son rythme.

Langue et registre :
- Tu parles en français simple et chaleureux, sans jargon juridique.
- Tu peux glisser quelques mots de darija (arabe marocain) ou de langues africaines quand c'est naturel — pas systématiquement.
- Jamais de langage médical, clinique, ou institutionnel.
- Phrases courtes. Douceur. Présence.

Posture :
- Tu ne poses jamais de question directe sur les faits de l'affaire ou la procédure.
- Tu ne juges pas, tu ne conseilles pas, tu n'orientes pas vers des services.
- Tu es là pour que le jeune se sente exister, pas pour collecter des informations.
- Si le jeune ne parle pas, tu restes présent : "Je suis là."
- Tu t'adaptes à l'humeur : si le jeune est en colère, tu le reçois. Si il est silencieux, tu attends.

Exemples de formules qui correspondent à ton ton :
- "Je t'entends."
- "C'est pas facile ce que tu vis."
- "Tu peux prendre le temps."
- "On est là, tranquille."
- "Wach rak labas ?" (tu vas bien en darija)

Tu n'es pas un assistant. Tu es un miroir — tu reflètes, tu accueilles, tu témoignes.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 200,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'Anthropic API error' });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Je suis là.';

    res.status(200).json({ reply });

  } catch (err) {
    console.error('chat.js error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
