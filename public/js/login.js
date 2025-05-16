document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("errorMessage");
    
    // Fonction de débogage pour les problèmes de connexion
    function debugFetch(url, options, errorText) {
        console.log("Tentative de connexion à: " + url);
        console.log("Options:", options);
        console.log("Erreur:", errorText);
    }
    
    // Vérifier si l'utilisateur est déjà connecté
    if (localStorage.getItem("isLoggedIn") === "true") {
        redirectToApp();
    }
    
    // Gérer la soumission du formulaire
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // Vérifier que les champs ne sont pas vides
        if (!username || !password) {
            showError("Veuillez remplir tous les champs");
            return;
        }
        
        try {
            // Utiliser la fonction getApiBaseUrl pour obtenir l'URL du serveur
            const serverAddress = window.getApiBaseUrl();
            
            // Pour déboguer - afficher l'URL complète dans la console
            console.log("URL de l'API:", `${serverAddress}/api/auth/login`);
            
            // Afficher un message visuel pour indiquer une tentative de connexion
            showError("Connexion en cours...", "info");
            
            // Appeler l'API d'authentification
            const response = await fetch(`${serverAddress}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                // Ajouter des options pour résoudre les problèmes CORS potentiels
                mode: 'cors',
                credentials: 'same-origin'
            });
            
            // Imprimer les en-têtes de réponse pour le débogage
            console.log("Statut de la réponse:", response.status);
            
            const data = await response.json();
            console.log("Données reçues:", data);
            
            if (response.ok && data.success) {
                // Authentification réussie
                hideError(); // Cacher tout message d'erreur existant
                loginSuccess(data.user);
            } else {
                // Afficher le message d'erreur retourné par le serveur
                showError(data.message || "Erreur d'authentification");
            }
        } catch (error) {
            console.error("Erreur de connexion:", error);
            
            // Informations de débogage plus détaillées
            let errorDetails = "";
            if (error.message) {
                errorDetails = " (" + error.message + ")";
            }
            
            showError("Erreur de connexion au serveur" + errorDetails + ". Vérifiez votre connexion et l'adresse du serveur.");
            
            // Ajouter un bouton pour tester une connexion directe
            if (!document.getElementById("test-direct-connection")) {
                const testButton = document.createElement("button");
                testButton.id = "test-direct-connection";
                testButton.className = "debug-button";
                testButton.textContent = "Tester connexion directe";
                testButton.onclick = testDirectConnection;
                errorMessage.appendChild(document.createElement("br"));
                errorMessage.appendChild(testButton);
            }
        }
    });
    
    // Fonction pour tester une connexion directe au serveur
    async function testDirectConnection() {
        try {
            // Utiliser la fonction getApiBaseUrl pour obtenir l'URL du serveur
            const serverAddress = window.getApiBaseUrl();
            
            showError("Test de connexion en cours...", "info");
            
            const response = await fetch(`${serverAddress}/status`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                showError("Connexion au serveur réussie, mais problème d'authentification. Vérifiez vos identifiants.", "warning");
            } else {
                showError("Échec du test: Statut " + response.status, "error");
            }
        } catch (error) {
            showError("Échec du test: " + error.message, "error");
        }
    }
    
    // Fonction appelée lors d'une connexion réussie
    function loginSuccess(user) {
        // Stocker l'état de connexion et les informations utilisateur
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("username", user.username);
        localStorage.setItem("userData", JSON.stringify(user));
        localStorage.setItem("loginTime", Date.now());
        
        // Masquer le message d'erreur s'il était affiché
        hideError();
        
        // Afficher message de succès avant redirection
        showError("Connexion réussie ! Redirection...", "success");
        
        // Rediriger vers l'application principale après un court délai
        setTimeout(() => {
            redirectToApp();
        }, 1000);
    }
    
    // Rediriger vers l'application principale
    function redirectToApp() {
        window.location.href = "dashboard.html"; // Modifier pour cibler dashboard.html plutôt que index.html
    }
    
    // Afficher un message d'erreur avec type optionnel (error, info, warning, success)
    function showError(message, type = "error") {
        errorMessage.textContent = message;
        
        // Supprimer les classes existantes et ajouter celle correspondant au type
        errorMessage.className = "alert show";
        errorMessage.classList.add(type);
        
        // Animer l'erreur en secouant le formulaire seulement pour les erreurs
        if (type === "error") {
            loginForm.classList.add("shake");
            setTimeout(() => {
                loginForm.classList.remove("shake");
            }, 500);
            
            // Mettre en surbrillance les champs
            usernameInput.classList.add("error");
            passwordInput.classList.add("error");
            
            // Vider le champ mot de passe
            passwordInput.value = "";
            
            // Focus sur le nom d'utilisateur si vide, sinon sur le mot de passe
            if (!usernameInput.value.trim()) {
                usernameInput.focus();
            } else {
                passwordInput.focus();
            }
        }
    }
    
    // Cacher le message d'erreur
    function hideError() {
        errorMessage.textContent = "";
        errorMessage.className = "alert";
        usernameInput.classList.remove("error");
        passwordInput.classList.remove("error");
    }
    
    // Nettoyer l'erreur lorsque l'utilisateur commence à taper
    usernameInput.addEventListener("input", hideError);
    passwordInput.addEventListener("input", hideError);
    
    // Ajouter des styles pour les nouveaux types de messages
    const style = document.createElement('style');
    style.textContent = `
        .alert.info {
            background-color: #d1ecf1;
            color: #0c5460;
            border-color: #bee5eb;
        }
        
        .alert.success {
            background-color: #d4edda;
            color: #155724;
            border-color: #c3e6cb;
        }
        
        .alert.warning {
            background-color: #fff3cd;
            color: #856404;
            border-color: #ffeeba;
        }
        
        .debug-button {
            margin-top: 10px;
            padding: 5px 10px;
            background-color: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
        }
    `;
    document.head.appendChild(style);
});