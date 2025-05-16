import express = require("express");
import fs = require("fs");
import { TuyaContext } from "@tuya/tuya-connector-nodejs";
import * as http from "http";
import { Server } from "socket.io";
import { Request, Response } from "express";
import path = require("path");
const AUTH_FILE_PATH = "./login.json";
// Ajout des dépendances pour le cron job
const cron = require('node-cron');
const { exec } = require('child_process');


interface User {
  id: number;
  username: string;
  password: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  language: string;
  theme: string;
  createdAt: string;
  lastLogin: string | null;
}

interface UsersData {
  users: User[];
}

// Fonction pour charger les utilisateurs depuis le fichier JSON
function loadUsers(): UsersData {
  try {
    if (fs.existsSync(AUTH_FILE_PATH)) {
      const data = fs.readFileSync(AUTH_FILE_PATH, 'utf8');
      return JSON.parse(data);
    } else {
      console.log("⚙️ Le fichier d'authentification n'existe pas");
      // Créer un fichier avec un utilisateur admin par défaut
      const defaultUsers: UsersData = {
        users: [
          {
            id: 1,
            username: "admin",
            password: "admin",
            email: "admin@lynk.com",
            fullName: "Administrateur Principal",
            phone: "",
            role: "admin",
            language: "fr",
            theme: "light",
            createdAt: new Date().toISOString(),
            lastLogin: null
          }
        ]
      };
      fs.writeFileSync(AUTH_FILE_PATH, JSON.stringify(defaultUsers, null, 2));
      return defaultUsers;
    }
  } catch (error) {
    console.error("❌ Erreur lors du chargement des utilisateurs:", error);
    return { users: [] };
  }
}

// Fonction pour sauvegarder les utilisateurs dans le fichier JSON
function saveUsers(usersData: UsersData): void {
  try {
    fs.writeFileSync(AUTH_FILE_PATH, JSON.stringify(usersData, null, 2));
    console.log("👤 Données utilisateurs sauvegardées");
  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde des utilisateurs:", error);
  }
}



// Configuration du chemin des fichiers
const FILE_PATH = "./time-config.json";
const HISTORY_PATH = "./consumption-history.json";
const PUBLIC_DIR = path.join(__dirname, "public");
const ENERGY_HISTORY_PATH = "./energy-history.json";
const CONSUMPTION_FILE_PATH = './consommation.json';

// Taux de conversion kWh vers FCFA
const RATE_KWH_TO_FCFA = 129; // À ajuster selon vos tarifs locaux

// Création de l'application Express
const app = express();
app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// Middleware CORS
const cors = require("cors");
// Configuration CORS correcte pour permettre les connexions depuis différentes origines
app.use(cors({
  origin: "*", // Permet l'accès depuis n'importe quelle origine
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Création du serveur HTTP et Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Configuration de l'API Tuya
const context = new TuyaContext({
  baseUrl: "https://openapi.tuyaeu.com",
  accessKey: process.env.TUYA_ACCESS_KEY || "x9hsfcyu48scyfjynmts",
  secretKey: process.env.TUYA_SECRET_KEY || "bb68d26a5c51478e8bc4d90e9f18a9c5",
});

// Liste des appareils connectés
const devices = {
  sensor: process.env.TUYA_SENSOR_ID || "bf00a36b3f5181fb62tkdn",
  switch: process.env.TUYA_SWITCH_ID || "bfe2d31f064304b138eqcs",
};

// État global de l'application
let manualMode = false;
let forcedOff = false;
let offTime = "23:00"; // Heure à laquelle le switch s'éteint automatiquement
let onTime = "06:00"; // Heure à laquelle le switch s'allume et reprend le capteur
// Ajouter cette variable avec les autres variables d'état
let autoModeEnabled = true; // Par défaut, le mode automatique est activé /api/auto-mode

// Structure pour les données de consommation d'énergie
interface EnergyData {
  timestamp: number; // Date en timestamp
  date: string; // Date formatée
  consumption: number; // en kWh
  cost: number; // en FCFA
}

// Structure pour l'historique stocké dans le fichier JSON
interface EnergyHistory {
  daily: EnergyData[];
  weekly: EnergyData[];
  monthly: EnergyData[];
  lastUpdated: number;
}


//USER

// Route d'authentification
app.post("/api/auth/login", (req: Request, res: Response) => {
  console.log("🔍 Tentative de connexion:", {
    body: req.body,
    headers: req.headers,
    ip: req.ip
  });
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ 
      success: false,
      message: "Nom d'utilisateur et mot de passe requis" 
    });
    return; // Utilisez return seul pour sortir prématurément
  }
  
  const usersData = loadUsers();
  const user = usersData.users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // Mettre à jour la dernière connexion
    user.lastLogin = new Date().toISOString();
    saveUsers(usersData);
    
    // Retourner les informations utilisateur (sans le mot de passe)
    const { password, ...userInfo } = user;
    res.json({
      success: true,
      message: "Authentification réussie",
      user: userInfo
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Nom d'utilisateur ou mot de passe incorrect"
    });
  }
});

// Route pour récupérer les informations de l'utilisateur
app.get("/api/users/:username", (req: Request, res: Response) => {
  const { username } = req.params;
  
  const usersData = loadUsers();
  const user = usersData.users.find(u => u.username === username);
  
  if (user) {
    // Ne pas renvoyer le mot de passe
    const { password, ...userInfo } = user;
    res.json({
      success: true,
      user: userInfo
    });
  } else {
    res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé"
    });
  }
});

// Route pour mettre à jour les informations de l'utilisateur
app.put("/api/users/:username", (req: Request, res: Response) => {
  const { username } = req.params;
  const updatedUserInfo = req.body;
  
  // Charger les utilisateurs
  const usersData = loadUsers();
  const userIndex = usersData.users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé"
    });
    return;
  }
  
  // Mettre à jour les informations (sauf l'ID et le rôle)
  const currentUser = usersData.users[userIndex];
  const newUserData = {
    ...currentUser,
    ...updatedUserInfo,
    id: currentUser.id, // Conserver l'ID original
    role: currentUser.role, // Conserver le rôle original
    username: username // Conserver le nom d'utilisateur original
  };
  
  // Sauvegarder les changements
  usersData.users[userIndex] = newUserData;
  saveUsers(usersData);
  
  // Retourner les données mises à jour (sans le mot de passe)
  const { password, ...userInfo } = newUserData;
  res.json({
    success: true,
    message: "Profil mis à jour avec succès",
    user: userInfo
  });
});

//RECUPPERATION DE LA CONSOMMATION 

// Route pour récupérer les données de consommation historiques
app.get("/api/energy/consumption", (req: Request, res: Response) => {
  try {
    if (fs.existsSync(CONSUMPTION_FILE_PATH)) {
      const data = fs.readFileSync(CONSUMPTION_FILE_PATH, 'utf8');
      const consumptionData = JSON.parse(data);
      
      res.json({
        success: true,
        data: consumptionData
      });
    } else {
      // Retourner une structure vide si le fichier n'existe pas encore
      res.json({
        success: true,
        data: {
          lastUpdated: new Date().toISOString(),
          dailyRecords: [],
          calculations: {
            yesterday: { consumption: 0, cost: 0 },
            week: { consumption: 0, cost: 0 },
            month: { consumption: 0, cost: 0 },
            months: {
              1: { consumption: 0, cost: 0 },
              2: { consumption: 0, cost: 0 },
              3: { consumption: 0, cost: 0 },
              4: { consumption: 0, cost: 0 }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des données de consommation:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur"
    });
  }
});

// Charger la configuration initiale
function loadConfig() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf8');
      const config = JSON.parse(data);
      
      if (config.onTime) onTime = config.onTime;
      if (config.offTime) offTime = config.offTime;
      
      console.log(`⚙️ Configuration chargée: ON à ${onTime}, OFF à ${offTime}`);
    } else {
      // Créer le fichier avec les valeurs par défaut
      console.log("⚙️ Le fichier de configuration n'existe pas, création avec valeurs par défaut...");
      fs.writeFileSync(FILE_PATH, JSON.stringify({ onTime, offTime }, null, 2));
    }
  } catch (error) {
    console.error("❌ Erreur lors du chargement de la configuration:", error);
  }
}

// Fonction pour récupérer la consommation d'énergie en temps réel
// Fonction pour récupérer la consommation d'énergie en temps réel avec correction des unités
async function getRealTimeConsumption(deviceId: string): Promise<{ power: number, energy: number } | null> {
  try {
    // Utiliser le même chemin que dans getDeviceStatus() pour être cohérent
    const response = await context.request({
      path: `/v1.0/iot-03/devices/${deviceId}/status`,
      method: "GET",
    });
    
    console.log("Réponse de l'API Tuya pour la consommation:", JSON.stringify(response, null, 2));
    
    if (!Array.isArray(response.result)) {
      console.error("Format de réponse inattendu:", response);
      return null;
    }
    
    // Journaliser tous les codes disponibles pour comprendre la structure
    console.log("Codes disponibles:", response.result.map(item => `${item.code}: ${item.value}`).join(", "));
    
    // Chercher les codes liés à la consommation
    const powerData = response.result.find(item => item.code === "cur_power");
    const energyData = response.result.find(item => item.code === "add_ele");
    
    if (!powerData && !energyData) {
      console.log("Aucune donnée de consommation trouvée");
      return null;
    }
    
    // Conversion des valeurs selon les bons facteurs:
    // - cur_power semble être en milliwatts (mW), donc diviser par 1000 pour obtenir des watts
    // - add_ele semble être en kWh et ne nécessite pas de conversion
    const power = powerData ? Number(powerData.value) / 1000 : 0; // Conversion de mW à W
    const energy = energyData ? Number(energyData.value) : 0; // Déjà en kWh
    
    return {
      power, // Puissance en watts
      energy // Énergie en kWh
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des données en temps réel:", error);
    console.error("Détails de l'erreur:", error instanceof Error ? error.message : error);
    return null;
  }
}

// Fonction pour charger l'historique de consommation stocké
function loadEnergyHistory(): EnergyHistory {
  try {
    if (fs.existsSync(ENERGY_HISTORY_PATH)) {
      const data = fs.readFileSync(ENERGY_HISTORY_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erreur lors du chargement de l'historique d'énergie:", error);
  }
  
  // Retourner une structure vide si le fichier n'existe pas ou est corrompu
  return {
    daily: [],
    weekly: [],
    monthly: [],
    lastUpdated: Date.now()
  };
}

// Fonction pour sauvegarder l'historique de consommation
function saveEnergyHistory(history: EnergyHistory): void {
  try {
    fs.writeFileSync(ENERGY_HISTORY_PATH, JSON.stringify(history, null, 2));
    console.log("📊 Historique de consommation d'énergie sauvegardé");
  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde de l'historique d'énergie:", error);
  }
}

// Fonction pour enregistrer une nouvelle consommation d'énergie
function recordEnergyConsumption(consumption: number): void {
  const now = new Date();
  const timestamp = now.getTime();
  const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  const cost = consumption * RATE_KWH_TO_FCFA;
  
  const newEntry: EnergyData = {
    timestamp,
    date: formattedDate,
    consumption,
    cost
  };
  
  // Charger l'historique existant
  const history = loadEnergyHistory();
  
  // Ajouter l'entrée à l'historique quotidien
  history.daily.push(newEntry);
  
  // Mettre à jour l'historique hebdomadaire et mensuel si nécessaire
  updateWeeklyAndMonthlyHistory(history);
  
  // Limiter le nombre d'entrées dans chaque historique
  history.daily = history.daily.slice(-30); // Garder 30 jours
  history.weekly = history.weekly.slice(-52); // Garder 52 semaines
  history.monthly = history.monthly.slice(-24); // Garder 24 mois
  
  // Mettre à jour la date de dernière mise à jour
  history.lastUpdated = timestamp;
  
  // Sauvegarder l'historique
  saveEnergyHistory(history);
}

// Fonction pour mettre à jour les historiques hebdomadaires et mensuels
function updateWeeklyAndMonthlyHistory(history: EnergyHistory): void {
  const now = new Date();
  
  // Obtenir le début de la semaine et du mois actuels
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Dimanche = 0, Lundi = 1, etc.
  startOfWeek.setHours(0, 0, 0, 0);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Filtrer les entrées quotidiennes de la semaine actuelle
  const entriesThisWeek = history.daily.filter(entry => 
    entry.timestamp >= startOfWeek.getTime()
  );
  
  // Filtrer les entrées quotidiennes du mois actuel
  const entriesThisMonth = history.daily.filter(entry => 
    entry.timestamp >= startOfMonth.getTime()
  );
  
  // Si nous avons des entrées pour cette semaine
  if (entriesThisWeek.length > 0) {
    // Calculer la consommation totale de la semaine
    const totalConsumption = entriesThisWeek.reduce((sum, entry) => sum + entry.consumption, 0);
    const totalCost = entriesThisWeek.reduce((sum, entry) => sum + entry.cost, 0);
    
    // Vérifier si nous avons déjà une entrée pour cette semaine
    const existingWeekEntry = history.weekly.find(entry => {
      const entryDate = new Date(entry.timestamp);
      const entryStartOfWeek = new Date(entryDate);
      entryStartOfWeek.setDate(entryDate.getDate() - entryDate.getDay());
      entryStartOfWeek.setHours(0, 0, 0, 0);
      
      return entryStartOfWeek.getTime() === startOfWeek.getTime();
    });
    
    if (existingWeekEntry) {
      // Mettre à jour l'entrée existante
      existingWeekEntry.consumption = totalConsumption;
      existingWeekEntry.cost = totalCost;
    } else {
      // Créer une nouvelle entrée pour cette semaine
      history.weekly.push({
        timestamp: startOfWeek.getTime(),
        date: `Sem ${getWeekNumber(now)}`,
        consumption: totalConsumption,
        cost: totalCost
      });
    }
  }
  
  // Si nous avons des entrées pour ce mois
  if (entriesThisMonth.length > 0) {
    // Calculer la consommation totale du mois
    const totalConsumption = entriesThisMonth.reduce((sum, entry) => sum + entry.consumption, 0);
    const totalCost = entriesThisMonth.reduce((sum, entry) => sum + entry.cost, 0);
    
    // Vérifier si nous avons déjà une entrée pour ce mois
    const existingMonthEntry = history.monthly.find(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
    });
    
    if (existingMonthEntry) {
      // Mettre à jour l'entrée existante
      existingMonthEntry.consumption = totalConsumption;
      existingMonthEntry.cost = totalCost;
    } else {
      // Créer une nouvelle entrée pour ce mois
      const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
      history.monthly.push({
        timestamp: startOfMonth.getTime(),
        date: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
        consumption: totalConsumption,
        cost: totalCost
      });
    }
  }
}

// Fonction utilitaire pour obtenir le numéro de la semaine dans l'année
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Récupérer l'état du périphérique
async function getDeviceStatus(device_id: string): Promise<{ code: string; value: any }[]> {
  try {
    const response = await context.request({
      path: `/v1.0/iot-03/devices/${device_id}/status`,
      method: "GET",
    });
    console.log(`📱 Statut du device ${device_id}:`, response.result);
    return Array.isArray(response.result) ? response.result : [];
  } catch (error) {
    console.error(`❌ Erreur récupération statut ${device_id}:`, error);
    return [];
  }
}

// Mettre à jour l'état du périphérique
async function setDeviceStatus(device_id: string, code: string, value: any) {
  try {
    await context.request({
      path: `/v1.0/iot-03/devices/${device_id}/commands`,
      method: "POST",
      body: { commands: [{ code, value }] },
    });
    console.log(`💡 État de ${code} mis à jour sur ${device_id}: ${value}`);
    
    // Émettre un événement via Socket.IO pour informer les clients connectés
    io.emit('deviceUpdate', { device: device_id, code, value });
  } catch (error) {
    console.error(`❌ Erreur mise à jour ${code} pour ${device_id}:`, error);
  }
}

// Lire l'heure actuelle
function getCurrentTime() {
  const currentTime = new Date();
  return currentTime.getHours() * 60 + currentTime.getMinutes(); // Convertir l'heure et les minutes en minutes totales
}

// Lire les données du fichier JSON
function getConfigFromFile() {
  try {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Erreur lors de la lecture du fichier de configuration:", error);
    return { onTime, offTime };
  }
}

// Mettre à jour le fichier JSON
function updateConfigToFile(config: any) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(config, null, 2));
    console.log("⚙️ Configuration mise à jour et enregistrée");
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du fichier de configuration:", error);
  }
}

// Fonction de contrôle du switch basé sur l'heure
async function checkAndControlSwitch() {
  try {
    const config = getConfigFromFile();
    const { onTime, offTime } = config;
  
    const currentTimeInMinutes = getCurrentTime();
  
    // Convertir les horaires de ON/OFF en minutes totales
    const [onHour, onMinute] = onTime.split(":").map(Number);
    const onTimeInMinutes = onHour * 60 + onMinute;
  
    const [offHour, offMinute] = offTime.split(":").map(Number);
    const offTimeInMinutes = offHour * 60 + offMinute;
  
    // Vérifier si c'est l'heure d'allumer ou d'éteindre
    const switchStatus = await getDeviceStatus(devices.switch);
    const currentSwitchState = switchStatus.find((item) => item.code === "switch")?.value;
  
    // Si c'est l'heure d'allumer et que le mode manuel n'est pas activé
    if (currentTimeInMinutes >= onTimeInMinutes && currentSwitchState === false && !manualMode) {
      console.log(`🕒 L'heure d'allumage (${onTime}) est arrivée. Le switch va être allumé.`);
      await setDeviceStatus(devices.switch, "switch", true);
      manualMode = false; // Désactiver le mode manuel
    }
  
    // Si c'est l'heure d'éteindre
    if (currentTimeInMinutes >= offTimeInMinutes && currentSwitchState === true) {
      console.log(`🕒 L'heure d'arrêt (${offTime}) est arrivée. Le switch va être éteint.`);
      await setDeviceStatus(devices.switch, "switch", false);
      manualMode = true; // Activer le mode manuel
    }
  } catch (error) {
    console.error("❌ Erreur lors du contrôle programmé du switch:", error);
  }
}



// Fonction pour surveiller les appareils
async function monitorDevices() {
    // Si le mode automatique est désactivé, ne pas exécuter la logique basée sur le capteur
  if (!autoModeEnabled) {
    console.log("🚫 Mode automatique désactivé, le capteur ne contrôle pas l'interrupteur");
    return;
  }

  if (manualMode) {
    console.log("🛑 Mode manuel actif, le capteur ne contrôle plus l'interrupteur.");
    return;
  }

  try {
    const sensorStatus = await getDeviceStatus(devices.sensor);
    const switchStatus = await getDeviceStatus(devices.switch);

    if (sensorStatus.length > 0) {
      const presence = sensorStatus.find((item) => item.code === "presence_state");

      if (presence) {
        const switchState = switchStatus.find((item) => item.code === "switch");
        const newSwitchValue = presence.value === "none" ? false : true;

        if (switchState && switchState.value !== newSwitchValue) {
          console.log(`👀 Présence détectée (${presence.value}), mise à jour de l'interrupteur...`);
          await setDeviceStatus(devices.switch, "switch", newSwitchValue);
        }
      }
    }
  } catch (error) {
    console.error("❌ Erreur lors de la surveillance des appareils:", error);
  }
}

// Tâche planifiée pour enregistrer périodiquement la consommation
const scheduleEnergyRecording = () => {
  // Enregistrer la consommation toutes les heures
  setInterval(async () => {
    try {
      const deviceId = devices.switch;
      const data = await getRealTimeConsumption(deviceId);
      
      if (data && data.energy > 0) {
        console.log(`📊 Enregistrement automatique de la consommation: ${data.energy} kWh`);
        recordEnergyConsumption(data.energy);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement automatique de la consommation:", error);
    }
  }, 3600000); // 1 heure en millisecondes
};

// ===== Routes API =====

// Route pour obtenir les horaires actuels
app.get("/get-time", (req: Request, res: Response) => {
  res.json({ onTime, offTime });
});

// Recevoir et mettre à jour les heures ON et OFF
app.post("/update-time", (req: Request, res: Response) => {
  const { onTime: newOnTime, offTime: newOffTime } = req.body;
  
  if (newOnTime) onTime = newOnTime;
  if (newOffTime) offTime = newOffTime;
  
  console.log(`⏰ Heure ON mise à: ${onTime}`);
  console.log(`⏰ Heure OFF mise à: ${offTime}`);

  const timeConfig = { onTime, offTime };
  updateConfigToFile(timeConfig);

  res.json({ message: "Heures mises à jour avec succès" });
});

// Obtenir l'état des appareils
app.get("/status", async (req: Request, res: Response) => {
  try {
    const sensorStatus = await getDeviceStatus(devices.sensor);
    const switchStatus = await getDeviceStatus(devices.switch);
    console.log("📤 Données envoyées:", { sensorStatus, switchStatus });
    res.json({ sensorStatus, switchStatus, manualMode });
  } catch (error) {
    console.error("❌ Erreur dans /status:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Contrôle manuel des interrupteurs
app.post("/switch/:state", async (req: Request, res: Response) => {
  const state = req.params.state === "on";
  
  try {
    await setDeviceStatus(devices.switch, "switch", state);

    if (!state) {
      manualMode = true; // Activer le mode manuel lors de l'extinction
      console.log("🔒 Mode manuel activé");
    } else {
      manualMode = false; // Désactiver le mode manuel lorsqu'on allume
      console.log("🔓 Mode manuel désactivé");
    }

    res.json({ message: `Interrupteur mis à ${state ? "ON" : "OFF"}` });
  } catch (error) {
    console.error(`❌ Erreur lors du contrôle de l'interrupteur (${state ? "ON" : "OFF"}):`, error);
    res.status(500).json({ error: "Erreur lors du contrôle de l'interrupteur" });
  }
});

// Obtenir l'historique de consommation (suite)
app.get("/consumption-history", (req: Request, res: Response) => {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const data = fs.readFileSync(HISTORY_PATH, 'utf8');
      const consumptionData = JSON.parse(data);
      res.json(consumptionData);
    } else {
      res.status(404).json({ error: "Données d'historique non disponibles" });
    }
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'historique:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Route pour récupérer la consommation en temps réel avec unités ajustées
app.get("/api/energy/realtime", async (req: Request, res: Response) => {
  try {
    // Utiliser le deviceId de l'interrupteur
    const deviceId = devices.switch;
    console.log(`Tentative de récupération des données de consommation pour l'appareil: ${deviceId}`);
    
    const data = await getRealTimeConsumption(deviceId);
    
    if (data) {
      console.log(`Données récupérées avec succès: power=${data.power}W, energy=${data.energy}kWh`);
      
      // Calculer le coût sur la base de la consommation
      const cost = data.energy * RATE_KWH_TO_FCFA;
      
      res.json({
        success: true,
        timestamp: Date.now(),
        power: {
          value: data.power,
          unit: "W"
        },
        energy: {
          value: data.energy,
          unit: "kWh"
        },
        cost: {
          value: cost,
          unit: "FCFA"
        },
        rateApplied: RATE_KWH_TO_FCFA
      });
    } else {
      console.log(`Aucune donnée de consommation disponible pour l'appareil ${deviceId}`);
      res.status(404).json({
        success: false,
        message: "Données de consommation non disponibles pour cet appareil"
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error(`Erreur lors de la récupération des données de consommation: ${errorMessage}`);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      errorDetails: errorMessage
    });
  }
});

// Ajouter cette route pour déboguer les données brutes
app.get("/api/debug/device-status", async (req: Request, res: Response) => {
  try {
    const deviceId = devices.switch;
    
    // Récupérer les données brutes du périphérique
    const response = await context.request({
      path: `/v1.0/iot-03/devices/${deviceId}/status`,
      method: "GET",
    });
    
    // Renvoyer la réponse brute pour inspection
    res.json({
      success: true,
      deviceId,
      rawData: response
    });
  } catch (error) {
    console.error("Erreur lors du débogage des données d'appareil:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Route pour récupérer l'historique de consommation
app.get("/api/energy/history", (req: Request, res: Response) => {
  try {
    const period = req.query.period || "daily"; // daily, weekly, monthly
    const history = loadEnergyHistory();
    
    // Sélectionner les données en fonction de la période
    let data;
    switch (period) {
      case "daily":
        data = history.daily;
        break;
      case "weekly":
        data = history.weekly;
        break;
      case "monthly":
        data = history.monthly;
        break;
      default:
        data = history.daily;
    }
    
    res.json({
      success: true,
      period: period,
      lastUpdated: new Date(history.lastUpdated).toISOString(),
      data: data
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur"
    });
  }
});

// Version corrigée avec typage explicite pour le paramètre error
app.post("/api/energy/record", (req: Request, res: Response) => {
  const consumption = req.body.consumption;
  recordEnergyConsumption(consumption);
  res.json({ success: true });
});

// ===== Socket.IO =====

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Nouveau client connecté: ${socket.id}`);
  
  // Envoyer les données initiales au client
  const sendInitialData = async () => {
    try {
      const sensorStatus = await getDeviceStatus(devices.sensor);
      const switchStatus = await getDeviceStatus(devices.switch);
      socket.emit('initialData', { sensorStatus, switchStatus, manualMode, onTime, offTime });
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi des données initiales:", error);
    }
  };
  
  sendInitialData();
  
  // Gestion de la déconnexion
  socket.on('disconnect', () => {
    console.log(`🔌 Client déconnecté: ${socket.id}`);
  });
});

// ===== Initialisation =====

// Planifier l'exécution du script tous les jours à 12h18
cron.schedule('39 15 * * *', () => {
  console.log('🕒 Démarrage de l\'enregistrement quotidien de la consommation à 12h18...');
  
  // Obtenir le chemin absolu du script
  const scriptPath = path.join(__dirname, 'consommation-recorder.js');
  console.log(`📝 Chemin du script: ${scriptPath}`);
  
  // Exécuter le script d'enregistrement avec typage explicite et chemin absolu
  exec(`node "${scriptPath}"`, (error: Error | null, stdout: string, stderr: string) => {
    if (error) {
      console.error(`❌ Erreur d'exécution: ${error}`);
      return;
    }
    console.log(`✅ Sortie du script: ${stdout}`);
    if (stderr) console.error(`⚠️ Erreurs du script: ${stderr}`);
    
    // Vérifier si le fichier consommation.json a été mis à jour
    const consumptionFilePath = path.join(__dirname, 'consommation.json');
    if (fs.existsSync(consumptionFilePath)) {
      const stats = fs.statSync(consumptionFilePath);
      console.log(`📊 Fichier de consommation dernière modification: ${stats.mtime}`);
    } else {
      console.error('❌ Le fichier de consommation n\'existe pas après l\'exécution');
    }
  });
});

// Charger la configuration et initialiser l'historique
loadConfig();

// Planifier les tâches périodiques
setInterval(checkAndControlSwitch, 60000); // Vérifier toutes les 60 secondes
setInterval(monitorDevices, 60000); // Vérifier tous les 2 minutes
scheduleEnergyRecording(); // Activer l'enregistrement automatique de la consommation

// Page de connexion
app.get("/login", (req: Request, res: Response) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

// Redirection vers la page de login si l'utilisateur accède à la racine
app.get("/", (req: Request, res: Response) => {
  res.redirect("/login");
});

// Servir le fichier index.html seulement si explicitement demandé
app.get("/index.html", (req: Request, res: Response) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Route pour la page de tableau de bord
app.get("/dashboard", (req: Request, res: Response) => {
  res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
});

// Configuration des dossiers pour les ressources statiques
app.use("/js", express.static(path.join(PUBLIC_DIR, "js")));
app.use("/css", express.static(path.join(PUBLIC_DIR, "css")));
app.use("/img", express.static(path.join(PUBLIC_DIR, "img")));

// Route pour activer/désactiver le mode automatique
// Corriger en utilisant une fonction nommée
// 1. Définissez les fonctions avec le type 'any' pour le gestionnaire de route
const handleAutoModePost: any = (req: any, res: any) => {
  const { enabled } = req.body; 
   
  if (enabled === undefined) { 
    return res.status(400).json({  
      success: false,  
      message: "Le paramètre 'enabled' est requis (true/false)"  
    }); 
  } 
   
  autoModeEnabled = !!enabled; // Convertir en booléen 
   
  console.log(`${autoModeEnabled ? '✅' : '🚫'} Mode automatique ${autoModeEnabled ? 'activé' : 'désactivé'}`); 
   
  // Émettre un événement Socket.IO pour informer les clients 
  io.emit('autoModeUpdate', { autoModeEnabled }); 
   
  return res.json({  
    success: true,  
    message: `Mode automatique ${autoModeEnabled ? 'activé' : 'désactivé'}`, 
    autoModeEnabled 
  }); 
};

// Route POST
app.post("/api/auto-mode", handleAutoModePost);

// 2. Même chose pour la route GET
const handleAutoModeGet: any = (req: any, res: any) => {
  return res.json({ 
    success: true, 
    autoModeEnabled 
  });
};

// Route GET
app.get("/api/auto-mode", handleAutoModeGet);



// Démarrer le serveur
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
server.listen({
  port: PORT,
  host: HOST
}, () => {
  console.log(`🚀 Serveur démarré sur ${HOST}:${PORT}`);
  
  // Afficher les adresses IP disponibles pour faciliter la connexion
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  console.log("Adresses IP disponibles pour se connecter:");
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Ignorer les adresses non IPv4 et les interfaces loopback
      if (net.family === "IPv4" && !net.internal) {
        console.log(`- http://${net.address}:${PORT}`);
      }
    }
  }
});

