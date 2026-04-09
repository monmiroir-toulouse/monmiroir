/**
 * MON MIROIR — Avatar Médiateur v2
 * Calibré : portrait classique, bouche bas de cadre (bottom 30%)
 * Intro : joue intro.mp4 avec audio en premier, puis boucle muette
 *
 * USAGE :
 *   HTML : <div id="mm-avatar"></div>
 *   JS   : <script src="avatar-mediator.js"></script>
 *
 * INTÉGRATION (une ligne dans votre chatbot) :
 *   const reply = await getAIResponse(msg);
 *   MonMiroir.speak(reply);
 *
 * ELEVENLABS (plus tard) :
 *   MonMiroir.enableElevenLabs();
 */

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════
  //  CONFIG
  // ══════════════════════════════════════════════════════
  const CONFIG = {
    videoSrc: 'intro.mp4',
    ttsSpeed: 0.9,
    ttsPitch: 1.05,
    elevenLabsEnabled: false,
    elevenLabsEndpoint: '/api/tts',
    defaultLang: 'fr',
    // Position lip-sync : portrait classique, bouche bas de cadre
    lipSyncBottom: '30%',
    lipSyncWidth: '32%',
    lipSyncHeight: '5%',
  };

  // ══════════════════════════════════════════════════════
  //  STRINGS MULTILINGUES
  // ══════════════════════════════════════════════════════
  const STRINGS = {
    fr: { ttsLang: 'fr-FR', idle: 'Appuie pour me parler', speaking: 'Je te parle…', listening: "J'écoute…", replay: 'Réécouter', intro: 'Introduction' },
    ar: { ttsLang: 'ar-SA', idle: 'اضغط للتحدث إليّ',    speaking: 'أتحدث إليك…', listening: 'أستمع…',    replay: 'إعادة',     intro: 'مقدمة' },
    en: { ttsLang: 'en-US', idle: 'Tap to speak to me',   speaking: 'Speaking…',    listening: 'Listening…', replay: 'Replay',    intro: 'Introduction' },
    bn: { ttsLang: 'bn-BD', idle: 'আমার সাথে কথা বলো',   speaking: 'বলছি…',        listening: 'শুনছি…',    replay: 'আবার শোনো', intro: 'পরিচয়' },
  };

  // ══════════════════════════════════════════════════════
  //  STATE
  // ══════════════════════════════════════════════════════
  let currentLang    = CONFIG.defaultLang;
  let isSpeaking     = false;
  let introPlayed    = false;
  let mouthTimeout   = null;
  let lastSpokenText = '';

  // ══════════════════════════════════════════════════════
  //  STYLES
  // ══════════════════════════════════════════════════════
  const STYLES = `
    #mm-avatar {
      position: relative;
      width: 100%;
      max-width: 320px;
      margin: 0 auto;
      font-family: 'Lora', Georgia, serif;
      user-select: none;
    }

    .mm-video-wrap {
      position: relative;
      width: 100%;
      padding-bottom: 133%;
      border-radius: 16px;
      overflow: hidden;
      background: #0e0907;
      box-shadow: 0 0 40px rgba(196,120,58,0.18);
    }
    .mm-video-wrap video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
    }

    /* Intro badge */
    #mm-intro-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 10px;
      pointer-events: none;
      z-index: 20;
      transition: opacity 0.8s ease;
    }
    #mm-intro-badge {
      font-size: 10px;
      color: rgba(196,120,58,0.9);
      letter-spacing: .12em;
      font-family: 'Lora', serif;
      background: rgba(14,9,7,0.65);
      padding: 4px 12px;
      border-radius: 10px;
      border: 1px solid rgba(196,120,58,0.28);
    }

    /* Lip-sync overlay */
    .mm-lipsync-overlay {
      position: absolute;
      bottom: 30%;
      left: 50%;
      transform: translateX(-50%);
      width: 32%;
      height: 5%;
      pointer-events: none;
      z-index: 10;
    }
    .mm-mouth-shape {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(0,0,0,0);
      transition: transform 0.07s ease, background 0.07s ease;
    }
    .mm-mouth-shape.open {
      transform: scaleY(1.7) scaleX(1.05);
      background: rgba(0,0,0,0.2);
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
    }

    /* Speaking ring */
    .mm-speaking-ring {
      position: absolute;
      inset: -4px;
      border-radius: 18px;
      border: 2px solid rgba(196,120,58,0);
      transition: border-color 0.25s ease, box-shadow 0.25s ease;
      pointer-events: none;
      z-index: 5;
    }
    .mm-speaking-ring.active {
      border-color: rgba(196,120,58,0.65);
      box-shadow: 0 0 28px rgba(196,120,58,0.35), inset 0 0 24px rgba(196,120,58,0.04);
      animation: mm-pulse-ring 1.3s ease-in-out infinite;
    }

    /* Emotion glow */
    .mm-emotion-glow {
      position: absolute;
      inset: 0;
      border-radius: 16px;
      pointer-events: none;
      z-index: 4;
      opacity: 0;
      transition: opacity 0.5s ease, background 0.5s ease;
    }
    .mm-emotion-glow.hesitation { background: radial-gradient(ellipse at 50% 65%, rgba(196,120,58,0.14) 0%, transparent 70%); opacity:1; }
    .mm-emotion-glow.sadness    { background: radial-gradient(ellipse at 50% 65%, rgba(96,122,170,0.14) 0%, transparent 70%); opacity:1; }
    .mm-emotion-glow.fear       { background: radial-gradient(ellipse at 50% 65%, rgba(196,120,96,0.12) 0%, transparent 70%); opacity:1; }
    .mm-emotion-glow.strength   { background: radial-gradient(ellipse at 50% 65%, rgba(122,184,154,0.14) 0%, transparent 70%); opacity:1; }

    /* Status bar */
    .mm-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      padding: 8px 12px;
      background: #0e0907;
      border: 1px solid #2a1a0a;
      border-radius: 10px;
    }
    .mm-status-text {
      font-size: 11px;
      color: #8a6a3a;
      letter-spacing: .08em;
      transition: color 0.3s;
    }
    .mm-status-text.speaking  { color: #c4783a; animation: mm-shimmer 1s ease-in-out infinite; }
    .mm-status-text.listening { color: #7ab89a; }

    /* Waveform */
    .mm-waveform {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 18px;
    }
    .mm-wave-bar {
      width: 3px;
      height: 4px;
      background: #c4783a;
      border-radius: 2px;
      opacity: 0.2;
      transition: height 0.1s, opacity 0.1s;
    }
    .mm-waveform.active .mm-wave-bar { opacity: 0.85; }
    .mm-waveform.active .mm-wave-bar:nth-child(1) { animation: mm-wave 0.35s ease-in-out infinite alternate; --wh:8px;  }
    .mm-waveform.active .mm-wave-bar:nth-child(2) { animation: mm-wave 0.40s ease-in-out infinite alternate; --wh:14px; }
    .mm-waveform.active .mm-wave-bar:nth-child(3) { animation: mm-wave 0.30s ease-in-out infinite alternate; --wh:18px; }
    .mm-waveform.active .mm-wave-bar:nth-child(4) { animation: mm-wave 0.45s ease-in-out infinite alternate; --wh:11px; }
    .mm-waveform.active .mm-wave-bar:nth-child(5) { animation: mm-wave 0.38s ease-in-out infinite alternate; --wh:16px; }

    /* Controls */
    .mm-controls { display: flex; gap: 8px; margin-top: 10px; }
    .mm-btn {
      flex: 1;
      padding: 10px;
      background: #0e0907;
      border: 1px solid #2a1a0a;
      border-radius: 10px;
      color: #8a6a3a;
      font-size: 11px;
      font-family: inherit;
      letter-spacing: .08em;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .mm-btn:hover:not(:disabled) { border-color: #c4783a; color: #c4783a; }
    .mm-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* Speed */
    .mm-speed-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      font-size: 10px;
      color: #5a3a1a;
    }
    .mm-speed-row input[type=range] { flex:1; accent-color:#c4783a; cursor:pointer; }
    .mm-speed-val { color:#8a6a3a; min-width:28px; }

    /* TTS badge */
    .mm-tts-badge {
      font-size: 9px;
      padding: 2px 7px;
      border-radius: 8px;
      background: #1a1008;
      border: 1px solid #2a1a0a;
      color: #5a3a1a;
      letter-spacing: .06em;
    }
    .mm-tts-badge.eleven { border-color: rgba(196,120,58,0.3); color: #c4783a; }

    @keyframes mm-pulse-ring {
      0%,100% { box-shadow: 0 0 20px rgba(196,120,58,0.25), inset 0 0 20px rgba(196,120,58,0.03); }
      50%      { box-shadow: 0 0 40px rgba(196,120,58,0.55), inset 0 0 40px rgba(196,120,58,0.07); }
    }
    @keyframes mm-shimmer { 0%,100%{opacity:0.55} 50%{opacity:1} }
    @keyframes mm-wave { from{height:3px} to{height:var(--wh)} }
    @keyframes mm-fade-out { from{opacity:1} to{opacity:0} }
  `;

  // ══════════════════════════════════════════════════════
  //  BUILD DOM
  // ══════════════════════════════════════════════════════
  function buildDOM(container) {
    const S = STRINGS[currentLang];
    container.innerHTML =
      '<div class="mm-video-wrap" id="mm-video-wrap">' +
        '<video id="mm-video" src="' + CONFIG.videoSrc + '" autoplay playsinline preload="auto" style="will-change:transform"></video>' +
        '<div id="mm-intro-overlay">' +
          '<div id="mm-intro-badge">▶ ' + S.intro + '</div>' +
        '</div>' +
        '<div class="mm-lipsync-overlay">' +
          '<div class="mm-mouth-shape" id="mm-mouth"></div>' +
        '</div>' +
        '<div class="mm-emotion-glow" id="mm-emotion-glow"></div>' +
        '<div class="mm-speaking-ring" id="mm-speaking-ring"></div>' +
      '</div>' +
      '<div class="mm-status-bar">' +
        '<span class="mm-status-text" id="mm-status-text">● ● ●</span>' +
        '<div class="mm-waveform" id="mm-waveform">' +
          '<div class="mm-wave-bar"></div><div class="mm-wave-bar"></div>' +
          '<div class="mm-wave-bar"></div><div class="mm-wave-bar"></div>' +
          '<div class="mm-wave-bar"></div>' +
        '</div>' +
        '<span class="mm-tts-badge" id="mm-tts-badge">Web Speech</span>' +
      '</div>' +
      '<div class="mm-controls">' +
        '<button class="mm-btn" id="mm-replay-btn" disabled onclick="MonMiroir.replay()">🔊 <span id="mm-replay-lbl">' + S.replay + '</span></button>' +
      '</div>' +
      '<div class="mm-speed-row">' +
        '<span>🐢</span>' +
        '<input type="range" id="mm-speed" min="0.5" max="1.4" step="0.1" value="' + CONFIG.ttsSpeed + '">' +
        '<span>🐇</span>' +
        '<span class="mm-speed-val" id="mm-speed-val">' + CONFIG.ttsSpeed.toFixed(1) + '×</span>' +
      '</div>';

    document.getElementById('mm-speed').addEventListener('input', function () {
      CONFIG.ttsSpeed = parseFloat(this.value);
      document.getElementById('mm-speed-val').textContent = CONFIG.ttsSpeed.toFixed(1) + '×';
    });

    // ── Video behaviour ──
    // Intro : joue avec audio une fois, puis boucle en silence
    const video = document.getElementById('mm-video');
    const overlay = document.getElementById('mm-intro-overlay');

    video.addEventListener('ended', function () {
      if (!introPlayed) {
        introPlayed = true;
        // Fade out overlay
        overlay.style.animation = 'mm-fade-out 0.8s ease forwards';
        setTimeout(function () { overlay.style.display = 'none'; }, 800);
        // Switch to muted loop
        video.muted = true;
        video.loop = true;
        video.play();
      }
    });

    // Si l'autoplay avec audio échoue (politique navigateur), on passe direct en loop muet
    video.addEventListener('error', function () {
      video.muted = true;
      video.loop  = true;
      if (overlay) overlay.style.display = 'none';
      introPlayed = true;
      video.play().catch(function(){});
    });

    // Certains navigateurs bloquent l'audio sans interaction — fallback propre
    video.play().catch(function () {
      video.muted = true;
      video.loop  = true;
      if (overlay) overlay.style.display = 'none';
      introPlayed = true;
      video.play().catch(function(){});
    });
  }

  // ══════════════════════════════════════════════════════
  //  LIP-SYNC
  // ══════════════════════════════════════════════════════
  function startLipSync() {
    stopLipSync();
    const mouth = document.getElementById('mm-mouth');
    if (!mouth) return;
    let open = false;
    function toggle() {
      open = !open;
      mouth.classList.toggle('open', open);
      // Rythme irrégulier pour naturel
      const delay = open
        ? 90  + Math.random() * 130   // ouvert 90–220ms
        : 55  + Math.random() * 90;   // fermé  55–145ms
      mouthTimeout = setTimeout(toggle, delay);
    }
    toggle();
  }

  function stopLipSync() {
    clearTimeout(mouthTimeout);
    mouthTimeout = null;
    const mouth = document.getElementById('mm-mouth');
    if (mouth) mouth.classList.remove('open');
  }

  // ══════════════════════════════════════════════════════
  //  STATE HELPERS
  // ══════════════════════════════════════════════════════
  function setSpeakingState(active) {
    isSpeaking = active;
    const ring   = document.getElementById('mm-speaking-ring');
    const wform  = document.getElementById('mm-waveform');
    const status = document.getElementById('mm-status-text');
    const S = STRINGS[currentLang];
    if (ring)   ring.classList.toggle('active', active);
    if (wform)  wform.classList.toggle('active', active);
    if (status) {
      status.textContent = active ? S.speaking : '● ● ●';
      status.className = 'mm-status-text' + (active ? ' speaking' : '');
    }
    if (active) startLipSync(); else stopLipSync();
  }

  function setEmotionInternal(emotion) {
    const glow = document.getElementById('mm-emotion-glow');
    if (!glow) return;
    glow.className = 'mm-emotion-glow' + (emotion ? ' ' + emotion : '');
    if (emotion) setTimeout(function () { setEmotionInternal(null); }, 7000);
  }

  // ══════════════════════════════════════════════════════
  //  TTS — WEB SPEECH
  // ══════════════════════════════════════════════════════
  function speakWithBrowser(text) {
    var synth = window.speechSynthesis;
    if (!synth) { console.warn('[MonMiroir] speechSynthesis non disponible'); return; }
    synth.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang  = STRINGS[currentLang].ttsLang;
    utter.rate  = CONFIG.ttsSpeed;
    utter.pitch = CONFIG.ttsPitch;
    utter.onstart = function () { setSpeakingState(true); };
    utter.onend   = function () { setSpeakingState(false); enableReplay(); };
    utter.onerror = function () { setSpeakingState(false); enableReplay(); };
    synth.speak(utter);
  }

  // ══════════════════════════════════════════════════════
  //  TTS — ELEVENLABS (décommenter api/tts.js quand prêt)
  //
  //  api/tts.js (Vercel) :
  //  ─────────────────────────────────────────────────────
  //  export default async function handler(req, res) {
  //    const { text } = req.body;
  //    const r = await fetch(
  //      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
  //      { method:'POST',
  //        headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY,'Content-Type':'application/json'},
  //        body:JSON.stringify({ text, model_id:'eleven_multilingual_v2',
  //          voice_settings:{ stability:0.5, similarity_boost:0.85 }}) }
  //    );
  //    const buf = await r.arrayBuffer();
  //    res.setHeader('Content-Type','audio/mpeg');
  //    res.send(Buffer.from(buf));
  //  }
  //  ─────────────────────────────────────────────────────
  //  Variables Vercel : ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID
  // ══════════════════════════════════════════════════════
  async function speakWithElevenLabs(text) {
    setSpeakingState(true);
    try {
      var res = await fetch(CONFIG.elevenLabsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, lang: currentLang }),
      });
      var blob  = await res.blob();
      var url   = URL.createObjectURL(blob);
      var audio = new Audio(url);
      audio.onended = function () { setSpeakingState(false); enableReplay(); URL.revokeObjectURL(url); };
      audio.onerror = function () { setSpeakingState(false); speakWithBrowser(text); };
      await audio.play();
    } catch (e) {
      console.warn('[MonMiroir] ElevenLabs error, fallback browser TTS', e);
      speakWithBrowser(text);
    }
  }

  function enableReplay() {
    var btn = document.getElementById('mm-replay-btn');
    if (btn) btn.disabled = false;
  }

  // ══════════════════════════════════════════════════════
  //  PUBLIC API  →  window.MonMiroir
  // ══════════════════════════════════════════════════════
  window.MonMiroir = {

    /**
     * Faire parler l'avatar avec le texte de la réponse IA.
     *
     * Intégration dans votre chatbot (une ligne) :
     *   const reply = await getAIResponse(userMessage);
     *   MonMiroir.speak(reply);
     *
     * Avec émotion :
     *   MonMiroir.speak(reply, 'hesitation'); // hesitation|sadness|fear|strength
     */
    speak: function (text, emotion) {
      if (!text) return;
      lastSpokenText = text;
      var btn = document.getElementById('mm-replay-btn');
      if (btn) btn.disabled = true;
      if (emotion) setEmotionInternal(emotion);
      CONFIG.elevenLabsEnabled
        ? speakWithElevenLabs(text)
        : speakWithBrowser(text);
    },

    replay: function () {
      if (lastSpokenText) this.speak(lastSpokenText);
    },

    stop: function () {
      window.speechSynthesis && window.speechSynthesis.cancel();
      setSpeakingState(false);
    },

    setLang: function (lang) {
      if (!STRINGS[lang]) return;
      currentLang = lang;
      var lbl = document.getElementById('mm-replay-lbl');
      if (lbl) lbl.textContent = STRINGS[lang].replay;
      var badge = document.getElementById('mm-intro-badge');
      if (badge) badge.textContent = '▶ ' + STRINGS[lang].intro;
    },

    setEmotion: function (emotion) { setEmotionInternal(emotion); },

    setSpeed: function (v) {
      CONFIG.ttsSpeed = Math.min(1.4, Math.max(0.5, v));
      var el = document.getElementById('mm-speed');
      if (el) { el.value = CONFIG.ttsSpeed; }
      var vl = document.getElementById('mm-speed-val');
      if (vl) vl.textContent = CONFIG.ttsSpeed.toFixed(1) + '×';
    },

    /** Activer la voix clonée ElevenLabs */
    enableElevenLabs: function () {
      CONFIG.elevenLabsEnabled = true;
      var badge = document.getElementById('mm-tts-badge');
      if (badge) { badge.textContent = 'ElevenLabs'; badge.className = 'mm-tts-badge eleven'; }
      console.log('[MonMiroir] ElevenLabs TTS activé ✓');
    },

    /** Ajuster la position du lip-sync (si votre vidéo diffère) */
    setLipSyncPosition: function (bottom, width) {
      var el = document.querySelector('.mm-lipsync-overlay');
      if (el) { el.style.bottom = bottom; el.style.width = width; }
    },
  };

  // ══════════════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════════════
  function init() {
    var container = document.getElementById('mm-avatar');
    if (!container) {
      console.warn('[MonMiroir] Aucun élément #mm-avatar trouvé dans le DOM.');
      return;
    }
    var style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
    buildDOM(container);
    console.log('[MonMiroir] Avatar médiateur v2 initialisé ✓');
    console.log('[MonMiroir] → MonMiroir.speak(text) pour faire parler l\'avatar');
    console.log('[MonMiroir] → MonMiroir.enableElevenLabs() quand votre clé est prête');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();