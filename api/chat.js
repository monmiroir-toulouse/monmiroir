const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic();

async function loadBibliotheque() {
  try {
    const baseUrl = 'https://raw.githubusercontent.com/monmiroir-toulouse/monmiroir/main/bibliotheque';
    const indexRes = await fetch(`${baseUrl}/index.json`);
    const index = await indexRes.json();
    
    const extraits = await Promise.all(
      index.temoignages.map(async (t) => {
        const res = await fetch(`${baseUrl}/${t.fichier}`);
        const texte = await res.text();
        return `[${t.id}] ${texte.substring(0, 300)}...`;
      })
    );
    return extraits.join('\n\n');
  } catch(e) {
    return '';
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { system, messages, emotion } = body;
    
    const bibliotheque = await loadBibliotheque();
    
    const enrichedSystem = `
${system}

Émotion possible du jeune : ${emotion || "non déterminée"}
Si le jeune exprime solitude forte, détresse ou violence :
tu restes calme, tu encourages à parler,
tu proposes de se rapprocher d'un adulte de confiance.

${bibliotheque ? `EXTRAITS DE TÉMOIGNAGES MNA RÉELS (contexte culturel) :\n${bibliotheque}` : ''}
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
