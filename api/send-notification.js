const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:mohamedanaya@hotmail.fr',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscription, title, body, url } = req.body;
  
  if (!subscription) {
    return res.status(400).json({ error: 'Missing subscription' });
  }

  const payload = JSON.stringify({
    title: title || 'Mon Miroir',
    body: body || 'Tu as un rendez-vous.',
    url: url || '/mes-rendez-vous.html'
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur envoi notification:', err);
    return res.status(500).json({ error: err.message });
  }
};
