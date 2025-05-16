"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var fs = require("fs");
var tuya_connector_nodejs_1 = require("@tuya/tuya-connector-nodejs");
var http = require("http");
var socket_io_1 = require("socket.io");
var path = require("path");
var AUTH_FILE_PATH = "./login.json";
// Ajout des dépendances pour le cron job
var cron = require('node-cron');
var exec = require('child_process').exec;
// Fonction pour charger les utilisateurs depuis le fichier JSON
function loadUsers() {
    try {
        if (fs.existsSync(AUTH_FILE_PATH)) {
            var data = fs.readFileSync(AUTH_FILE_PATH, 'utf8');
            return JSON.parse(data);
        }
        else {
            console.log("⚙️ Le fichier d'authentification n'existe pas");
            // Créer un fichier avec un utilisateur admin par défaut
            var defaultUsers = {
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
    }
    catch (error) {
        console.error("❌ Erreur lors du chargement des utilisateurs:", error);
        return { users: [] };
    }
}
// Fonction pour sauvegarder les utilisateurs dans le fichier JSON
function saveUsers(usersData) {
    try {
        fs.writeFileSync(AUTH_FILE_PATH, JSON.stringify(usersData, null, 2));
        console.log("👤 Données utilisateurs sauvegardées");
    }
    catch (error) {
        console.error("❌ Erreur lors de la sauvegarde des utilisateurs:", error);
    }
}
// Configuration du chemin des fichiers
var FILE_PATH = "./time-config.json";
var HISTORY_PATH = "./consumption-history.json";
var PUBLIC_DIR = path.join(__dirname, "public");
var ENERGY_HISTORY_PATH = "./energy-history.json";
var CONSUMPTION_FILE_PATH = './consommation.json';
// Taux de conversion kWh vers FCFA
var RATE_KWH_TO_FCFA = 129; // À ajuster selon vos tarifs locaux
// Création de l'application Express
var app = express();
app.use(express.static(PUBLIC_DIR));
app.use(express.json());
// Middleware CORS
var cors = require("cors");
// Configuration CORS correcte pour permettre les connexions depuis différentes origines
app.use(cors({
    origin: "*", // Permet l'accès depuis n'importe quelle origine
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
// Création du serveur HTTP et Socket.IO
var server = http.createServer(app);
var io = new socket_io_1.Server(server, { cors: { origin: "*" } });
// Configuration de l'API Tuya
var context = new tuya_connector_nodejs_1.TuyaContext({
    baseUrl: "https://openapi.tuyaeu.com",
    accessKey: process.env.TUYA_ACCESS_KEY || "x9hsfcyu48scyfjynmts",
    secretKey: process.env.TUYA_SECRET_KEY || "bb68d26a5c51478e8bc4d90e9f18a9c5",
});
// Liste des appareils connectés
var devices = {
    sensor: process.env.TUYA_SENSOR_ID || "bf00a36b3f5181fb62tkdn",
    switch: process.env.TUYA_SWITCH_ID || "bfe2d31f064304b138eqcs",
};
// État global de l'application
var manualMode = false;
var forcedOff = false;
var offTime = "23:00"; // Heure à laquelle le switch s'éteint automatiquement
var onTime = "06:00"; // Heure à laquelle le switch s'allume et reprend le capteur
// Ajouter cette variable avec les autres variables d'état
var autoModeEnabled = true; // Par défaut, le mode automatique est activé /api/auto-mode
//USER
// Route d'authentification
app.post("/api/auth/login", function (req, res) {
    console.log("🔍 Tentative de connexion:", {
        body: req.body,
        headers: req.headers,
        ip: req.ip
    });
    var _a = req.body, username = _a.username, password = _a.password;
    if (!username || !password) {
        res.status(400).json({
            success: false,
            message: "Nom d'utilisateur et mot de passe requis"
        });
        return; // Utilisez return seul pour sortir prématurément
    }
    var usersData = loadUsers();
    var user = usersData.users.find(function (u) { return u.username === username && u.password === password; });
    if (user) {
        // Mettre à jour la dernière connexion
        user.lastLogin = new Date().toISOString();
        saveUsers(usersData);
        // Retourner les informations utilisateur (sans le mot de passe)
        var password_1 = user.password, userInfo = __rest(user, ["password"]);
        res.json({
            success: true,
            message: "Authentification réussie",
            user: userInfo
        });
    }
    else {
        res.status(401).json({
            success: false,
            message: "Nom d'utilisateur ou mot de passe incorrect"
        });
    }
});
// Route pour récupérer les informations de l'utilisateur
app.get("/api/users/:username", function (req, res) {
    var username = req.params.username;
    var usersData = loadUsers();
    var user = usersData.users.find(function (u) { return u.username === username; });
    if (user) {
        // Ne pas renvoyer le mot de passe
        var password = user.password, userInfo = __rest(user, ["password"]);
        res.json({
            success: true,
            user: userInfo
        });
    }
    else {
        res.status(404).json({
            success: false,
            message: "Utilisateur non trouvé"
        });
    }
});
// Route pour mettre à jour les informations de l'utilisateur
app.put("/api/users/:username", function (req, res) {
    var username = req.params.username;
    var updatedUserInfo = req.body;
    // Charger les utilisateurs
    var usersData = loadUsers();
    var userIndex = usersData.users.findIndex(function (u) { return u.username === username; });
    if (userIndex === -1) {
        res.status(404).json({
            success: false,
            message: "Utilisateur non trouvé"
        });
        return;
    }
    // Mettre à jour les informations (sauf l'ID et le rôle)
    var currentUser = usersData.users[userIndex];
    var newUserData = __assign(__assign(__assign({}, currentUser), updatedUserInfo), { id: currentUser.id, role: currentUser.role, username: username // Conserver le nom d'utilisateur original
     });
    // Sauvegarder les changements
    usersData.users[userIndex] = newUserData;
    saveUsers(usersData);
    // Retourner les données mises à jour (sans le mot de passe)
    var password = newUserData.password, userInfo = __rest(newUserData, ["password"]);
    res.json({
        success: true,
        message: "Profil mis à jour avec succès",
        user: userInfo
    });
});
//RECUPPERATION DE LA CONSOMMATION 
// Route pour récupérer les données de consommation historiques
app.get("/api/energy/consumption", function (req, res) {
    try {
        if (fs.existsSync(CONSUMPTION_FILE_PATH)) {
            var data = fs.readFileSync(CONSUMPTION_FILE_PATH, 'utf8');
            var consumptionData = JSON.parse(data);
            res.json({
                success: true,
                data: consumptionData
            });
        }
        else {
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
    }
    catch (error) {
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
            var data = fs.readFileSync(FILE_PATH, 'utf8');
            var config = JSON.parse(data);
            if (config.onTime)
                onTime = config.onTime;
            if (config.offTime)
                offTime = config.offTime;
            console.log("\u2699\uFE0F Configuration charg\u00E9e: ON \u00E0 ".concat(onTime, ", OFF \u00E0 ").concat(offTime));
        }
        else {
            // Créer le fichier avec les valeurs par défaut
            console.log("⚙️ Le fichier de configuration n'existe pas, création avec valeurs par défaut...");
            fs.writeFileSync(FILE_PATH, JSON.stringify({ onTime: onTime, offTime: offTime }, null, 2));
        }
    }
    catch (error) {
        console.error("❌ Erreur lors du chargement de la configuration:", error);
    }
}
// Fonction pour récupérer la consommation d'énergie en temps réel
// Fonction pour récupérer la consommation d'énergie en temps réel avec correction des unités
function getRealTimeConsumption(deviceId) {
    return __awaiter(this, void 0, void 0, function () {
        var response, powerData, energyData, power, energy, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.request({
                            path: "/v1.0/iot-03/devices/".concat(deviceId, "/status"),
                            method: "GET",
                        })];
                case 1:
                    response = _a.sent();
                    console.log("Réponse de l'API Tuya pour la consommation:", JSON.stringify(response, null, 2));
                    if (!Array.isArray(response.result)) {
                        console.error("Format de réponse inattendu:", response);
                        return [2 /*return*/, null];
                    }
                    // Journaliser tous les codes disponibles pour comprendre la structure
                    console.log("Codes disponibles:", response.result.map(function (item) { return "".concat(item.code, ": ").concat(item.value); }).join(", "));
                    powerData = response.result.find(function (item) { return item.code === "cur_power"; });
                    energyData = response.result.find(function (item) { return item.code === "add_ele"; });
                    if (!powerData && !energyData) {
                        console.log("Aucune donnée de consommation trouvée");
                        return [2 /*return*/, null];
                    }
                    power = powerData ? Number(powerData.value) / 1000 : 0;
                    energy = energyData ? Number(energyData.value) : 0;
                    return [2 /*return*/, {
                            power: power, // Puissance en watts
                            energy: energy // Énergie en kWh
                        }];
                case 2:
                    error_1 = _a.sent();
                    console.error("Erreur lors de la récupération des données en temps réel:", error_1);
                    console.error("Détails de l'erreur:", error_1 instanceof Error ? error_1.message : error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Fonction pour charger l'historique de consommation stocké
function loadEnergyHistory() {
    try {
        if (fs.existsSync(ENERGY_HISTORY_PATH)) {
            var data = fs.readFileSync(ENERGY_HISTORY_PATH, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (error) {
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
function saveEnergyHistory(history) {
    try {
        fs.writeFileSync(ENERGY_HISTORY_PATH, JSON.stringify(history, null, 2));
        console.log("📊 Historique de consommation d'énergie sauvegardé");
    }
    catch (error) {
        console.error("❌ Erreur lors de la sauvegarde de l'historique d'énergie:", error);
    }
}
// Fonction pour enregistrer une nouvelle consommation d'énergie
function recordEnergyConsumption(consumption) {
    var now = new Date();
    var timestamp = now.getTime();
    var formattedDate = "".concat(now.getDate().toString().padStart(2, '0'), "/").concat((now.getMonth() + 1).toString().padStart(2, '0'), "/").concat(now.getFullYear());
    var cost = consumption * RATE_KWH_TO_FCFA;
    var newEntry = {
        timestamp: timestamp,
        date: formattedDate,
        consumption: consumption,
        cost: cost
    };
    // Charger l'historique existant
    var history = loadEnergyHistory();
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
function updateWeeklyAndMonthlyHistory(history) {
    var now = new Date();
    // Obtenir le début de la semaine et du mois actuels
    var startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Dimanche = 0, Lundi = 1, etc.
    startOfWeek.setHours(0, 0, 0, 0);
    var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Filtrer les entrées quotidiennes de la semaine actuelle
    var entriesThisWeek = history.daily.filter(function (entry) {
        return entry.timestamp >= startOfWeek.getTime();
    });
    // Filtrer les entrées quotidiennes du mois actuel
    var entriesThisMonth = history.daily.filter(function (entry) {
        return entry.timestamp >= startOfMonth.getTime();
    });
    // Si nous avons des entrées pour cette semaine
    if (entriesThisWeek.length > 0) {
        // Calculer la consommation totale de la semaine
        var totalConsumption = entriesThisWeek.reduce(function (sum, entry) { return sum + entry.consumption; }, 0);
        var totalCost = entriesThisWeek.reduce(function (sum, entry) { return sum + entry.cost; }, 0);
        // Vérifier si nous avons déjà une entrée pour cette semaine
        var existingWeekEntry = history.weekly.find(function (entry) {
            var entryDate = new Date(entry.timestamp);
            var entryStartOfWeek = new Date(entryDate);
            entryStartOfWeek.setDate(entryDate.getDate() - entryDate.getDay());
            entryStartOfWeek.setHours(0, 0, 0, 0);
            return entryStartOfWeek.getTime() === startOfWeek.getTime();
        });
        if (existingWeekEntry) {
            // Mettre à jour l'entrée existante
            existingWeekEntry.consumption = totalConsumption;
            existingWeekEntry.cost = totalCost;
        }
        else {
            // Créer une nouvelle entrée pour cette semaine
            history.weekly.push({
                timestamp: startOfWeek.getTime(),
                date: "Sem ".concat(getWeekNumber(now)),
                consumption: totalConsumption,
                cost: totalCost
            });
        }
    }
    // Si nous avons des entrées pour ce mois
    if (entriesThisMonth.length > 0) {
        // Calculer la consommation totale du mois
        var totalConsumption = entriesThisMonth.reduce(function (sum, entry) { return sum + entry.consumption; }, 0);
        var totalCost = entriesThisMonth.reduce(function (sum, entry) { return sum + entry.cost; }, 0);
        // Vérifier si nous avons déjà une entrée pour ce mois
        var existingMonthEntry = history.monthly.find(function (entry) {
            var entryDate = new Date(entry.timestamp);
            return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
        });
        if (existingMonthEntry) {
            // Mettre à jour l'entrée existante
            existingMonthEntry.consumption = totalConsumption;
            existingMonthEntry.cost = totalCost;
        }
        else {
            // Créer une nouvelle entrée pour ce mois
            var monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
            history.monthly.push({
                timestamp: startOfMonth.getTime(),
                date: "".concat(monthNames[now.getMonth()], " ").concat(now.getFullYear()),
                consumption: totalConsumption,
                cost: totalCost
            });
        }
    }
}
// Fonction utilitaire pour obtenir le numéro de la semaine dans l'année
function getWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
// Récupérer l'état du périphérique
function getDeviceStatus(device_id) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.request({
                            path: "/v1.0/iot-03/devices/".concat(device_id, "/status"),
                            method: "GET",
                        })];
                case 1:
                    response = _a.sent();
                    console.log("\uD83D\uDCF1 Statut du device ".concat(device_id, ":"), response.result);
                    return [2 /*return*/, Array.isArray(response.result) ? response.result : []];
                case 2:
                    error_2 = _a.sent();
                    console.error("\u274C Erreur r\u00E9cup\u00E9ration statut ".concat(device_id, ":"), error_2);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Mettre à jour l'état du périphérique
function setDeviceStatus(device_id, code, value) {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.request({
                            path: "/v1.0/iot-03/devices/".concat(device_id, "/commands"),
                            method: "POST",
                            body: { commands: [{ code: code, value: value }] },
                        })];
                case 1:
                    _a.sent();
                    console.log("\uD83D\uDCA1 \u00C9tat de ".concat(code, " mis \u00E0 jour sur ").concat(device_id, ": ").concat(value));
                    // Émettre un événement via Socket.IO pour informer les clients connectés
                    io.emit('deviceUpdate', { device: device_id, code: code, value: value });
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error("\u274C Erreur mise \u00E0 jour ".concat(code, " pour ").concat(device_id, ":"), error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Lire l'heure actuelle
function getCurrentTime() {
    var currentTime = new Date();
    return currentTime.getHours() * 60 + currentTime.getMinutes(); // Convertir l'heure et les minutes en minutes totales
}
// Lire les données du fichier JSON
function getConfigFromFile() {
    try {
        var data = fs.readFileSync(FILE_PATH, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error("❌ Erreur lors de la lecture du fichier de configuration:", error);
        return { onTime: onTime, offTime: offTime };
    }
}
// Mettre à jour le fichier JSON
function updateConfigToFile(config) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(config, null, 2));
        console.log("⚙️ Configuration mise à jour et enregistrée");
    }
    catch (error) {
        console.error("❌ Erreur lors de la mise à jour du fichier de configuration:", error);
    }
}
// Fonction de contrôle du switch basé sur l'heure
function checkAndControlSwitch() {
    return __awaiter(this, void 0, void 0, function () {
        var config, onTime_1, offTime_1, currentTimeInMinutes, _a, onHour, onMinute, onTimeInMinutes, _b, offHour, offMinute, offTimeInMinutes, switchStatus, currentSwitchState, error_4;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 6, , 7]);
                    config = getConfigFromFile();
                    onTime_1 = config.onTime, offTime_1 = config.offTime;
                    currentTimeInMinutes = getCurrentTime();
                    _a = onTime_1.split(":").map(Number), onHour = _a[0], onMinute = _a[1];
                    onTimeInMinutes = onHour * 60 + onMinute;
                    _b = offTime_1.split(":").map(Number), offHour = _b[0], offMinute = _b[1];
                    offTimeInMinutes = offHour * 60 + offMinute;
                    return [4 /*yield*/, getDeviceStatus(devices.switch)];
                case 1:
                    switchStatus = _d.sent();
                    currentSwitchState = (_c = switchStatus.find(function (item) { return item.code === "switch"; })) === null || _c === void 0 ? void 0 : _c.value;
                    if (!(currentTimeInMinutes >= onTimeInMinutes && currentSwitchState === false && !manualMode)) return [3 /*break*/, 3];
                    console.log("\uD83D\uDD52 L'heure d'allumage (".concat(onTime_1, ") est arriv\u00E9e. Le switch va \u00EAtre allum\u00E9."));
                    return [4 /*yield*/, setDeviceStatus(devices.switch, "switch", true)];
                case 2:
                    _d.sent();
                    manualMode = false; // Désactiver le mode manuel
                    _d.label = 3;
                case 3:
                    if (!(currentTimeInMinutes >= offTimeInMinutes && currentSwitchState === true)) return [3 /*break*/, 5];
                    console.log("\uD83D\uDD52 L'heure d'arr\u00EAt (".concat(offTime_1, ") est arriv\u00E9e. Le switch va \u00EAtre \u00E9teint."));
                    return [4 /*yield*/, setDeviceStatus(devices.switch, "switch", false)];
                case 4:
                    _d.sent();
                    manualMode = true; // Activer le mode manuel
                    _d.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_4 = _d.sent();
                    console.error("❌ Erreur lors du contrôle programmé du switch:", error_4);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Fonction pour surveiller les appareils
function monitorDevices() {
    return __awaiter(this, void 0, void 0, function () {
        var sensorStatus, switchStatus, presence, switchState, newSwitchValue, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Si le mode automatique est désactivé, ne pas exécuter la logique basée sur le capteur
                    if (!autoModeEnabled) {
                        console.log("🚫 Mode automatique désactivé, le capteur ne contrôle pas l'interrupteur");
                        return [2 /*return*/];
                    }
                    if (manualMode) {
                        console.log("🛑 Mode manuel actif, le capteur ne contrôle plus l'interrupteur.");
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, getDeviceStatus(devices.sensor)];
                case 2:
                    sensorStatus = _a.sent();
                    return [4 /*yield*/, getDeviceStatus(devices.switch)];
                case 3:
                    switchStatus = _a.sent();
                    if (!(sensorStatus.length > 0)) return [3 /*break*/, 5];
                    presence = sensorStatus.find(function (item) { return item.code === "presence_state"; });
                    if (!presence) return [3 /*break*/, 5];
                    switchState = switchStatus.find(function (item) { return item.code === "switch"; });
                    newSwitchValue = presence.value === "none" ? false : true;
                    if (!(switchState && switchState.value !== newSwitchValue)) return [3 /*break*/, 5];
                    console.log("\uD83D\uDC40 Pr\u00E9sence d\u00E9tect\u00E9e (".concat(presence.value, "), mise \u00E0 jour de l'interrupteur..."));
                    return [4 /*yield*/, setDeviceStatus(devices.switch, "switch", newSwitchValue)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_5 = _a.sent();
                    console.error("❌ Erreur lors de la surveillance des appareils:", error_5);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Tâche planifiée pour enregistrer périodiquement la consommation
var scheduleEnergyRecording = function () {
    // Enregistrer la consommation toutes les heures
    setInterval(function () { return __awaiter(void 0, void 0, void 0, function () {
        var deviceId, data, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    deviceId = devices.switch;
                    return [4 /*yield*/, getRealTimeConsumption(deviceId)];
                case 1:
                    data = _a.sent();
                    if (data && data.energy > 0) {
                        console.log("\uD83D\uDCCA Enregistrement automatique de la consommation: ".concat(data.energy, " kWh"));
                        recordEnergyConsumption(data.energy);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_6 = _a.sent();
                    console.error("Erreur lors de l'enregistrement automatique de la consommation:", error_6);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, 3600000); // 1 heure en millisecondes
};
// ===== Routes API =====
// Route pour obtenir les horaires actuels
app.get("/get-time", function (req, res) {
    res.json({ onTime: onTime, offTime: offTime });
});
// Recevoir et mettre à jour les heures ON et OFF
app.post("/update-time", function (req, res) {
    var _a = req.body, newOnTime = _a.onTime, newOffTime = _a.offTime;
    if (newOnTime)
        onTime = newOnTime;
    if (newOffTime)
        offTime = newOffTime;
    console.log("\u23F0 Heure ON mise \u00E0: ".concat(onTime));
    console.log("\u23F0 Heure OFF mise \u00E0: ".concat(offTime));
    var timeConfig = { onTime: onTime, offTime: offTime };
    updateConfigToFile(timeConfig);
    res.json({ message: "Heures mises à jour avec succès" });
});
// Obtenir l'état des appareils
app.get("/status", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sensorStatus, switchStatus, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getDeviceStatus(devices.sensor)];
            case 1:
                sensorStatus = _a.sent();
                return [4 /*yield*/, getDeviceStatus(devices.switch)];
            case 2:
                switchStatus = _a.sent();
                console.log("📤 Données envoyées:", { sensorStatus: sensorStatus, switchStatus: switchStatus });
                res.json({ sensorStatus: sensorStatus, switchStatus: switchStatus, manualMode: manualMode });
                return [3 /*break*/, 4];
            case 3:
                error_7 = _a.sent();
                console.error("❌ Erreur dans /status:", error_7);
                res.status(500).json({ error: "Erreur interne du serveur" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Contrôle manuel des interrupteurs
app.post("/switch/:state", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var state, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                state = req.params.state === "on";
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, setDeviceStatus(devices.switch, "switch", state)];
            case 2:
                _a.sent();
                if (!state) {
                    manualMode = true; // Activer le mode manuel lors de l'extinction
                    console.log("🔒 Mode manuel activé");
                }
                else {
                    manualMode = false; // Désactiver le mode manuel lorsqu'on allume
                    console.log("🔓 Mode manuel désactivé");
                }
                res.json({ message: "Interrupteur mis \u00E0 ".concat(state ? "ON" : "OFF") });
                return [3 /*break*/, 4];
            case 3:
                error_8 = _a.sent();
                console.error("\u274C Erreur lors du contr\u00F4le de l'interrupteur (".concat(state ? "ON" : "OFF", "):"), error_8);
                res.status(500).json({ error: "Erreur lors du contrôle de l'interrupteur" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Obtenir l'historique de consommation (suite)
app.get("/consumption-history", function (req, res) {
    try {
        if (fs.existsSync(HISTORY_PATH)) {
            var data = fs.readFileSync(HISTORY_PATH, 'utf8');
            var consumptionData = JSON.parse(data);
            res.json(consumptionData);
        }
        else {
            res.status(404).json({ error: "Données d'historique non disponibles" });
        }
    }
    catch (error) {
        console.error("❌ Erreur lors de la récupération de l'historique:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});
// Route pour récupérer la consommation en temps réel avec unités ajustées
app.get("/api/energy/realtime", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var deviceId, data, cost, error_9, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                deviceId = devices.switch;
                console.log("Tentative de r\u00E9cup\u00E9ration des donn\u00E9es de consommation pour l'appareil: ".concat(deviceId));
                return [4 /*yield*/, getRealTimeConsumption(deviceId)];
            case 1:
                data = _a.sent();
                if (data) {
                    console.log("Donn\u00E9es r\u00E9cup\u00E9r\u00E9es avec succ\u00E8s: power=".concat(data.power, "W, energy=").concat(data.energy, "kWh"));
                    cost = data.energy * RATE_KWH_TO_FCFA;
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
                }
                else {
                    console.log("Aucune donn\u00E9e de consommation disponible pour l'appareil ".concat(deviceId));
                    res.status(404).json({
                        success: false,
                        message: "Données de consommation non disponibles pour cet appareil"
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                errorMessage = error_9 instanceof Error ? error_9.message : "Erreur inconnue";
                console.error("Erreur lors de la r\u00E9cup\u00E9ration des donn\u00E9es de consommation: ".concat(errorMessage));
                res.status(500).json({
                    success: false,
                    message: "Erreur interne du serveur",
                    errorDetails: errorMessage
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Ajouter cette route pour déboguer les données brutes
app.get("/api/debug/device-status", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var deviceId, response, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                deviceId = devices.switch;
                return [4 /*yield*/, context.request({
                        path: "/v1.0/iot-03/devices/".concat(deviceId, "/status"),
                        method: "GET",
                    })];
            case 1:
                response = _a.sent();
                // Renvoyer la réponse brute pour inspection
                res.json({
                    success: true,
                    deviceId: deviceId,
                    rawData: response
                });
                return [3 /*break*/, 3];
            case 2:
                error_10 = _a.sent();
                console.error("Erreur lors du débogage des données d'appareil:", error_10);
                res.status(500).json({
                    success: false,
                    message: "Erreur interne du serveur",
                    error: error_10 instanceof Error ? error_10.message : "Erreur inconnue"
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Route pour récupérer l'historique de consommation
app.get("/api/energy/history", function (req, res) {
    try {
        var period = req.query.period || "daily"; // daily, weekly, monthly
        var history_1 = loadEnergyHistory();
        // Sélectionner les données en fonction de la période
        var data = void 0;
        switch (period) {
            case "daily":
                data = history_1.daily;
                break;
            case "weekly":
                data = history_1.weekly;
                break;
            case "monthly":
                data = history_1.monthly;
                break;
            default:
                data = history_1.daily;
        }
        res.json({
            success: true,
            period: period,
            lastUpdated: new Date(history_1.lastUpdated).toISOString(),
            data: data
        });
    }
    catch (error) {
        console.error("Erreur lors de la récupération de l'historique:", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur"
        });
    }
});
// Version corrigée avec typage explicite pour le paramètre error
app.post("/api/energy/record", function (req, res) {
    var consumption = req.body.consumption;
    recordEnergyConsumption(consumption);
    res.json({ success: true });
});
// ===== Socket.IO =====
// Gestion des connexions Socket.IO
io.on('connection', function (socket) {
    console.log("\uD83D\uDD0C Nouveau client connect\u00E9: ".concat(socket.id));
    // Envoyer les données initiales au client
    var sendInitialData = function () { return __awaiter(void 0, void 0, void 0, function () {
        var sensorStatus, switchStatus, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, getDeviceStatus(devices.sensor)];
                case 1:
                    sensorStatus = _a.sent();
                    return [4 /*yield*/, getDeviceStatus(devices.switch)];
                case 2:
                    switchStatus = _a.sent();
                    socket.emit('initialData', { sensorStatus: sensorStatus, switchStatus: switchStatus, manualMode: manualMode, onTime: onTime, offTime: offTime });
                    return [3 /*break*/, 4];
                case 3:
                    error_11 = _a.sent();
                    console.error("❌ Erreur lors de l'envoi des données initiales:", error_11);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    sendInitialData();
    // Gestion de la déconnexion
    socket.on('disconnect', function () {
        console.log("\uD83D\uDD0C Client d\u00E9connect\u00E9: ".concat(socket.id));
    });
});
// ===== Initialisation =====
// Planifier l'exécution du script tous les jours à 12h18
cron.schedule('39 15 * * *', function () {
    console.log('🕒 Démarrage de l\'enregistrement quotidien de la consommation à 12h18...');
    // Obtenir le chemin absolu du script
    var scriptPath = path.join(__dirname, 'consommation-recorder.js');
    console.log("\uD83D\uDCDD Chemin du script: ".concat(scriptPath));
    // Exécuter le script d'enregistrement avec typage explicite et chemin absolu
    exec("node \"".concat(scriptPath, "\""), function (error, stdout, stderr) {
        if (error) {
            console.error("\u274C Erreur d'ex\u00E9cution: ".concat(error));
            return;
        }
        console.log("\u2705 Sortie du script: ".concat(stdout));
        if (stderr)
            console.error("\u26A0\uFE0F Erreurs du script: ".concat(stderr));
        // Vérifier si le fichier consommation.json a été mis à jour
        var consumptionFilePath = path.join(__dirname, 'consommation.json');
        if (fs.existsSync(consumptionFilePath)) {
            var stats = fs.statSync(consumptionFilePath);
            console.log("\uD83D\uDCCA Fichier de consommation derni\u00E8re modification: ".concat(stats.mtime));
        }
        else {
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
app.get("/login", function (req, res) {
    res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});
// Redirection vers la page de login si l'utilisateur accède à la racine
app.get("/", function (req, res) {
    res.redirect("/login");
});
// Servir le fichier index.html seulement si explicitement demandé
app.get("/index.html", function (req, res) {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});
// Route pour la page de tableau de bord
app.get("/dashboard", function (req, res) {
    res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
});
// Configuration des dossiers pour les ressources statiques
app.use("/js", express.static(path.join(PUBLIC_DIR, "js")));
app.use("/css", express.static(path.join(PUBLIC_DIR, "css")));
app.use("/img", express.static(path.join(PUBLIC_DIR, "img")));
// Route pour activer/désactiver le mode automatique
// Corriger en utilisant une fonction nommée
// 1. Définissez les fonctions avec le type 'any' pour le gestionnaire de route
var handleAutoModePost = function (req, res) {
    var enabled = req.body.enabled;
    if (enabled === undefined) {
        return res.status(400).json({
            success: false,
            message: "Le paramètre 'enabled' est requis (true/false)"
        });
    }
    autoModeEnabled = !!enabled; // Convertir en booléen 
    console.log("".concat(autoModeEnabled ? '✅' : '🚫', " Mode automatique ").concat(autoModeEnabled ? 'activé' : 'désactivé'));
    // Émettre un événement Socket.IO pour informer les clients 
    io.emit('autoModeUpdate', { autoModeEnabled: autoModeEnabled });
    return res.json({
        success: true,
        message: "Mode automatique ".concat(autoModeEnabled ? 'activé' : 'désactivé'),
        autoModeEnabled: autoModeEnabled
    });
};
// Route POST
app.post("/api/auto-mode", handleAutoModePost);
// 2. Même chose pour la route GET
var handleAutoModeGet = function (req, res) {
    return res.json({
        success: true,
        autoModeEnabled: autoModeEnabled
    });
};
// Route GET
app.get("/api/auto-mode", handleAutoModeGet);
// Démarrer le serveur
var PORT = process.env.PORT || 3001;
var HOST = '0.0.0.0';
// Créer un middleware pour rediriger HTTP vers HTTPS en production
if (process.env.NODE_ENV === 'production') {
    app.use(function (req, res, next) {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect("https://".concat(req.header('host')).concat(req.url));
        }
        else {
            next();
        }
    });
}
server.listen({
    port: PORT,
    host: HOST
}, function () {
    console.log("\uD83D\uDE80 Serveur d\u00E9marr\u00E9 sur ".concat(HOST, ":").concat(PORT));
    // Afficher les adresses IP disponibles pour faciliter la connexion
    var networkInterfaces = require("os").networkInterfaces;
    var nets = networkInterfaces();
    console.log("Adresses IP disponibles pour se connecter:");
    for (var _i = 0, _a = Object.keys(nets); _i < _a.length; _i++) {
        var name_1 = _a[_i];
        for (var _b = 0, _c = nets[name_1]; _b < _c.length; _b++) {
            var net = _c[_b];
            // Ignorer les adresses non IPv4 et les interfaces loopback
            if (net.family === "IPv4" && !net.internal) {
                console.log("- ".concat(process.env.NODE_ENV === 'production' ? 'https' : 'http', "://").concat(net.address, ":").concat(PORT));
            }
        }
    }
});
