const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:mohamedanaya@hotmail.fr',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  let rendezVous = [];
  
  try {
    const baseUrl = 'https://' + req.headers.host;
    const response = await fetch(baseUrl + '/api/save-rdv');
    const data = await response.json();
    rendezVous = data.rdv || [];
  } catch(err) {
    console.error('Erreur récupération RDV:', err);
    return res.status(500).json({ error: 'Cannot fetch rdv' });
  }

  const maintenant = new Date();
  let envoyes = 0;

  for (const rdv of rendezVous) {
    if (!rdv.subscription || !rdv.date || !rdv.heure) continue;

    const rdvDate = new Date(rdv.date + 'T' + rdv.heure);
    const diffJours = Math.ceil((rdvDate - maintenant) / (1000 * 60 * 60 * 24));

    let message = null;

    if (diffJours === 3) {
      message = {
        title: 'Mon Miroir',
        body: 'Ton rendez-vous ' + rdv.lieu + ' est dans 3 jours.',
        url: '/mes-rendez-vous.html'
      };
    } else if (diffJours === 1) {
      message = {
        title: 'Mon Miroir',
        body: 'Ton rendez-vous ' + rdv.lieu + ' est demain.',
        url: '/mes-rendez-vous.html'
      };
    } else if (diffJours === 0) {
      message = {
        title: 'Mon Miroir',
        body: "C'est aujourd'hui ! Ton rendez-vous " + rdv.lieu + '.',
        url: '/mes-rendez-vous.html'
      };
    }

    if (message) {
      try {
        await webpush.sendNotification(rdv.subscription, JSON.stringify(message));
        envoyes++;
      } catch(err) {
        console.error('Erreur envoi:', err);
      }
    }
  }

  return res.status(200).json({ 
    success: true, 
    envoyes: envoyes,
    total: rendezVous.length 
  });
};
