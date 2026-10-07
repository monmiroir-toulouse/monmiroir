// ── API : SAUVEGARDER UN RENDEZ-VOUS ──

let rendezVous = [];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET : récupérer tous les rendez-vous ──
  if (req.method === 'GET') {
    return res.status(200).json({ rdv: rendezVous });
  }

  // ── POST : ajouter un rendez-vous ──
  if (req.method === 'POST') {
    const { subscription, rdv } = req.body;
    
    if (!rdv || !rdv.date || !rdv.heure) {
      return res.status(400).json({ error: 'Missing rdv data' });
    }

    const nouveauRdv = {
      ...rdv,
      subscription: subscription,
      createdAt: new Date().toISOString()
    };

    rendezVous.push(nouveauRdv);
    
    console.log('RDV ajouté:', nouveauRdv);

    return res.status(200).json({ 
      success: true, 
      total: rendezVous.length 
    });
  }

  // ── DELETE : supprimer un rendez-vous ──
  if (req.method === 'DELETE') {
    const { id } = req.body;
    rendezVous = rendezVous.filter(function(r) { return r.id !== id; });
    return res.status(200).json({ success: true, total: rendezVous.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
