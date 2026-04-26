const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'Missing fields' });

    const token = process.env.GITHUB_TOKEN;
    const repo = 'monmiroir-toulouse/monmiroir';
    const path = `bibliotheque/${filename}`;
    const encoded = Buffer.from(content).toString('base64');

    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MonMiroir'
      },
      body: JSON.stringify({
        message: `Ajout témoignage ${filename}`,
        content: encoded
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'GitHub error');
    return res.status(200).json({ success: true, path });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
// api/bibliotheque.js — LIRE la bibliothèque
const fetch = require('node-fetch');
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.GITHUB_TOKEN;
  const repo = 'monmiroir-toulouse/monmiroir';
  
  // Lister tous les fichiers de la bibliothèque
  const response = await fetch(
    `https://api.github.com/repos/${repo}/contents/bibliotheque`,
    { headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'MonMiroir' }}
  );
  const files = await response.json();
  // Lire le contenu de chaque fichier
  const textes = await Promise.all(files.map(async f => {
    const r = await fetch(f.download_url);
    return await r.text();
  }));
  return res.status(200).json({ textes });
};
