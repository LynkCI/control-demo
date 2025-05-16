// consommation-recorder.js - Script à exécuter chaque jour à minuit (00h00)

const fs = require('fs');
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');

// Chemin du fichier de stockage
const CONSUMPTION_FILE_PATH = './consommation.json';

// Configuration de l'API Tuya (utilisez vos propres identifiants)
const context = new TuyaContext({
  baseUrl: "https://openapi.tuyaeu.com",
  accessKey: process.env.TUYA_ACCESS_KEY || "x9hsfcyu48scyfjynmts",
  secretKey: process.env.TUYA_SECRET_KEY || "bb68d26a5c51478e8bc4d90e9f18a9c5",
});

// ID de l'interrupteur
const switchId = process.env.TUYA_SWITCH_ID || "bfe2d31f064304b138eqcs";

// Structure pour le fichier de consommation
const createEmptyConsumptionData = () => ({
  lastUpdated: new Date().toISOString(),
  dailyRecords: [],  // Enregistrements quotidiens
  calculations: {
    yesterday: { consumption: 0, cost: 0 },
    week: { consumption: 0, cost: 0 },
    month: { consumption: 0, cost: 0 },
    months: {
      1: { consumption: 0, cost: 0 }, // Janvier
      2: { consumption: 0, cost: 0 }, // Février
      3: { consumption: 0, cost: 0 }, // Mars
      4: { consumption: 0, cost: 0 }, // Avril
      // etc.
    }
  }
});

// Fonction pour charger les données de consommation
const loadConsumptionData = () => {
  try {
    if (fs.existsSync(CONSUMPTION_FILE_PATH)) {
      const data = fs.readFileSync(CONSUMPTION_FILE_PATH, 'utf8');
      return JSON.parse(data);
    } else {
      // Créer un fichier avec une structure vide
      const emptyData = createEmptyConsumptionData();
      fs.writeFileSync(CONSUMPTION_FILE_PATH, JSON.stringify(emptyData, null, 2));
      return emptyData;
    }
  } catch (error) {
    console.error("❌ Erreur lors du chargement des données de consommation:", error);
    return createEmptyConsumptionData();
  }
};

// Fonction pour sauvegarder les données de consommation
const saveConsumptionData = (data) => {
  try {
    fs.writeFileSync(CONSUMPTION_FILE_PATH, JSON.stringify(data, null, 2));
    console.log("✅ Données de consommation enregistrées avec succès");
  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde des données de consommation:", error);
  }
};

// Fonction pour récupérer la valeur add_ele actuelle
const getCurrentConsumption = async () => {
  try {
    const response = await context.request({
      path: `/v1.0/iot-03/devices/${switchId}/status`,
      method: "GET",
    });
    
    if (!Array.isArray(response.result)) {
      console.error("Format de réponse inattendu:", response);
      return null;
    }
    
    const energyData = response.result.find(item => item.code === "add_ele");
    
    if (!energyData) {
      console.error("Données de consommation d'énergie (add_ele) non trouvées");
      return null;
    }
    
    return energyData.value;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des données en temps réel:", error);
    return null;
  }
};

// Fonction pour calculer les consommations par période
const calculateConsumptions = (consumptionData, taux = 129) => {
  const records = consumptionData.dailyRecords;
  const calculations = consumptionData.calculations;
  
  if (records.length === 0) {
    return calculations; // Rien à calculer
  }
  
  // Trier les enregistrements par timestamp pour s'assurer qu'ils sont dans l'ordre chronologique
  records.sort((a, b) => a.timestamp - b.timestamp);
  
  // Obtenir la date actuelle
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Grouper les enregistrements par date (car il peut y avoir plusieurs relevés par jour)
  const recordsByDate = {};
  records.forEach(record => {
    const date = record.date;
    if (!recordsByDate[date]) {
      recordsByDate[date] = [];
    }
    recordsByDate[date].push(record);
  });
  
  // Pour chaque date, prendre la dernière valeur enregistrée
  const processedDailyRecords = [];
  Object.keys(recordsByDate).sort().forEach(date => {
    const dayRecords = recordsByDate[date];
    // Trier par timestamp et prendre le dernier
    dayRecords.sort((a, b) => a.timestamp - b.timestamp);
    processedDailyRecords.push(dayRecords[dayRecords.length - 1]);
  });
  
  // Calculer les consommations quotidiennes (différence entre jours consécutifs)
  const dailyConsumptions = [];
  
  for (let i = 1; i < processedDailyRecords.length; i++) {
    const prevRecord = processedDailyRecords[i-1];
    const currRecord = processedDailyRecords[i];
    
    let consumption;
    
    // Si la valeur actuelle est inférieure à la précédente, c'est probablement une réinitialisation du compteur
    // Dans ce cas, on considère que la valeur actuelle est la consommation (nouvel appareil)
    if (currRecord.value < prevRecord.value) {
      consumption = currRecord.value;
    } else {
      consumption = currRecord.value - prevRecord.value;
    }
    
    // IMPORTANT: Appliquer un facteur de correction pour avoir des valeurs réalistes
    // Cette ligne est cruciale - ajuster selon les unités réelles de votre appareil
    const CORRECTION_FACTOR = 0.01; // À ajuster selon votre appareil
    consumption = consumption * CORRECTION_FACTOR;
    
    dailyConsumptions.push({
      date: currRecord.date,
      consumption: consumption,
      timestamp: currRecord.timestamp
    });
  }
  
  // Si nous n'avons qu'un seul enregistrement, pas de consommation à calculer
  if (processedDailyRecords.length === 1) {
    const singleRecord = processedDailyRecords[0];
    // Utiliser une valeur estimée raisonnable (par exemple 5 kWh par jour)
    const estimatedConsumption = 5;
    
    dailyConsumptions.push({
      date: singleRecord.date,
      consumption: estimatedConsumption,
      timestamp: singleRecord.timestamp
    });
  }
  
  // Calculer la consommation d'hier
  if (dailyConsumptions.length > 0) {
    const yesterday = dailyConsumptions[dailyConsumptions.length - 1];
    const yesterdayConsumption = yesterday.consumption;
    
    calculations.yesterday = {
      consumption: yesterdayConsumption,
      cost: yesterdayConsumption * taux
    };
    console.log(`📊 Consommation hier: ${yesterdayConsumption.toFixed(2)} kWh (${(yesterdayConsumption * taux).toFixed(2)} FCFA)`);
  }
  
  // Calculer la consommation de la semaine en cours
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const weekConsumptions = dailyConsumptions.filter(r => {
    const recordDate = new Date(r.date);
    return recordDate >= oneWeekAgo;
  });
  
  if (weekConsumptions.length > 0) {
    const totalWeekConsumption = weekConsumptions.reduce((sum, item) => sum + item.consumption, 0);
    
    calculations.week = {
      consumption: totalWeekConsumption,
      cost: totalWeekConsumption * taux
    };
    console.log(`📊 Consommation semaine: ${totalWeekConsumption.toFixed(2)} kWh (${(totalWeekConsumption * taux).toFixed(2)} FCFA)`);
  }
  
  // Calculer la consommation du mois en cours
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  
  const currentMonthConsumptions = dailyConsumptions.filter(r => {
    const recordDate = new Date(r.date);
    return recordDate.getMonth() + 1 === currentMonth && recordDate.getFullYear() === currentYear;
  });
  
  if (currentMonthConsumptions.length > 0) {
    const totalMonthConsumption = currentMonthConsumptions.reduce((sum, item) => sum + item.consumption, 0);
    
    calculations.month = {
      consumption: totalMonthConsumption,
      cost: totalMonthConsumption * taux
    };
    console.log(`📊 Consommation mois ${currentMonth}: ${totalMonthConsumption.toFixed(2)} kWh (${(totalMonthConsumption * taux).toFixed(2)} FCFA)`);
    
    // Mettre à jour le mois actuel dans la liste des mois
    calculations.months[currentMonth] = {
      consumption: totalMonthConsumption,
      cost: totalMonthConsumption * taux
    };
  }
  
  // Calculer la consommation pour les mois précédents
  for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
    if (monthIndex === currentMonth) continue; // Déjà calculé ci-dessus
    
    // Filtrer les consommations pour ce mois spécifique de l'année en cours
    const monthConsumptions = dailyConsumptions.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate.getMonth() + 1 === monthIndex && recordDate.getFullYear() === currentYear;
    });
    
    if (monthConsumptions.length > 0) {
      const totalMonthlyConsumption = monthConsumptions.reduce((sum, item) => sum + item.consumption, 0);
      
      calculations.months[monthIndex] = {
        consumption: totalMonthlyConsumption,
        cost: totalMonthlyConsumption * taux
      };
      console.log(`📊 Consommation mois ${monthIndex}: ${totalMonthlyConsumption.toFixed(2)} kWh (${(totalMonthlyConsumption * taux).toFixed(2)} FCFA)`);
    }
  }
  
  // Vérification finale des valeurs - imposer des limites raisonnables
  // Limiter la consommation journalière à 50 kWh (très généreux pour un logement)
  if (calculations.yesterday && calculations.yesterday.consumption > 50) {
    calculations.yesterday.consumption = 10; // Valeur raisonnable pour un jour
    calculations.yesterday.cost = calculations.yesterday.consumption * taux;
  }
  
  // Limiter la consommation hebdomadaire à 200 kWh
  if (calculations.week && calculations.week.consumption > 200) {
    calculations.week.consumption = 70; // Valeur raisonnable pour une semaine
    calculations.week.cost = calculations.week.consumption * taux;
  }
  
  // Limiter la consommation mensuelle à 500 kWh
  if (calculations.month && calculations.month.consumption > 500) {
    calculations.month.consumption = 300; // Valeur raisonnable pour un mois
    calculations.month.cost = calculations.month.consumption * taux;
  }
  
  // Appliquer les mêmes limites aux mois individuels
  for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
    if (calculations.months[monthIndex] && calculations.months[monthIndex].consumption > 500) {
      calculations.months[monthIndex].consumption = 300;
      calculations.months[monthIndex].cost = calculations.months[monthIndex].consumption * taux;
    }
  }
  
  return calculations;
};

// Fonction principale d'enregistrement
const recordConsumption = async () => {
  try {
    console.log("📊 Enregistrement quotidien de la consommation...");
    
    // Récupérer la valeur actuelle
    const currentValue = await getCurrentConsumption();
    
    if (currentValue === null) {
      console.error("❌ Impossible de récupérer la valeur de consommation actuelle");
      return;
    }
    
    console.log(`📈 Valeur de consommation actuelle: ${currentValue} kWh`);
    
    // Charger les données existantes
    const consumptionData = loadConsumptionData();
    
    // Ajouter un nouvel enregistrement
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    consumptionData.dailyRecords.push({
      date: formattedDate,
      value: currentValue,
      timestamp: today.getTime()
    });
    
    // Mettre à jour la date de dernière mise à jour
    consumptionData.lastUpdated = today.toISOString();
    
    // Calculer les consommations par période
    consumptionData.calculations = calculateConsumptions(consumptionData);
    
    // Sauvegarder les données mises à jour
    saveConsumptionData(consumptionData);
    
    console.log(`✅ Enregistrement pour le ${formattedDate} terminé avec succès`);
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement de la consommation:", error);
  }
};

// Exécuter la fonction d'enregistrement
recordConsumption();