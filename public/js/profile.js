document.addEventListener("DOMContentLoaded", () => {
    // Éléments du DOM
    const profileForm = document.getElementById('profileForm');
    const fullNameElement = document.getElementById('fullName');
    const emailElement = document.getElementById('email');
    const phoneElement = document.getElementById('phone');
    const usernameElement = document.getElementById('username');
    const languageElement = document.getElementById('language');
    const themeElement = document.getElementById('theme');
    const currentPasswordElement = document.getElementById('currentPassword');
    const newPasswordElement = document.getElementById('newPassword');
    const confirmPasswordElement = document.getElementById('confirmPassword');
    const profileFullNameElement = document.getElementById('profileFullName');
    const profileRoleElement = document.getElementById('profileRole');
    const resetButton = document.getElementById('resetButton');
    const alertMessage = document.getElementById('alertMessage');
    
    // Récupérer le nom d'utilisateur depuis le localStorage
    const username = localStorage.getItem('username');
    
    // Variables pour stocker les données utilisateur
    let userData = null;
    
    // Fonction pour récupérer les données utilisateur
    async function fetchUserData() {
        try {
            const serverAddress = localStorage.getItem('serverAddress') || window.location.hostname + ':3001';
            let apiUrl;
            
            if (!serverAddress.startsWith('http://') && !serverAddress.startsWith('https://')) {
                apiUrl = window.location.protocol + '//' + serverAddress;
            } else {
                apiUrl = serverAddress;
            }
            
            const response = await fetch(`${apiUrl}/api/users/${username}`);
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'error');
            return false;
        }
    }
    
    // Fonction pour peupler le formulaire avec les données utilisateur
    function populateForm(user) {
        // Mettre à jour l'en-tête du profil
        profileFullNameElement.textContent = user.fullName || username;
        profileRoleElement.textContent = `Rôle: ${capitalizeFirstLetter(user.role || 'Utilisateur')}`;
        
        // Remplir les champs du formulaire
        fullNameElement.value = user.fullName || '';
        emailElement.value = user.email || '';
        phoneElement.value = user.phone || '';
        usernameElement.value = user.username;
        languageElement.value = user.language || 'fr';
        themeElement.value = user.theme || 'light';
        
        // Appliquer le thème si nécessaire
        if (user.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }
    
    // Dans la fonction saveUserData
    async function saveUserData(formData) {
        try {
            const serverAddress = localStorage.getItem('serverAddress') || 'localhost:3001';
            const response = await fetch(`http://${serverAddress}/api/users/${username}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                userData = data.user;
                
                // Stocker le thème dans localStorage immédiatement
                if (formData.theme) {
                    localStorage.setItem('theme', formData.theme);
                }
                
                populateForm(userData);
                showAlert('Profil mis à jour avec succès', 'success');
                return true;
            } else {
                showAlert(data.message || 'Erreur lors de la mise à jour du profil', 'error');
                return false;
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'error');
            return false;
        }
    }
    
    // Fonction pour afficher les alertes
    function showAlert(message, type = 'success') {
        alertMessage.textContent = message;
        alertMessage.className = `alert ${type}`;
        
        // Masquer l'alerte après 5 secondes
        setTimeout(() => {
            alertMessage.classList.add('hidden');
        }, 5000);
    }
    
    // Gérer la soumission du formulaire
    profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Vérifier si le mot de passe est en cours de changement
        if (currentPasswordElement.value || newPasswordElement.value || confirmPasswordElement.value) {
            // Vérifier que tous les champs mot de passe sont remplis
            if (!currentPasswordElement.value || !newPasswordElement.value || !confirmPasswordElement.value) {
                showAlert('Tous les champs de mot de passe doivent être remplis', 'error');
                return;
            }
            
            // Vérifier que le nouveau mot de passe et la confirmation correspondent
            if (newPasswordElement.value !== confirmPasswordElement.value) {
                showAlert('Le nouveau mot de passe et sa confirmation ne correspondent pas', 'error');
                return;
            }
            
            // Vérifier que le mot de passe actuel est correct (dans une application réelle, cela serait fait côté serveur)
            if (currentPasswordElement.value !== userData.password) {
                showAlert('Le mot de passe actuel est incorrect', 'error');
                return;
            }
        }
        
        // Préparer les données à envoyer
        const formData = {
            fullName: fullNameElement.value,
            email: emailElement.value,
            phone: phoneElement.value,
            language: languageElement.value,
            theme: themeElement.value
        };
        
        // Ajouter le nouveau mot de passe si nécessaire
        if (newPasswordElement.value) {
            formData.password = newPasswordElement.value;
        }
        
        // Envoyer les données
        const success = await saveUserData(formData);
        
        if (success) {
            // Réinitialiser les champs de mot de passe
            currentPasswordElement.value = '';
            newPasswordElement.value = '';
            confirmPasswordElement.value = '';
            
            // Mettre à jour le nom d'utilisateur affiché dans le header
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                usernameDisplay.textContent = userData.username;
            }
        }
    });
    
    // Réinitialiser le formulaire
    resetButton.addEventListener('click', () => {
        if (userData) {
            populateForm(userData);
            
            // Réinitialiser les champs de mot de passe
            currentPasswordElement.value = '';
            newPasswordElement.value = '';
            confirmPasswordElement.value = '';
            
            showAlert('Formulaire réinitialisé', 'success');
        }
    });
    
    // Fonction utilitaire pour capitaliser la première lettre
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Initialiser la page
    fetchUserData();
});

document.addEventListener("DOMContentLoaded", () => {
    // Éléments du DOM - assurez-vous que ces déclarations sont au début
    const profileForm = document.getElementById('profileForm');
    const fullNameElement = document.getElementById('fullName');
    const emailElement = document.getElementById('email');
    const phoneElement = document.getElementById('phone');
    const usernameElement = document.getElementById('username');
    const languageElement = document.getElementById('language');
    const themeElement = document.getElementById('theme'); // S'assurer que cette ligne existe
    const currentPasswordElement = document.getElementById('currentPassword');
    const newPasswordElement = document.getElementById('newPassword');
    const confirmPasswordElement = document.getElementById('confirmPassword');
    const profileFullNameElement = document.getElementById('profileFullName');
    const profileRoleElement = document.getElementById('profileRole');
    const resetButton = document.getElementById('resetButton');
    const alertMessage = document.getElementById('alertMessage');
    
    // Ajouter un écouteur d'événements sur le sélecteur de thème
    // Assurez-vous que ceci est dans la même portée que la déclaration de themeElement
    if (themeElement) {
        themeElement.addEventListener('change', () => {
            applyTheme(themeElement.value);
        });
    }
    
    // Fonction pour appliquer le thème
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        localStorage.setItem('theme', theme);
    }
    
    // Appliquer le thème stocké dans localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // S'assurer que le sélecteur de thème correspond au thème appliqué
    if (themeElement) {
        themeElement.value = savedTheme;
    }
    
    // Au chargement de la page, appliquer le thème stocké dans localStorage
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // S'assurer que le sélecteur de thème correspond au thème appliqué
    if (themeElement) {
        themeElement.value = savedTheme;
    }
});
});

// Dans profile.js

// Fonction pour appliquer le thème
function applyTheme(theme) {
    // Appliquer le thème à la fois à html et body
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        document.body.classList.add('dark-theme');
    } else {
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');
    }
    
    localStorage.setItem('theme', theme);
}

// Assurez-vous d'ajouter cet écouteur dans votre bloc DOMContentLoaded
if (themeElement) {
    themeElement.addEventListener('change', function() {
        console.log("Changement de thème vers:", this.value);
        applyTheme(this.value);
    });
}