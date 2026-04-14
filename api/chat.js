module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { const { system, messages } = body;

const systemPrompt = `
${system}

Tu es "Le Scribe".

Présence calme, bienveillante et profonde.

Tu adaptes ton ton :
- tristesse → douceur
- colère → accueillir
- peur → rassurer

Tu poses des questions ouvertes.
Tu ne juges jamais.
Tu ne donnes pas de solutions directes.

Réponses courtes, humaines.
`; } = body;

    const r = await fetch(https://api.anthropic.com/v1/messages, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system,
    messages
  })
});

const data = await r.json();
console.log("TEST OK", data);

    const data = await r.json();
    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
const enrichedSystem = `
${systemPrompt}

Emotion possible du jeune : ${body.emotion || "non déterminée"}
`;
Si le jeune exprime :
- solitude forte
- détresse
- violence

Tu restes calme, tu encourages à parler,
tu proposes de se rapprocher d’un adulte de confiance.
