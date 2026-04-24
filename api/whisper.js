export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-lang');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const lang = req.headers['x-lang'] || 'fr';
  const contentType = req.headers['content-type'] || 'multipart/form-data';
  const boundary = contentType.split('boundary=')[1];

  const { FormData, Blob } = await import('node-fetch').catch(() => globalThis);

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'audio/webm' }), 'audio.webm');
  form.append('model', 'whisper-1');
  form.append('language', lang);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form
  });

  const data = await response.json();
  console.log('Whisper response:', JSON.stringify(data));
  return res.status(200).json({ text: data.text || '' });
}
