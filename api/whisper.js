import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-lang');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const form = formidable({ maxFileSize: 25 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    
    const audioFile = files.file?.[0];
    const lang = fields.language?.[0] || 'ar';
    
    if (!audioFile) return res.status(400).json({ error: 'No file' });
    
    console.log('File:', audioFile.originalFilename, audioFile.size, audioFile.mimetype);
    
    const buffer = fs.readFileSync(audioFile.filepath);
    const outForm = new FormData();
    outForm.append('file', buffer, {
      filename: audioFile.originalFilename || 'audio.m4a',
      contentType: audioFile.mimetype || 'audio/mp4'
    });
    outForm.append('model', 'whisper-1');
    outForm.append('language', lang);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...outForm.getHeaders()
      },
      body: outForm
    });

    const text_response = await response.text();
    console.log('OpenAI response:', text_response);
    let data;
    try { data = JSON.parse(text_response); }
    catch(e) { data = { text: text_response }; }
    return res.status(200).json({ text: data.text || '' });
  } catch(e) {
    console.error('Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
