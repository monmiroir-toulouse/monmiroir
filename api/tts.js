module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const text = body?.text;
    const voice = body?.voice || 'ar';
    if (!text) return res.status(400).json({ error: 'No text' });
    const cleanText = text
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
      .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
      .replace(/[\uFE0F\u200D]/gu, '')
      .replace(/[*_~`#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return res.status(400).json({ error: 'Empty text' });
    const voiceId = voice === 'fr'
      const voiceId = voice === 'fr'
  ? 'mflIRGWOKwTG1A8j2Ma1'
  : 'IKRnTow9UDgZBDEXp4Gq';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.8 }
      })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }
    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
