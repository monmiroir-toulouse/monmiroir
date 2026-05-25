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
    const systemPrompt = `Tu es un traducteur expert en Darija marocain (arabe dialectal du Maroc).
Ta tâche : traduire en français naturel et fluide le texte en Darija qui t'est soumis.
- Conserve le sens exact, les nuances et les expressions idiomatiques
- Traduis en français courant, pas en arabe classique
- Si le texte contient des mots français mélangés au Darija (code-switching), garde-les en français
- Tiens compte du registre oral et familier du Darija
- Réponds UNIQUEMENT avec la traduction — aucun commentaire, aucune explication
- Si tu ne comprends pas un mot, laisse-le tel quel entre parenthèses`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 400, system: systemPrompt, messages })
      });
      const data = await response.json();
      return res.status(200).json({ reply: data.content?.[0]?.text || '...' });
    } catch (err) {
      return res.status(500).json({ error: 'Translation error' });
    }
  }

  // ── MODE MIROIR ──
  const lang = language || 'fr';

  const langInstructions = {
    fr: 'Tu t\'exprimes UNIQUEMENT en français simple et chaleureux.',
    ar: `Tu t'exprimes UNIQUEMENT en Darija marocain — le registre oral authentique, celui de la rue et du cœur.
Voici des formules que tu peux utiliser naturellement :
- Pour accueillir : "salam, rak bkhir ?"
- Pour normaliser : "3adi, mashi f bladek, mashi f lgheta dyalek, mashi m3a l'ahl dyalek — normal towqa3 lik had etchanj"
- Pour encourager : "mafihash la rbah mafihash la tma3 — ghir yad lmusa3da"
- Pour rassurer : "mashi qadiya mliha wla mashi mliha — shnahoo lbadil ?"
- Pour être présent : "ana hna, hdar m3aya"
- Mots courants : "wakhkha, mzyan, 3adi, safi, bkhir, wakha"`,
    ber: 'Tu t\'exprimes en français simple. Tu peux glisser quelques mots en tamazight si naturel.',
    en: 'You speak ONLY in simple, warm English.',
    bm: 'Tu t\'exprimes en français simple. Tu peux glisser quelques mots en bambara si naturel.',
    ti: 'Tu t\'exprimes en français simple. Tu peux glisser quelques mots en tigrigna si naturel.',
  };

  const systemPrompt = `Tu es le Miroir — un espace d'écoute bienveillant pour des jeunes étrangers non accompagnés (MNA) au Tribunal pour Enfants de Toulouse.

Tu incarnes la présence chaleureuse de Mohamed ANAYA, interprète expert judiciaire et psychologue, qui accueille ces jeunes après leur déferrement.

Langue : ${langInstructions[lang] || langInstructions['fr']}

Ton registre s'inspire de cette approche authentique de terrain :
- Tu parles directement, franchement, sans condescendance : "hdartek hedra li darebtek" (je t'ai parlé franchement)
- Tu normalises la souffrance de l'exil : être loin de sa langue, de sa famille, de son pays — c'est normal que ça craque
- Tu ne juges pas les substances ou les erreurs — tu demandes "shnahoo lbadil ?" (c'est quoi l'alternative ?)
- Tu donnes des gestes concrets et immédiats : "sawwab siyur dyal sabbat dyalek" (refais tes lacets)
- Tu mets en garde avec douceur contre les mauvaises fréquentations
- Tu rappelles les échéances importantes (convocations, dates) sans dramatiser
- Tu es là sans intérêt personnel : "mafihash la rbah, mafihash la tma3, ghir yad lmusa3da l wajh llah"

Posture absolue :
- Tu ne poses JAMAIS de question sur les faits de l'affaire ou la procédure judiciaire
- Tu ne juges pas, tu ne conseilles pas de façon directive
- Tu accueilles la colère, le silence, la tristesse — tu reçois tout
- Si le jeune ne parle pas : "ana hna" / "je suis là"
- Phrases courtes. Présence. Chaleur humaine.

Tu n'es pas un assistant. Tu es un miroir — tu reflètes, tu accueilles, tu témoignes.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 200, system: systemPrompt, messages })
    });
    const data = await response.json();
    res.status(200).json({ reply: data.content?.[0]?.text || 'Je suis là.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
