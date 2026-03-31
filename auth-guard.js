// auth-guard.js — À inclure dans toutes les pages protégées
// <script src="auth-guard.js"></script>  → à ajouter avant </body>

(function() {
  var session = sessionStorage.getItem('monmiroir_auth');
  if (!session) {
    window.location.replace('login.html');
    return;
  }
  try {
    var user = JSON.parse(session);
    // Affiche le nom du pilote connecté si l'élément existe
    var el = document.getElementById('pilote-connecte');
    if (el) {
      var nom = user.nom.replace(/\b\w/g, function(c){ return c.toUpperCase(); });
      el.textContent = nom;
    }
  } catch(e) {
    sessionStorage.removeItem('monmiroir_auth');
    window.location.replace('login.html');
  }
})();

function deconnexion() {
  if (confirm('Se déconnecter de Mon Miroir ?')) {
    sessionStorage.removeItem('monmiroir_auth');
    window.location.replace('login.html');
  }
}
