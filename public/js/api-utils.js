// api-utils.js
(function() {
    // Fonction pour obtenir l'URL de base de l'API avec le bon protocole
    window.getApiBaseUrl = function() {
        const serverAddress = localStorage.getItem('serverAddress');
        
        // Si une adresse serveur est enregistrée, l'utiliser avec le bon protocole
        if (serverAddress) {
            if (!serverAddress.startsWith('http://') && !serverAddress.startsWith('https://')) {
                return window.location.protocol + '//' + serverAddress;
            }
            return serverAddress;
        }
        
        // Détection automatique pour localhost
        const host = window.location.hostname;
        const isLocalhost = host === 'localhost' || host === '127.0.0.1';
        
        // En local, toujours utiliser HTTP
        if (isLocalhost) {
            return 'http://' + host + ':3001';
        }
        
        // Sinon, utiliser le même protocole que la page
        return window.location.protocol + '//' + host + ':3001';
    };
})();