document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const sensorStatusElem = document.getElementById("sensorStatus");
    const switchStatusElem = document.getElementById("switchStatus");
    const turnOnBtn = document.getElementById("turnOn");
    const turnOffBtn = document.getElementById("turnOff");
    const timeForm = document.getElementById("timeForm");
    const timeFormBtn = timeForm.querySelector("button[type='submit']");
    
    // Éléments de configuration du serveur
    const serverAddressInput = document.getElementById("serverAddress");
    const connectBtn = document.getElementById("connectBtn");
    const connectionStatusElem = document.getElementById("connectionStatus");
    
    // Nouvel élément pour le mode automatique
    const autoModeToggle = document.getElementById('autoModeToggle');
    
    // État de l'application
    let manualMode = false;
    let connected = false;
    let API_URL = "";
    let statusTimer = null;
    
    // Charge l'adresse du serveur depuis le stockage local
    const loadSavedServerAddress = () => {
        const savedAddress = localStorage.getItem("serverAddress");
        if (savedAddress) {
            serverAddressInput.value = savedAddress;
            
            // Option: se connecter automatiquement avec l'adresse sauvegardée
            // connectToServer();
        }
        
        // Pré-remplir avec des valeurs par défaut si vide
        if (!serverAddressInput.value) {
            // Détecter si on est en localhost
            if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                serverAddressInput.value = "localhost:3001";
            } else {
                // Utiliser l'adresse du site courant
                serverAddressInput.value = `${window.location.hostname}:3001`;
            }
        }
    };
    
    // Fonction pour se connecter au serveur
    const connectToServer = () => {
        // Récupérer l'adresse du serveur
        let serverAddress = serverAddressInput.value.trim();
        
        // Valider l'adresse
        if (!serverAddress) {
            showToast("Veuillez entrer une adresse de serveur", "error");
            return;
        }
        
        // Ajouter le protocole si absent
        if (!serverAddress.startsWith("http://") && !serverAddress.startsWith("https://")) {
            serverAddress = "http://" + serverAddress;
        }
        
        // Mettre à jour l'UI en mode connexion
        setConnectionStatus("connecting");
        connectBtn.disabled = true;
        connectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connexion...';
        
        // Tester la connexion au serveur
        API_URL = serverAddress;
        
        fetch(`${API_URL}/status`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Erreur HTTP: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                // Connexion réussie
                console.log("Connexion réussie au serveur:", API_URL);
                showToast("Connecté au serveur avec succès", "success");
                
                // Sauvegarder l'adresse pour la prochaine fois
                localStorage.setItem("serverAddress", serverAddressInput.value.trim());
                
                // Activer l'interface
                enableInterface();
                
                // Démarrer le rafraîchissement périodique
                startPeriodicUpdates();
                
                // Charger les données immédiatement
                fetchStatus();
                fetchTimeConfig();
                
                // Récupérer l'état du mode automatique
                fetchAutoModeStatus();
            })
            .catch(err => {
                console.error("Erreur de connexion:", err);
                showToast("Impossible de se connecter au serveur", "error");
                
                // Réinitialiser l'UI
                setConnectionStatus("disconnected");
                connectBtn.disabled = false;
                connectBtn.innerHTML = '<i class="fa-solid fa-plug"></i> Connecter';
            });
    };
    
    // Définir l'état de connexion dans l'UI
    const setConnectionStatus = (status) => {
        // Mettre à jour l'élément de statut
        connectionStatusElem.className = "connection-status " + status;
        
        switch (status) {
            case "connected":
                connectionStatusElem.textContent = "Connecté";
                connected = true;
                break;
            case "disconnected":
                connectionStatusElem.textContent = "Non connecté";
                connected = false;
                break;
            case "connecting":
                connectionStatusElem.textContent = "Connexion en cours...";
                connected = false;
                break;
        }
    };
    
    // Activer tous les contrôles d'interface
    const enableInterface = () => {
        turnOnBtn.disabled = false;
        turnOffBtn.disabled = false;
        timeFormBtn.disabled = false;
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fa-solid fa-plug"></i> Connecter';
        
        // Activer le toggle du mode automatique s'il existe
        if (autoModeToggle) {
            autoModeToggle.disabled = false;
        }
        
        setConnectionStatus("connected");
    };
    
    // Désactiver l'interface en cas de déconnexion
    const disableInterface = () => {
        turnOnBtn.disabled = true;
        turnOffBtn.disabled = true;
        timeFormBtn.disabled = true;
        
        // Désactiver le toggle du mode automatique s'il existe
        if (autoModeToggle) {
            autoModeToggle.disabled = true;
        }
        
        setConnectionStatus("disconnected");
        
        // Arrêter les mises à jour périodiques
        if (statusTimer) {
            clearInterval(statusTimer);
            statusTimer = null;
        }
    };
    
    // Démarrer les mises à jour périodiques
    const startPeriodicUpdates = () => {
        // Arrêter l'ancien timer s'il existe
        if (statusTimer) {
            clearInterval(statusTimer);
        }
        
        // Créer un nouveau timer
        statusTimer = setInterval(fetchStatus, 5000);
    };
    
    // ===== DEVICE STATUS =====
    function fetchStatus() {
        if (!connected) return;
        
        fetch(`${API_URL}/status`)
            .then(res => res.json())
            .then(data => {
                console.log("Données reçues :", data);
                
                // Mettre à jour le mode manuel
                manualMode = data.manualMode;
                
                // Mettre à jour le statut du capteur
                const presence = data.sensorStatus.find(item => item.code === "presence_state");
                if (presence) {
                    let statusText = presence.value;
                    let statusClass = "";
                    
                    // Traduction des valeurs en français si nécessaire
                    switch(presence.value) {
                        case "none":
                            statusText = "Aucun mouvement";
                            statusClass = "text-danger";
                            break;
                        case "approach":
                            statusText = "Approche";
                            statusClass = "text-success";
                            break;
                        case "leave":
                            statusText = "S'éloigne";
                            statusClass = "text-warning";
                            break;
                    }
                    
                    sensorStatusElem.textContent = statusText;
                    sensorStatusElem.className = "status-value " + statusClass;
                }
                
                // Mettre à jour le statut de l'interrupteur
                const switchState = data.switchStatus.find(item => item.code === "switch");
                if (switchState) {
                    let statusText = switchState.value ? "Allumé" : "Éteint";
                    let statusClass = switchState.value ? "text-success" : "text-danger";
                    
                    if (manualMode) {
                        statusText += " (Mode Manuel)";
                    }
                    
                    switchStatusElem.textContent = statusText;
                    switchStatusElem.className = "status-value " + statusClass;
                }
            })
            .catch(err => {
                console.error("Erreur Fetch :", err);
                sensorStatusElem.textContent = "Erreur de connexion";
                switchStatusElem.textContent = "Erreur de connexion";
                
                // Afficher un toast d'erreur
                showToast("Erreur de connexion au serveur", "error");
                
                // Considérer comme déconnecté après plusieurs échecs
                if (connected) {
                    disableInterface();
                }
            });
    }
    
    // ===== TIME SCHEDULE =====
    function fetchTimeConfig() {
        if (!connected) return;
        
        fetch(`${API_URL}/get-time`)
            .then(res => res.json())
            .then(data => {
                console.log("Configuration horaire reçue :", data);
                
                // Mettre à jour les valeurs du formulaire
                document.getElementById("onTime").value = data.onTime;
                document.getElementById("offTime").value = data.offTime;
            })
            .catch(err => {
                console.error("Erreur récupération horaires :", err);
                showToast("Impossible de récupérer les horaires", "error");
            });
    }
    
    // ===== AUTO MODE =====
    // Fonction pour récupérer l'état du mode automatique
    function fetchAutoModeStatus() {
        if (!connected || !autoModeToggle) return;
        
        fetch(`${API_URL}/api/auto-mode`)
            .then(res => res.json())
            .then(data => {
                if (data.success && autoModeToggle) {
                    autoModeToggle.checked = data.autoModeEnabled;
                    console.log(`État du mode automatique: ${data.autoModeEnabled ? 'Activé' : 'Désactivé'}`);
                }
            })
            .catch(err => {
                console.error("Erreur récupération du mode automatique :", err);
            });
    }
    
    // Gestionnaire pour le toggle du mode automatique
    if (autoModeToggle) {
        autoModeToggle.addEventListener('change', function() {
            if (!connected) {
                showToast("Veuillez d'abord vous connecter au serveur", "warning");
                this.checked = !this.checked; // Remettre dans l'état précédent
                return;
            }
            
            const newState = this.checked;
            
            fetch(`${API_URL}/api/auto-mode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled: newState })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(`Mode automatique ${newState ? 'activé' : 'désactivé'}`, 'success');
                } else {
                    showToast("Erreur lors du changement de mode", 'error');
                    // Remettre l'interrupteur dans son état précédent
                    this.checked = !newState;
                }
            })
            .catch(err => {
                console.error("Erreur lors du changement de mode automatique:", err);
                showToast("Erreur de connexion", 'error');
                // Remettre l'interrupteur dans son état précédent
                this.checked = !newState;
            });
        });
    }
    
    // Soumettre les nouveaux horaires
    timeForm.addEventListener("submit", (event) => {
        event.preventDefault();
        
        if (!connected) {
            showToast("Veuillez d'abord vous connecter au serveur", "warning");
            return;
        }
        
        const onTimeValue = document.getElementById("onTime").value;
        const offTimeValue = document.getElementById("offTime").value;
        
        // Afficher l'état de chargement
        const submitBtn = timeForm.querySelector("button[type='submit']");
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Sauvegarde en cours...";
        submitBtn.disabled = true;
        
        fetch(`${API_URL}/update-time`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ onTime: onTimeValue, offTime: offTimeValue }),
        })
        .then(response => response.json())
        .then(data => {
            // Afficher un message de succès
            showToast(data.message || "Horaires mis à jour avec succès", "success");
            
            // Réinitialiser le bouton
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        })
        .catch(error => {
            console.error("Erreur de mise à jour des horaires :", error);
            showToast("Une erreur est survenue lors de la mise à jour des horaires", "error");
            
            // Réinitialiser le bouton
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });
    
    // ===== DEVICE CONTROL =====
    // Éteindre et activer le mode manuel
    turnOffBtn.addEventListener("click", () => {
        if (!connected) {
            showToast("Veuillez d'abord vous connecter au serveur", "warning");
            return;
        }
        
        turnOffBtn.disabled = true;
        
        fetch(`${API_URL}/switch/off`, { method: "POST" })
            .then(() => {
                manualMode = true;
                switchStatusElem.textContent = "Éteint (Mode Manuel)";
                switchStatusElem.className = "status-value text-danger";
                showToast("Interrupteur éteint et mode manuel activé", "success");
                turnOffBtn.disabled = false;
            })
            .catch(error => {
                console.error("Erreur d'extinction :", error);
                showToast("Erreur lors de l'extinction de l'interrupteur", "error");
                turnOffBtn.disabled = false;
            });
    });
    
    // Allumer et désactiver le mode manuel
    turnOnBtn.addEventListener("click", () => {
        if (!connected) {
            showToast("Veuillez d'abord vous connecter au serveur", "warning");
            return;
        }
        
        turnOnBtn.disabled = true;
        
        fetch(`${API_URL}/switch/on`, { method: "POST" })
            .then(() => {
                manualMode = false;
                showToast("Interrupteur allumé et mode automatique activé", "success");
                fetchStatus(); // Actualiser le statut
                turnOnBtn.disabled = false;
            })
            .catch(error => {
                console.error("Erreur d'allumage :", error);
                showToast("Erreur lors de l'allumage de l'interrupteur", "error");
                turnOnBtn.disabled = false;
            });
    });
    
    // ===== ÉVÉNEMENTS =====
    // Gérer le bouton de connexion
    connectBtn.addEventListener("click", connectToServer);
    
    // Permettre la validation du formulaire de connexion avec la touche Entrée
    serverAddressInput.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            connectToServer();
        }
    });
    
    // ===== UTILITIES =====
    // Notification Toast
    function showToast(message, type = "success") {
        // Vérifier si un conteneur de toast existe déjà
        let toastContainer = document.querySelector('.toast-container');
        
        // En créer un s'il n'existe pas
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Créer le toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Ajouter une icône selon le type
        let icon = '';
        switch(type) {
            case 'success': icon = '<i class="fa-solid fa-check-circle"></i>'; break;
            case 'error': icon = '<i class="fa-solid fa-times-circle"></i>'; break;
            case 'warning': icon = '<i class="fa-solid fa-exclamation-triangle"></i>'; break;
            case 'info': icon = '<i class="fa-solid fa-info-circle"></i>'; break;
        }
        
        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Supprimer le toast après la fin de l'animation
        setTimeout(() => {
            toast.remove();
        }, 3500);
    }
    
    // Fonction pour tenter de se reconnecter automatiquement
    function attemptReconnect() {
        if (!connected && API_URL) {
            console.log("Tentative de reconnexion...");
            fetch(`${API_URL}/status`)
                .then(res => res.json())
                .then(data => {
                    console.log("Reconnexion réussie");
                    showToast("Reconnecté au serveur", "success");
                    enableInterface();
                    startPeriodicUpdates();
                    fetchStatus();
                    // Récupérer l'état du mode automatique
                    fetchAutoModeStatus();
                })
                .catch(err => {
                    console.error("Échec de la tentative de reconnexion:", err);
                });
        }
    }
    
    // Gérer les erreurs de connexion réseau
    window.addEventListener('offline', () => {
        showToast("Votre appareil est hors ligne", "error");
        disableInterface();
    });
    
    window.addEventListener('online', () => {
        showToast("Connexion réseau rétablie", "info");
        // Attendre un peu que la connexion soit stable avant de tenter une reconnexion
        setTimeout(attemptReconnect, 2000);
    });
    
    // Ajouter un écouteur pour détecter les changements de réseau (pour les appareils mobiles)
    if (navigator.connection) {
        navigator.connection.addEventListener('change', () => {
            console.log("Changement de connexion réseau détecté");
            if (navigator.onLine && !connected) {
                setTimeout(attemptReconnect, 1000);
            }
        });
    }
    
    // Initialisation
    loadSavedServerAddress();
    
    // Option: Connecter automatiquement au démarrage après un court délai
    setTimeout(() => {
        // Si une adresse existe, tenter de se connecter automatiquement
        if (serverAddressInput.value && !connected) {
            connectToServer();
        }
    }, 500);
});