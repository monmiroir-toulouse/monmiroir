/**
 * crypto-storage.js — Mon Miroir
 * Chiffrement AES-256-GCM du localStorage
 * Clé générée aléatoirement par session (sessionStorage)
 */

var CryptoStorage = (function() {

  var KEY_NAME = 'monmiroir_session_key';
  var cryptoKey = null;

  // ── Générer ou récupérer la clé de session ──────────
  async function getKey() {
    if (cryptoKey) return cryptoKey;

    var stored = sessionStorage.getItem(KEY_NAME);

    if (stored) {
      // Réhydrater la clé depuis sessionStorage
      var raw = base64ToBuffer(stored);
      cryptoKey = await crypto.subtle.importKey(
        'raw', raw,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      // Générer une nouvelle clé aléatoire
      cryptoKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      // Exporter et stocker dans sessionStorage
      var exported = await crypto.subtle.exportKey('raw', cryptoKey);
      sessionStorage.setItem(KEY_NAME, bufferToBase64(exported));
    }

    return cryptoKey;
  }

  // ── Chiffrer ────────────────────────────────────────
  async function encrypt(plaintext) {
    var key = await getKey();
    var iv  = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    var enc = new TextEncoder();
    var data = enc.encode(plaintext);

    var cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    // Concaténer IV + données chiffrées
    var result = new Uint8Array(iv.length + cipher.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(cipher), iv.length);

    return bufferToBase64(result.buffer);
  }

  // ── Déchiffrer ──────────────────────────────────────
  async function decrypt(ciphertext) {
    try {
      var key  = await getKey();
      var data = base64ToBuffer(ciphertext);
      var iv   = data.slice(0, 12);
      var enc  = data.slice(12);

      var plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc
      );

      return new TextDecoder().decode(plain);
    } catch(e) {
      // Données illisibles (autre session ou corrompues)
      return null;
    }
  }

  // ── API publique ─────────────────────────────────────

  async function setItem(key, value) {
    try {
      var str = typeof value === 'string' ? value : JSON.stringify(value);
      var encrypted = await encrypt(str);
      localStorage.setItem(key, encrypted);
      return true;
    } catch(e) {
      console.error('CryptoStorage.setItem error:', e);
      return false;
    }
  }

  async function getItem(key) {
    try {
      var encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      var plain = await decrypt(encrypted);
      if (!plain) return null;
      try { return JSON.parse(plain); } catch(e) { return plain; }
    } catch(e) {
      console.error('CryptoStorage.getItem error:', e);
      return null;
    }
  }

  function removeItem(key) {
    localStorage.removeItem(key);
  }

  function clear() {
    // Ne supprime que les clés Mon Miroir
    Object.keys(localStorage)
      .filter(function(k){ return k.startsWith('monmiroir_'); })
      .forEach(function(k){ localStorage.removeItem(k); });
  }

  // ── Utilitaires ─────────────────────────────────────
  function bufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    bytes.forEach(function(b){ binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function base64ToBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ── Init ─────────────────────────────────────────────
  // Pré-charger la clé au démarrage
  getKey().catch(function(e){
    console.warn('CryptoStorage init error:', e);
  });

  return {
    setItem:    setItem,
    getItem:    getItem,
    removeItem: removeItem,
    clear:      clear
  };

})();

/**
 * UTILISATION dans index.html / jeune.html :
 *
 * Remplacer :
 *   localStorage.setItem('monmiroir_hist_designer', JSON.stringify(histories.designer));
 *   var raw = localStorage.getItem('monmiroir_hist_designer');
 *
 * Par :
 *   await CryptoStorage.setItem('monmiroir_hist_designer', histories.designer);
 *   var data = await CryptoStorage.getItem('monmiroir_hist_designer');
 *
 * Remplacer :
 *   localStorage.setItem('monmiroir_lang', lang);
 *   var lang = localStorage.getItem('monmiroir_lang');
 *
 * Par :
 *   await CryptoStorage.setItem('monmiroir_lang', lang);
 *   var lang = await CryptoStorage.getItem('monmiroir_lang');
 */
