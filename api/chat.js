export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
 
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
 
  try {
    const resp = await fetch('https://monmiroir.vercel.app/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system: ag.system,
    messages: agentHistory[currentAgent]
  })
});

const data = await resp.json();
const reply = data.content?.[0]?.text || '...';
hideModalTyping();
addModalMessage('agent', reply.replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
agentHistory[currentAgent].push({ role: 'assistant', content: reply });
