export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-lang, x-mime');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const lang = req.headers['x-lang'] || 'fr';

    console.log('Buffer size:', buffer.length, 'lang:', lang);

    const { default: FormData } = await import('form-data');
    const form = new FormData();
    form.append('file', buffer, {
      filename: 'audio.mp4',
      contentType: 'audio/mpeg'
    });
    form.append('model', 'whisper-1');
    form.append('language', lang);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    const text_response = await response.text();
    console.log('OpenAI raw response:', text_response);
    
    let data;
    try { data = JSON.parse(text_response); } 
    catch(e) { data = { text: text_response }; }
    
    return res.status(200).json({ text: data.text || '' });
  } catch(e) {
    console.error('Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
