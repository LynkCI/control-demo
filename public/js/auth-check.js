// auth-check.js
(function() {
    // Vérifier si l'utilisateur est connecté
    if (localStorage.getItem("isLoggedIn") !== "true") {
        // Rediriger vers la page de connexion
        window.location.href = "login.html";
        return;
    }
    
    // Vérifier si la session a expiré
    const loginTime = localStorage.getItem("loginTime");
    const now = Date.now();
    const sessionDuration = 12 * 60 * 60 * 1000; // 12 heures
    
    if (loginTime && now - parseInt(loginTime) > sessionDuration) {
        // La session a expiré
        clearAuthData();
        window.location.href = "login.html?expired=true";
        return;
    }
    
    // Mettre à jour le temps de connexion
    localStorage.setItem("loginTime", now.toString());
    
    // Appliquer le thème de manière sécurisée quand le document est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            applyTheme();
        });
    } else {
        applyTheme();
    }
})();

// Fonction pour appliquer le thème en toute sécurité
function applyTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    // S'assurer que body existe avant d'essayer d'y accéder
    if (document.body) {
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            document.documentElement.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
            document.documentElement.classList.remove('dark-theme');
        }
    }
}

// Fonction pour effacer toutes les données d'authentification
function clearAuthData() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("userData");
    localStorage.removeItem("loginTime");
    // Ne pas supprimer le thème
}

// Fonction pour se déconnecter (à appeler sur le bouton de déconnexion)
function logout() {
    clearAuthData();
    window.location.href = "login.html";
}