// Ce script doit être chargé avant tout autre script pour appliquer immédiatement le thème
(function() {
    // Appliquer le thème immédiatement
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        
        // Définir les couleurs Chart.js pour le thème sombre
        if (window.Chart) {
            window.Chart.defaults.color = '#f0f6fc';
            window.Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
    }
    
    // Créer la fonction globale pour changer de thème
    window.setTheme = function(theme) {
        localStorage.setItem('theme', theme);
        
        if (theme === 'dark') {
            document.documentElement.classList.add('dark-theme');
            document.body.classList.add('dark-theme');
            
            // Mettre à jour les couleurs de Chart.js si disponible
            if (window.Chart) {
                window.Chart.defaults.color = '#f0f6fc';
                window.Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
        } else {
            document.documentElement.classList.remove('dark-theme');
            document.body.classList.remove('dark-theme');
            
            // Réinitialiser les couleurs de Chart.js si disponible
            if (window.Chart) {
                window.Chart.defaults.color = '#666';
                window.Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
            }
        }
        
        // Déclencher un événement pour avertir les autres scripts
        const event = new CustomEvent('themeChange', { detail: { theme } });
        window.dispatchEvent(event);
    };
    
    // Écouter l'événement DOMContentLoaded pour s'assurer que le body existe
    document.addEventListener('DOMContentLoaded', function() {
        // Réappliquer le thème au cas où body n'existait pas encore
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    });
})();