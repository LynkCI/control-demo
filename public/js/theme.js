// theme.js
(function() {
    // Fonction pour appliquer le thème, sans dépendre d'éléments DOM spécifiques
    function applyTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        
        if (theme === 'dark') {
            document.documentElement.classList.add('dark-theme');
            if (document.body) document.body.classList.add('dark-theme');
        } else {
            document.documentElement.classList.remove('dark-theme');
            if (document.body) document.body.classList.remove('dark-theme');
        }
    }
    
    // Appliquer le thème immédiatement 
    applyTheme();
    
    // Réappliquer le thème une fois que le DOM est complètement chargé
    document.addEventListener('DOMContentLoaded', applyTheme);
    
    // Exposer une API globale pour gérer le thème
    window.ThemeUtil = {
        getCurrentTheme: function() {
            return localStorage.getItem('theme') || 'light';
        },
        setTheme: function(theme) {
            localStorage.setItem('theme', theme);
            applyTheme();
        }
    };
})();