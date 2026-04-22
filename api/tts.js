module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    let text;
    if (typeof req.body === 'string') {
      text = JSON.parse(req.body).text;
    } else if (req.body && typeof req.body === 'object') {
      text = req.body.text;
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      text = JSON.parse(Buffer.concat(chunks).toString()).text;
    }
    if (!text) return res.status(400).json({ error: 'No text provided' });
    const cleanText = text
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
      .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
      .replace(/[\uFE0F\u200D]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return res.status(400).json({ error: 'Empty text' });
    const voice = req.body.voice || 'ar';
    const voiceId = voice === 'fr'
      ? 'mflIRGWOKwTG1A8j2Ma1'
      : 'MwbxzOINfu7MAPncd73U';
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
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }
    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
