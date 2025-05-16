document.addEventListener("DOMContentLoaded", () => {
    // --- ÉLÉMENTS DOM ---
    const currentConsumptionElem = document.getElementById("currentConsumption");
    const currentCostElem = document.getElementById("currentCost");
    const forecastCostElem = document.getElementById("forecastCost");
    const currentPeriodElem = document.getElementById("currentPeriod");
    const prevPeriodBtn = document.getElementById("prevPeriod");
    const nextPeriodBtn = document.getElementById("nextPeriod");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const historyTableBody = document.getElementById("historyData");
    
    // --- CONFIGURATION ---
    Chart.defaults.font.family = "'Segoe UI', 'Helvetica Neue', 'Arial', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(5, 67, 124, 0.8)";
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    
    // --- VARIABLES D'ÉTAT ---
    let currentPeriodType = "year"; // Définir "année" comme vue par défaut
    let currentOffset = 0;
    let consumptionChart = null;
    const RATE_KWH_TO_FCFA = 129;
    
    // --- URL DE L'API ---
    const getApiUrl = () => {
        const serverAddress = localStorage.getItem('serverAddress');
        if (serverAddress) {
            return `http://${serverAddress}`;
        }
        
        const isLocalhost = window.location.hostname === "localhost" || 
                            window.location.hostname === "127.0.0.1";
        
        const host = isLocalhost ? "localhost" : window.location.hostname;
        return `http://${host}:3001`;
    };
    
    let API_URL = getApiUrl();
    console.log("Connexion à l'API via:", API_URL);
    
    // --- STRUCTURES DE DONNÉES ---
    let realtimeConsumption = null;
    let energyHistory = {
        daily: [],
        weekly: [],
        monthly: []
    };
    
    let historyDataByPeriod = {
        week: [],
        month: [],
        year: []
    };
    
    // --- FONCTIONS DE RÉCUPÉRATION DE DONNÉES ---
    
    // Récupérer la consommation en temps réel
    async function fetchRealtimeConsumption() {
        try {
            console.log("Récupération des données en temps réel...");
            const response = await fetch(`${API_URL}/api/energy/realtime`);
            const data = await response.json();
            
            if (data.success) {
                console.log("Données en temps réel reçues:", data);
                realtimeConsumption = data;
                
                const now = new Date();
                const formattedDate = now.toLocaleDateString('fr-FR');
                
                const energy = data.energy?.value !== undefined ? data.energy.value : 
                               (typeof data.energy === 'number' ? data.energy : 0);
                const cost = data.cost?.value !== undefined ? data.cost.value : 
                             (typeof data.cost === 'number' ? data.cost : 0);
                
                energyHistory.daily = [{
                    date: formattedDate,
                    consumption: energy,
                    cost: cost,
                    timestamp: now.getTime()
                }];
                
                updateRealtimeDisplay(data);
                updateDashboard();
            } else {
                console.error("Erreur lors de la récupération des données en temps réel:", data.message);
            }
        } catch (error) {
            console.error("Erreur de connexion:", error);
        }
    }

    // Récupérer l'historique de consommation
    async function fetchEnergyHistory(period = "daily") {
        try {
            console.log(`Récupération de l'historique (${period})...`);
            const response = await fetch(`${API_URL}/api/energy/history?period=${period}`);
            const data = await response.json();
            
            if (data.success) {
                console.log(`Historique (${period}) reçu:`, data);
                energyHistory[period] = data.data || [];
                
                updateHistoryComparisonData();
                
                if ((currentPeriodType === "week" && period === "daily") ||
                    (currentPeriodType === "month" && period === "weekly") ||
                    (currentPeriodType === "year" && period === "monthly")) {
                    updateChart();
                    updateSummaryCards();
                    updateHistoryTable();
                }
            } else {
                console.error("Erreur lors de la récupération de l'historique:", data.message);
            }
        } catch (error) {
            console.error("Erreur de connexion:", error);
        }
    }
    
    // Récupérer les données de consommation historiques
    async function fetchConsumptionData() {
        try {
            console.log("Récupération des données de consommation historiques...");
            const response = await fetch(`${API_URL}/api/energy/consumption`);
            const data = await response.json();
            
            if (data.success) {
                console.log("Données de consommation historiques reçues:", data.data);
                return data.data;
            } else {
                console.error("Erreur dans la réponse API:", data.message);
                return null;
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données de consommation historiques:", error);
            return null;
        }
    }
    
    // --- FONCTIONS DE TRAITEMENT DE DONNÉES ---
    
    // Mettre à jour les données d'historique comparatives
    function updateHistoryComparisonData() {
        if (energyHistory.daily.length > 0) {
            const weeklyData = organizeDataByWeek(energyHistory.daily);
            historyDataByPeriod.week = createComparisonData(weeklyData);
        }
        
        if (energyHistory.weekly.length > 0) {
            const monthlyData = organizeDataByMonth(energyHistory.weekly);
            historyDataByPeriod.month = createComparisonData(monthlyData);
        }
        
        if (energyHistory.monthly.length > 0) {
            const yearlyData = organizeDataByYear(energyHistory.monthly);
            historyDataByPeriod.year = createComparisonData(yearlyData);
        }
    }
    
    // Fonctions d'organisation des données
    function organizeDataByWeek(dailyData) {
        const weekMap = new Map();
        
        dailyData.forEach(item => {
            const date = new Date(item.timestamp);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            weekStart.setHours(0, 0, 0, 0);
            
            const weekKey = weekStart.getTime();
            
            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, {
                    timestamp: weekKey,
                    label: `Semaine ${getWeekNumber(weekStart)}`,
                    data: []
                });
            }
            
            weekMap.get(weekKey).data.push(item);
        });
        
        return Array.from(weekMap.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    
    function organizeDataByMonth(weeklyData) {
        const monthMap = new Map();
        
        weeklyData.forEach(item => {
            const date = new Date(item.timestamp);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            
            const monthKey = monthStart.getTime();
            const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
            
            if (!monthMap.has(monthKey)) {
                monthMap.set(monthKey, {
                    timestamp: monthKey,
                    label: `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
                    data: []
                });
            }
            
            monthMap.get(monthKey).data.push(item);
        });
        
        return Array.from(monthMap.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    
    function organizeDataByYear(monthlyData) {
        const yearMap = new Map();
        
        monthlyData.forEach(item => {
            const date = new Date(item.timestamp);
            const yearStart = new Date(date.getFullYear(), 0, 1);
            
            const yearKey = yearStart.getTime();
            
            if (!yearMap.has(yearKey)) {
                yearMap.set(yearKey, {
                    timestamp: yearKey,
                    label: `${yearStart.getFullYear()}`,
                    data: []
                });
            }
            
            yearMap.get(yearKey).data.push(item);
        });
        
        return Array.from(yearMap.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    
    // Créer des données de comparaison
    function createComparisonData(groupedData) {
        const result = [];
        
        groupedData.forEach((group, index) => {
            const totalConsumption = group.data.reduce((sum, item) => sum + item.consumption, 0);
            const totalCost = group.data.reduce((sum, item) => sum + item.cost, 0);
            
            let change = 0;
            if (index < groupedData.length - 1) {
                const prevTotalConsumption = groupedData[index + 1].data.reduce((sum, item) => sum + item.consumption, 0);
                change = prevTotalConsumption > 0 ? ((totalConsumption - prevTotalConsumption) / prevTotalConsumption) * 100 : 0;
            }
            
            result.push({
                period: index === 0 ? `${capitalizeFirstLetter(currentPeriodType)} actuel(le)` : group.label,
                consumption: totalConsumption,
                cost: totalCost,
                change: change
            });
        });
        
        return result;
    }
    
    // --- FONCTIONS DE MISE À JOUR DE L'INTERFACE ---
    
    // Mettre à jour l'affichage des données en temps réel
    function updateRealtimeDisplay(data) {
        const power = data.power?.value || 0;
        const energy = data.energy?.value || 0;
        const cost = data.cost?.value || 0;
        
        if (currentConsumptionElem) {
            currentConsumptionElem.textContent = energy.toFixed(1);
        }
        
        if (currentCostElem) {
            currentCostElem.textContent = new Intl.NumberFormat('fr-FR').format(Math.round(cost));
        }
        
        if (forecastCostElem) {
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const currentDay = now.getDate();
            const estimatedMonthlyConsumption = (cost / currentDay) * daysInMonth;
            
            forecastCostElem.textContent = new Intl.NumberFormat('fr-FR').format(Math.round(estimatedMonthlyConsumption));
        }
    }
    
    // Mettre à jour l'affichage avec les données historiques
    function updateDashboardWithHistoricalData(data) {
        if (!data || !data.calculations) {
            console.log("Aucune donnée historique disponible");
            return;
          }
          
          const calculations = data.calculations;
          
          // Mettre à jour les informations d'hier
          if (calculations.yesterday) {
            document.getElementById("yesterdayConsumption").textContent = calculations.yesterday.consumption.toFixed(1);
            document.getElementById("yesterdayCost").textContent = new Intl.NumberFormat('fr-FR').format(Math.round(calculations.yesterday.cost));
          }
          
          // Mettre à jour les informations de la semaine
          if (calculations.week) {
            document.getElementById("weekConsumption").textContent = calculations.week.consumption.toFixed(1);
            document.getElementById("weekCost").textContent = new Intl.NumberFormat('fr-FR').format(Math.round(calculations.week.cost));
          }
          
          // Mettre à jour les informations du mois
          if (calculations.month) {
            document.getElementById("currentConsumption").textContent = calculations.month.consumption.toFixed(1);
            document.getElementById("currentCost").textContent = new Intl.NumberFormat('fr-FR').format(Math.round(calculations.month.cost));
            
            // Calculer la prévision mensuelle en extrapolant pour le mois entier
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const currentDay = now.getDate();
            const forecastCost = (calculations.month.cost / currentDay) * daysInMonth;
            
            document.getElementById("forecastCost").textContent = new Intl.NumberFormat('fr-FR').format(Math.round(forecastCost));
            
            // AJOUTER CECI: Pour éviter que updateSummaryCards() ne remplace cette valeur
            // Marquer la prévision comme déjà calculée
            window.forecastCalculated = true;
            
            // Également, ajouter une indication de debug dans la console
            console.log(`Prévision mensuelle calculée: ${Math.round(forecastCost)} FCFA (basée sur ${calculations.month.cost} FCFA du jour ${currentDay}/${daysInMonth})`);
        }

          // Ajouter également ce log pour les comparaisons avec les données affichées
        // et comprendre les potentielles divergences
        console.log("Données des calculations dans consommation.json:", calculations);

        
        
        // Mettre à jour les informations du mois précédent
        const now = new Date();
        const prevMonthIndex = now.getMonth() === 0 ? 12 : now.getMonth();
        const prevMonthData = calculations.months[prevMonthIndex];
        
        if (prevMonthData) {
            document.getElementById("prevMonthConsumption").textContent = prevMonthData.consumption.toFixed(1);
            document.getElementById("prevMonthCost").textContent = new Intl.NumberFormat('fr-FR').format(Math.round(prevMonthData.cost));
            
            // Calculer la comparaison avec le mois précédent
            if (calculations.month && prevMonthData.consumption > 0) {
                const monthlyChange = ((calculations.month.consumption - prevMonthData.consumption) / prevMonthData.consumption) * 100;
                const changeClass = monthlyChange >= 0 ? "positive" : "negative";
                const changeSymbol = monthlyChange >= 0 ? "+" : "";
                
                document.getElementById("monthComparisonIndicator").innerHTML = 
                    `<p class="card-indicator ${changeClass}">${changeSymbol}${Math.abs(monthlyChange).toFixed(1)}% vs mois précédent</p>`;
                
                document.getElementById("costComparisonIndicator").innerHTML = 
                    `<p class="card-indicator ${changeClass}">${changeSymbol}${Math.abs(monthlyChange).toFixed(1)}% vs mois précédent</p>`;
            }
        }
        
        // Créer les données mensuelles pour le graphique - TOUS LES 12 MOIS
        const monthlyData = [];
        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
        
        // Parcourir TOUS les mois de l'année, même ceux sans données
        for (let i = 1; i <= 12; i++) {
            // Valeur par défaut si pas de données pour ce mois
            let consumption = 0;
            let cost = 0;
            
            // Si des données existent pour ce mois, les utiliser
            if (calculations.months[i]) {
                consumption = calculations.months[i].consumption;
                cost = calculations.months[i].cost;
            }
            
            // Ajouter le mois même s'il n'y a pas de données
            monthlyData.push({
                date: monthNames[i-1],
                consumption: consumption,
                cost: cost,
                timestamp: new Date(new Date().getFullYear(), i-1, 1).getTime()
            });
        }
        
        // Mettre à jour les données d'historique
        if (monthlyData.length > 0) {
            energyHistory.monthly = monthlyData;
            
            // Mettre à jour l'affichage en mode année
            currentPeriodType = "year";
            
            // Mettre à jour les boutons de filtre pour refléter "année" comme sélection active
            filterButtons.forEach(btn => {
                if (btn.getAttribute("data-period") === "year") {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
            
            updateHistoryComparisonData();
            updateDashboard();
        }
    }
    
    // Fonction principale pour mettre à jour le tableau de bord
    function updateDashboard() {
        updatePeriodNavigator();
        updateChart();
        updateSummaryCards();
        updateHistoryTable();
    }
    
    // Mettre à jour le navigateur de période
    function updatePeriodNavigator() {
        nextPeriodBtn.disabled = currentOffset === 0;
        
        const now = new Date();
        let periodText = "";
        
        switch (currentPeriodType) {
            case "week":
                if (currentOffset === 0) {
                    periodText = "Semaine en cours";
                } else if (currentOffset === -1) {
                    periodText = "Semaine dernière";
                } else {
                    periodText = `Il y a ${Math.abs(currentOffset)} semaines`;
                }
                break;
            case "month":
                const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
                const targetMonth = new Date(now.getFullYear(), now.getMonth() + currentOffset, 1);
                periodText = `${monthNames[targetMonth.getMonth()]} ${targetMonth.getFullYear()}`;
                break;
            case "year":
                const targetYear = now.getFullYear() + currentOffset;
                periodText = `Année ${targetYear}`;
                break;
        }
        
        currentPeriodElem.textContent = periodText;
    }
    
    // Mettre à jour le graphique
    function updateChart() {
        try {
            const data = getDataForCurrentPeriod();
            console.log("Données pour le graphique:", data);
            
            if (!data || data.length === 0) {
                console.log("Aucune donnée disponible pour le graphique");
                
                if (consumptionChart) {
                    consumptionChart.destroy();
                    consumptionChart = null;
                }
                
                const canvas = document.getElementById('consumptionChart');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.font = "16px Arial";
                    ctx.fillStyle = document.documentElement.classList.contains('dark-theme') ? "#f0f6fc" : "#333";
                    ctx.textAlign = "center";
                    ctx.fillText("Aucune donnée disponible pour cette période", canvas.width/2, canvas.height/2);
                }
                return;
            }
            
            const canvas = document.getElementById('consumptionChart');
            if (!canvas) {
                console.error("Élément canvas 'consumptionChart' introuvable");
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            if (consumptionChart) {
                consumptionChart.destroy();
            }
            
            console.log("Création du graphique avec les données:", data);
            
            consumptionChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(item => item.date),
                    datasets: [
                        {
                            label: 'Consommation (kWh)',
                            data: data.map(item => item.consumption),
                            backgroundColor: 'rgba(5, 67, 124, 0.7)',
                            borderColor: 'rgba(5, 67, 124, 1)',
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Coût (FCFA)',
                            data: data.map(item => item.cost),
                            backgroundColor: 'rgba(255, 123, 0, 0.7)',
                            borderColor: 'rgba(255, 123, 0, 1)',
                            borderWidth: 1,
                            type: 'line',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Consommation (kWh)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Coût (FCFA)'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            });
            
            console.log("Graphique créé avec succès");
        } catch (error) {
            console.error("Erreur lors de la création du graphique:", error);
        }
    }
    
    // 1. CORRECTION DANS updateSummaryCards()
    function updateSummaryCards() {
        // NOUVEAU: Ne pas écraser les valeurs déjà calculées par updateDashboardWithHistoricalData
        if (window.forecastCalculated) {
        console.log("Prévision déjà calculée par les données historiques, updateSummaryCards() ne mettra pas à jour la prévision");
        return;
        }
        
        const data = getDataForCurrentPeriod();
        
        if (!data || data.length === 0) {
        console.log("Aucune donnée disponible pour les cartes de résumé");
        return;
        }
        
        const totalConsumption = data.reduce((sum, item) => sum + item.consumption, 0);
        const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
        
        let changeText = "";
        const historyData = historyDataByPeriod[currentPeriodType];
        if (historyData && historyData.length >= 2) {
        const currentPeriodData = historyData[0];
        const prevPeriodData = historyData[1];
        
        if (currentPeriodData && prevPeriodData) {
            const change = currentPeriodData.change;
            const changeClass = change >= 0 ? "positive" : "negative";
            const changeSymbol = change >= 0 ? "+" : "";
            changeText = `<p class="card-indicator ${changeClass}">${changeSymbol}${Math.abs(change).toFixed(1)}% vs période précédente</p>`;
        }
        }
        
        // CORRECTION ICI: Améliorer la logique de calcul de la prévision mensuelle
        let forecastCost = totalCost; // Valeur par défaut
        
        // Si on est en mode semaine, projeter sur un mois (environ 4.3 semaines)
        if (currentPeriodType === "week") {
        forecastCost = totalCost * 4.3;
        console.log(`Mode semaine: projection mensuelle = ${totalCost} × 4.3 = ${forecastCost} FCFA`);
        } 
        // Si on est en mode mois, extrapoler au mois complet
        else if (currentPeriodType === "month") {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        forecastCost = (totalCost / currentDay) * daysInMonth;
        console.log(`Mode mois: projection mensuelle = (${totalCost} / ${currentDay}) × ${daysInMonth} = ${forecastCost} FCFA`);
        }
        // Si on est en mode année, on veut toujours une prévision MENSUELLE
        else if (currentPeriodType === "year") {
        // Compter combien de mois sont représentés dans les données
        const monthsInData = new Set(data.map(item => {
            const dateParts = item.date.split(' ');
            return dateParts[0]; // Extrait le mois (ex: "Avr" de "Avr 2025")
        })).size;
        
        if (monthsInData > 1) {
            // Si plusieurs mois sont présents, on prend la moyenne mensuelle
            forecastCost = totalCost / monthsInData;
            console.log(`Mode année avec ${monthsInData} mois: moyenne mensuelle = ${totalCost} / ${monthsInData} = ${forecastCost} FCFA`);
        } else {
            // Si un seul mois est représenté, on extrapole pour un mois complet
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const currentDay = now.getDate();
            forecastCost = (totalCost / currentDay) * daysInMonth;
            console.log(`Mode année avec 1 mois: projection mensuelle = (${totalCost} / ${currentDay}) × ${daysInMonth} = ${forecastCost} FCFA`);
        }
        }
        
        // Mettre à jour l'affichage
        currentConsumptionElem.textContent = totalConsumption.toFixed(1);
        currentCostElem.textContent = new Intl.NumberFormat('fr-FR').format(Math.round(totalCost));
        forecastCostElem.textContent = new Intl.NumberFormat('fr-FR').format(Math.round(forecastCost));
    }
    
    // Mettre à jour le tableau d'historique
    function updateHistoryTable() {
        historyTableBody.innerHTML = '';
        
        const historyData = historyDataByPeriod[currentPeriodType];
        
        if (!historyData || historyData.length === 0) {
            console.log("Aucune donnée disponible pour le tableau d'historique");
            return;
        }
        
        historyData.forEach(entry => {
            const row = document.createElement('tr');
            
            const trendClass = entry.change > 0 ? 'up' : 'down';
            const trendIcon = entry.change > 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            
            row.innerHTML = `
                <td>${entry.period}</td>
                <td>${entry.consumption.toFixed(1)} kWh</td>
                <td>${new Intl.NumberFormat('fr-FR').format(entry.cost)} FCFA</td>
                <td>
                    <div class="trend ${trendClass}">
                        <i class="fa-solid ${trendIcon}"></i>
                        ${Math.abs(entry.change).toFixed(1)}%
                    </div>
                </td>
            `;
            
            historyTableBody.appendChild(row);
        });
    }
    
    // Obtenir les données pour la période actuelle
    function getDataForCurrentPeriod() {
        let apiData;
        if (currentPeriodType === "week") {
            apiData = energyHistory.daily;
        } else if (currentPeriodType === "month") {
            apiData = energyHistory.weekly;
        } else {
            apiData = energyHistory.monthly;
        }
        
        if (apiData && apiData.length > 0) {
            console.log(`Données pour ${currentPeriodType}:`, apiData);
            return apiData.map(item => ({
                date: item.date,
                consumption: item.consumption,
                cost: item.cost
            }));
        }
        
        console.log("Aucune donnée disponible pour cette période");
        return [];
    }
    
    // --- FONCTIONS UTILITAIRES ---
    
    // Obtenir le numéro de la semaine dans l'année
    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
    
    // Capitaliser la première lettre d'une chaîne
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // --- GESTIONNAIRES D'ÉVÉNEMENTS ---
    
    // Changer de période (semaine, mois, année)
    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            
            currentPeriodType = button.getAttribute("data-period");
            currentOffset = 0;
            updateDashboard();
        });
    });
    
    // Navigation entre les périodes
    prevPeriodBtn.addEventListener("click", () => {
        currentOffset--;
        updateDashboard();
    });
    
    nextPeriodBtn.addEventListener("click", () => {
        if (currentOffset < 0) {
            currentOffset++;
            updateDashboard();
        }
    });
    
    // Ajuster le graphique lors du redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        if (consumptionChart) {
            consumptionChart.resize();
        }
    });
    
    // --- INITIALISATION ---
    
    // 3. MODIFIER initDashboard() POUR ÉVITER LES MISES À JOUR MULTIPLES
    async function initDashboard() {
        console.log("Initialisation du tableau de bord...");
        
        // Réinitialiser le flag de prévision calculée
        window.forecastCalculated = false;
        
        // Sélectionner l'année comme période par défaut
        currentPeriodType = "year";
        
        // Mettre à jour les boutons de filtre
        filterButtons.forEach(btn => {
        if (btn.getAttribute("data-period") === "year") {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
        });
        
        // Récupérer les données de consommation et mise à jour immédiate
        try {
        const data = await fetchConsumptionData();
        if (data) {
            // Utiliser les données historiques
            updateDashboardWithHistoricalData(data);
            
            // MODIFICATION ICI: Ne pas appeler updateDashboard() si les données historiques
            // ont été utilisées pour éviter que updateSummaryCards() n'écrase les valeurs
        } else {
            // Si pas de données de consommation, essayer en temps réel
            await fetchRealtimeConsumption();
            await fetchEnergyHistory("daily");
            await fetchEnergyHistory("weekly");
            await fetchEnergyHistory("monthly");
            
            // Dans ce cas on peut appeler updateDashboard() car il n'y a pas de conflit
            updateDashboard();
        }
        } catch (error) {
        console.error("Erreur lors de l'initialisation du tableau de bord:", error);
        }
    }

    
    
    // Démarrer l'initialisation
    initDashboard();

    
    
    // Actualiser les données périodiquement
    setInterval(async () => {
        try {
            const data = await fetchConsumptionData();
            if (data) {
                updateDashboardWithHistoricalData(data);
            } else {
                fetchRealtimeConsumption();
            }
        } catch (error) {
            console.error("Erreur lors de l'actualisation des données:", error);
        }
    }, 60000); // Mise à jour toutes les minutes

    // 4. AJOUTER UNE FONCTION DE DIAGNOSTIC AU SCRIPT PRINCIPAL
function diagnostiquerPrevision() {
    // Récupérer les valeurs actuellement affichées
    const consommationAffichee = parseFloat(document.getElementById("currentConsumption").textContent);
    const coutAffiche = parseFloat(document.getElementById("currentCost").textContent.replace(/\s+/g, ''));
    const previsionAffichee = parseFloat(document.getElementById("forecastCost").textContent.replace(/\s+/g, ''));
    
    // Calculer ce que devrait être la prévision
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const previsionCalculee = (coutAffiche / currentDay) * daysInMonth;
    
    console.log("======= DIAGNOSTIC DE PRÉVISION =======");
    console.log(`Date actuelle: ${now.toLocaleDateString('fr-FR')} (jour ${currentDay}/${daysInMonth})`);
    console.log(`Consommation affichée: ${consommationAffichee} kWh`);
    console.log(`Coût affiché: ${coutAffiche} FCFA`);
    console.log(`Prévision affichée: ${previsionAffichee} FCFA`);
    console.log(`Prévision calculée: (${coutAffiche} / ${currentDay}) * ${daysInMonth} = ${Math.round(previsionCalculee)} FCFA`);
    console.log(`Écart: ${Math.round(previsionAffichee - previsionCalculee)} FCFA (${((previsionAffichee/previsionCalculee)-1)*100}%)`);
    console.log("======================================");
}

// Planifier l'exécution de la fonction de diagnostic
setTimeout(diagnostiquerPrevision, 2000);

// Actualiser les données périodiquement
setInterval(async () => {
    try {
        const data = await fetchConsumptionData();
        if (data) {
            updateDashboardWithHistoricalData(data);
        } else {
            fetchRealtimeConsumption();
        }
    } catch (error) {
        console.error("Erreur lors de l'actualisation des données:", error);
    }
}, 60000); // Mise à jour toutes les minutes
});

