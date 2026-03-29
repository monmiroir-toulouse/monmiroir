// ═══════════════════════════════════════════════════
// MON MIROIR — Serveur Backend Node.js / Express
// Tribunal pour Enfants de Toulouse · 2026
// ═══════════════════════════════════════════════════

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const jwt          = require('jsonwebtoken');
const nodemailer   = require('nodemailer');
const crypto       = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── SÉCURITÉ GLOBALE ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc : ["'self'"],
      scriptSrc  : ["'self'"],
      connectSrc : ["'self'", "https://api.anthropic.com"],
      frameSrc   : ["'none'"],
      objectSrc  : ["'none'"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true }
}));

app.use(cors({
  origin: [
    'https://monmiroir-toulouse.github.io',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50kb' }));

// ── RATE LIMITING ─────────────────────────────────
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' }
});

const limiterAuth = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives. Compte temporairement bloqué.' }
});

const limiterRapport = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Limite de rapports atteinte.' }
});

app.use(limiterGlobal);

// ── CHIFFREMENT DES DONNÉES MNA ───────────────────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes hex

function chiffrer(texte) {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let chiffre  = cipher.update(texte, 'utf8', 'hex');
  chiffre     += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), chiffre, authTag };
}

function dechiffrer(donnees) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(donnees.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(donnees.authTag, 'hex'));
  let texte  = decipher.update(donnees.chiffre, 'hex', 'utf8');
  texte     += decipher.final('utf8');
  return texte;
}

// ── AUTHENTIFICATION JWT ──────────────────────────
function genererToken(utilisateur) {
  return jwt.sign(
    { id: utilisateur.id, role: utilisateur.role, institution: utilisateur.institution },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function verifierToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token expiré ou invalide.' });
  }
}

function verifierRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({ error: 'Accès non autorisé pour ce rôle.' });
    }
    next();
  };
}

// ── ENVOI EMAIL (RAPPORTS) ────────────────────────
const transporteur = nodemailer.createTransport({
  host   : process.env.SMTP_HOST,
  port   : parseInt(process.env.SMTP_PORT) || 587,
  secure : false,
  auth   : {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { rejectUnauthorized: true }
});

async function envoyerRapport(destinataire, rapport) {
  const options = {
    from    : `"Mon Miroir - Tribunal Toulouse" <${process.env.SMTP_USER}>`,
    to      : destinataire,
    subject : `[MON MIROIR] Rapport de synthèse — ${rapport.metadata.id_rapport}`,
    text    : `
Rapport de synthèse IA — Mon Miroir
=====================================
ID Rapport    : ${rapport.metadata.id_rapport}
Date          : ${rapport.metadata.date_generation}
Pseudonyme MNA: ${rapport.mineur.pseudonyme}
Statut        : ${rapport.metadata.statut}

Ce rapport a été généré automatiquement par l'IA Scénariste de Mon Miroir
et validé par le Pilote humain.

Tribunal pour Enfants de Toulouse
Si Mohamed ANAYA — Interprète judiciaire-psychologue
    `,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#6B1A2A;color:#fff;padding:20px;text-align:center;">
    <h1 style="margin:0;font-size:22px;">Mon Miroir</h1>
    <p style="margin:5px 0 0;font-size:12px;opacity:0.8;">Tribunal pour Enfants de Toulouse</p>
  </div>
  <div style="background:#F4E8EB;border-left:4px solid #6B1A2A;padding:16px;margin:20px 0;">
    <strong>Rapport de synthèse IA</strong><br/>
    <small style="color:#888;">Ce document est confidentiel — données pseudonymisées</small>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;width:40%;">ID Rapport</td><td style="padding:8px;">${rapport.metadata.id_rapport}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;">Date</td><td style="padding:8px;">${rapport.metadata.date_generation}</td></tr>
    <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;">Pseudonyme MNA</td><td style="padding:8px;">${rapport.mineur.pseudonyme}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;">Statut</td><td style="padding:8px;">${rapport.metadata.statut}</td></tr>
    <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;">Destinataire</td><td style="padding:8px;">${destinataire}</td></tr>
  </table>
  <div style="margin-top:20px;padding:12px;background:#fff3cd;border:1px solid #ffc107;">
    <small>⚠️ Ce rapport contient des données pseudonymisées. Toute identification directe du mineur est interdite.</small>
  </div>
  <div style="margin-top:20px;font-size:11px;color:#888;text-align:center;">
    Mon Miroir · Tribunal pour Enfants de Toulouse · Si Mohamed ANAYA · 2026
  </div>
</body>
</html>
    `,
    attachments: [{
      filename   : `rapport_${rapport.metadata.id_rapport}.json`,
      content    : JSON.stringify(rapport, null, 2),
      contentType: 'application/json'
    }]
  };

  await transporteur.sendMail(options);
}

// ═══════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════

// ── SANTÉ ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status    : 'ok',
    app       : 'Mon Miroir Backend',
    version   : '1.0.0',
    timestamp : new Date().toISOString(),
    hebergement: 'OVH HDS France 🇫🇷'
  });
});

// ── AUTHENTIFICATION ──────────────────────────────
// POST /api/auth/login
// Body: { identifiant, motDePasse, role }
app.post('/api/auth/login', limiterAuth, async (req, res) => {
  try {
    const { identifiant, motDePasse, role } = req.body;

    if (!identifiant || !motDePasse || !role) {
      return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis.' });
    }

    // ⚠️ À remplacer par une vraie vérification base de données
    // Exemple de vérification simplifiée — à connecter à PostgreSQL
    const rolesValides = ['pilote', 'magistrat', 'educateur', 'ase', 'pjj'];
    if (!rolesValides.includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    // Simulation — remplacer par db.query en production
    const utilisateur = {
      id         : crypto.randomUUID(),
      identifiant,
      role,
      institution: 'Tribunal pour Enfants de Toulouse'
    };

    const token = genererToken(utilisateur);

    res.json({
      success: true,
      token,
      utilisateur: {
        id         : utilisateur.id,
        role       : utilisateur.role,
        institution: utilisateur.institution
      },
      expiration: '8h'
    });

  } catch (err) {
    console.error('Erreur login:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── RAPPORTS ──────────────────────────────────────
// POST /api/rapports/envoyer
// Envoie automatiquement le rapport au portail magistrat
app.post('/api/rapports/envoyer', verifierToken, verifierRole('pilote'), limiterRapport, async (req, res) => {
  try {
    const { rapport, destinataires } = req.body;

    if (!rapport || !destinataires || !Array.isArray(destinataires)) {
      return res.status(400).json({ error: 'Rapport et liste de destinataires requis.' });
    }

    // Validation basique du rapport
    if (!rapport.metadata || !rapport.mineur || !rapport.metadata.id_rapport) {
      return res.status(400).json({ error: 'Structure du rapport invalide.' });
    }

    // Vérifier que les données sont bien pseudonymisées
    if (rapport.mineur.nom || rapport.mineur.prenom) {
      return res.status(400).json({ error: 'Le rapport contient des données identifiantes. Pseudonymisation requise.' });
    }

    // Chiffrer le rapport avant stockage
    const rapportChiffre = chiffrer(JSON.stringify(rapport));

    // Envoyer aux destinataires
    const envois = [];
    for (const destinataire of destinataires) {
      // Validation email basique
      if (!destinataire.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) continue;
      await envoyerRapport(destinataire, rapport);
      envois.push(destinataire);
    }

    // Log de traçabilité (sans données identifiantes)
    console.log(`[RAPPORT] ${rapport.metadata.id_rapport} envoyé à ${envois.length} destinataire(s) par ${req.utilisateur.id}`);

    res.json({
      success   : true,
      id_rapport: rapport.metadata.id_rapport,
      envois    : envois.length,
      timestamp : new Date().toISOString()
    });

  } catch (err) {
    console.error('Erreur envoi rapport:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du rapport.' });
  }
});

// GET /api/rapports/:id
// Récupérer un rapport (magistrats uniquement)
app.get('/api/rapports/:id', verifierToken, verifierRole('magistrat', 'pilote'), (req, res) => {
  try {
    const { id } = req.params;

    // ⚠️ À remplacer par une vraie requête base de données
    // db.query('SELECT * FROM rapports WHERE id = $1', [id])

    res.json({
      success: true,
      message: `Rapport ${id} — connecter à la base de données PostgreSQL`,
      acces  : req.utilisateur.role
    });

  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── PORTAIL MAGISTRAT ─────────────────────────────
// GET /api/magistrat/dossiers
// Liste des dossiers accessibles au magistrat
app.get('/api/magistrat/dossiers', verifierToken, verifierRole('magistrat'), (req, res) => {
  try {
    // ⚠️ À remplacer par une vraie requête base de données
    res.json({
      success   : true,
      magistrat : req.utilisateur.id,
      dossiers  : [], // db.query(...)
      message   : 'Connecter à PostgreSQL pour récupérer les dossiers réels.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── PROXY CLAUDE API (sécurisé) ───────────────────
// POST /api/claude/message
// Proxy sécurisé — la clé API reste côté serveur
app.post('/api/claude/message', verifierToken, verifierRole('pilote', 'magistrat'), rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50
}), async (req, res) => {
  try {
    const { agent, messages, langue } = req.body;

    if (!agent || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Agent et messages requis.' });
    }

    const agentsValides = ['designer', 'scenariste', 'pilote'];
    if (!agentsValides.includes(agent)) {
      return res.status(400).json({ error: 'Agent invalide.' });
    }

    // Appel sécurisé à Claude — clé API côté serveur uniquement
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method : 'POST',
      headers: {
        'Content-Type'     : 'application/json',
        'x-api-key'        : process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model     : 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages
      })
    });

    const data  = await response.json();
    const reply = data.content?.[0]?.text || 'Je suis là, continue…';

    res.json({ success: true, reply });

  } catch (err) {
    console.error('Erreur Claude API:', err.message);
    res.status(500).json({ error: 'Erreur lors de la communication avec l\'IA.' });
  }
});

// ── GESTION DES ERREURS ───────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée.' });
});

app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err.message);
  res.status(500).json({ error: 'Erreur serveur interne.' });
});

// ── DÉMARRAGE ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       MON MIROIR — Backend API           ║
║  Tribunal pour Enfants de Toulouse 2026  ║
╠══════════════════════════════════════════╣
║  Port        : ${PORT}                        ║
║  Hébergement : OVH HDS France 🇫🇷        ║
║  RGPD        : Données pseudonymisées    ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
