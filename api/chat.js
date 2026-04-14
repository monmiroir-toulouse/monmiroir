const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { system, messages, emotion } = body;

    const enrichedSystem = `
${system}
Émotion possible du jeune : ${emotion || "non déterminée"}

Si le jeune exprime solitude forte, détresse ou violence :
tu restes calme, tu encourages à parler,
tu proposes de se rapprocher d'un adulte de confiance.
`;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: enrichedSystem,
      messages: messages
    });

    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
