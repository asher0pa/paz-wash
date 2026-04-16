/**
 * PAZ Car Wash Finder - App Logic
 * Note: Replace the `mockStations` array below with the JSON dataset you downloaded!
 */

// Format for stations: { name: string, lat: number, lon: number }
const mockStations = [
    { name: "Paz Tel Aviv Port", lat: 32.0988, lon: 34.7734 },
    { name: "Paz Azrieli Center", lat: 32.0743, lon: 34.7921 }
];

// If stations.js is loaded, it provides `pazStations`. Fallback to mockStations.
const stationsToUse = typeof pazStations !== 'undefined' ? pazStations : mockStations;

const elements = {
    statusCard: document.getElementById('status-card'),
    statusText: document.getElementById('status-text'),
    statusSubtext: document.getElementById('status-subtext'),
    pulseRing: document.querySelector('.pulse-ring'),
    stationsHeader: document.getElementById('stations-header'),
    stationsList: document.getElementById('stations-list'),
    retryBtnContainer: document.getElementById('retry-btn-container'),
    retryBtn: document.getElementById('retry-btn'),
    lastUpdatedText: document.getElementById('last-updated-text')
};

// SVG icon for Waze
const wazeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M502.285 359.886l-46.012-108.7c-9.043-21.362-28.718-36.568-51.815-40.04-12.836-39.638-49.492-68.514-93.57-68.514h-8.086c-44.075 0-80.73 28.87-93.567 68.504-23.095 3.473-42.77 18.68-51.813 40.04L105.16 359.887c-12.835 30.32 9.475 63.882 42.427 63.882h311.5c32.95 0 55.26-33.562 43.197-63.883zM189.664 366.1a30.124 30.124 0 01-30.088 30.09 30.124 30.124 0 01-30.088-30.09c0-16.618 13.47-30.09 30.088-30.09s30.088 13.472 30.088 30.09zm186.442 0a30.124 30.124 0 01-30.088 30.09 30.124 30.124 0 01-30.088-30.09c0-16.618 13.47-30.09 30.088-30.09s30.088 13.472 30.088 30.09z"></path><path d="M472.934 94.757C450.916 63.35 417.805 44 380 44c-31.574 0-61.942 11.233-85.105 32.176 10.457-3.4 21.652-5.176 33.105-5.176 56.242 0 101.99 45.748 101.99 101.99 0 25.13-9.06 48.118-24.316 65.992 36.37-3.793 69.34-21.782 92.593-51.897C520.45 158.423 506.776 117.828 472.934 94.757zM250 82C189.25 82 140 131.25 140 192c0 24.28 7.825 46.74 21.037 64.673l-16.61-39.237c-9.043-21.36-28.718-36.566-51.815-40.04C79.775 137.758 43.12 108.882 18 108.882H0v124h21.902c38.742 0 72.82 22.148 89.96 55.45C102.592 276.574 98 261.218 98 245c0-62.96 51.04-114 114-114s114 51.04 114 114c0 16.218-4.593 31.573-13.863 43.333 17.14-33.303 51.218-55.452 89.96-55.452h21.902v-124H416c-25.12 0-61.775 28.876-74.61 68.513-23.097 3.474-42.772 18.68-51.815 40.04L278.368 281.82c-.894 2.112-1.847 4.195-2.864 6.242A133.58 133.58 0 00250 286c-73.896 0-134 60.104-134 134v48h268v-48c0-73.896-60.104-134-134-134zm0 216c-24.26 0-44 19.74-44 44h88c0-24.26-19.74-44-44-44z"></path></svg>`;

function init() {
    if (typeof lastUpdated !== 'undefined') {
        elements.lastUpdatedText.textContent = `עודכן לאחרונה: מאגר נתונים מיום ${lastUpdated}`;
    }
    
    // Welcome state instead of auto-requesting location
    elements.pulseRing.classList.add('hidden');
    elements.statusText.textContent = "פז Wash - תחנות שטיפה";
    elements.statusSubtext.textContent = "למציאת התחנה הקרובה אליך, אנא לחץ על הכפתור מטה ואשר את הגישה למיקום.";
    
    elements.retryBtnContainer.classList.remove('hidden');
    elements.retryBtn.textContent = "📍 מצא תחנה קרובה";
    elements.retryBtn.addEventListener('click', () => {
        elements.retryBtn.textContent = "נסה שוב";
        requestLocation();
    });
    
    // Show all stations as a fallback initially
    processStations(null, null);
}

/**
 * Calculates straight line distance between 2 coordinates (Haversine formula).
 * Returns distance in kilometers.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function requestLocation() {
    // Reset UI
    elements.statusText.textContent = "מאתר את המיקום שלך...";
    elements.statusSubtext.textContent = "אנא ודא ששירותי המיקום (GPS) מופעלים.";
    elements.pulseRing.classList.remove('hidden');
    elements.retryBtnContainer.classList.add('hidden');
    elements.stationsHeader.classList.add('hidden');
    elements.stationsList.innerHTML = '';
    elements.stationsList.classList.add('hidden');

    if (!navigator.geolocation) {
        showError("הדפדפן שלך אינו תומך בזיהוי מיקום.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            processStations(userLat, userLon);
        },
        error => {
            console.error(error);
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    showError("הגישה למיקום נחסמה. לפתרון מהיר בספארי: לחצו על ׳Aa׳ (או ׳אע׳) בשורת הכתובת למטה ⬅️ הגדרות אתר ⬅️ מיקום ⬅️ בחרו לשנות מ-׳דחה׳ ל-׳אפשר׳. לאחר מכן לחצו 'נסה שוב'.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    showError("מידע המיקום אינו זמין כרגע. מוצגת רשימת כל התחנות למטה.");
                    break;
                case error.TIMEOUT:
                    showError("בקשת המיקום הסתיימה. ייתכן קושי בקליטה. הרשימה המלאה למטה.");
                    break;
                default:
                    showError("אירעה שגיאה בקבלת המיקום. הרשימה המלאה מוצגת למטה.");
                    break;
            }
            processStations(null, null);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
}

function showError(message) {
    elements.pulseRing.classList.add('hidden');
    elements.statusText.textContent = "שגיאת מיקום";
    elements.statusSubtext.textContent = message;
    elements.retryBtnContainer.classList.remove('hidden');
}

let globalStations = [];
let renderedCount = 0;
const BATCH_SIZE = 15;

function processStations(userLat, userLon) {
    // Calculate distance for all stations optionally
    let stationsWithDistances = stationsToUse.map(station => {
        // Handle optional address
        let displayName = station.name;
        if (station.address) {
            const parts = station.address.split(',');
            if (parts.length > 1) {
                displayName += ` (${parts[1].trim()})`;
            } else {
                displayName += ` (${station.address.trim()})`;
            }
        }

        let distance = null;
        if (userLat != null && userLon != null) {
            distance = calculateDistance(userLat, userLon, station.lat, station.lon);
        }
        return { ...station, displayName, distance };
    });

    if (userLat != null && userLon != null) {
        // Sort by distance (closest first)
        stationsWithDistances.sort((a, b) => a.distance - b.distance);
    } else {
        // Sort alphabetically
        stationsWithDistances.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }

    globalStations = stationsWithDistances;
    renderedCount = 0;
    elements.stationsList.innerHTML = '';
    
    // Create 'Load More' button if it doesn't exist yet
    let loadMoreBtn = document.getElementById('load-more-btn');
    if (!loadMoreBtn) {
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.className = 'action-btn outline';
        loadMoreBtn.style.width = '100%';
        loadMoreBtn.style.marginTop = '25px';
        loadMoreBtn.textContent = 'טען תחנות נוספות';
        loadMoreBtn.addEventListener('click', () => {
            renderStationsBatch();
        });
        document.querySelector('main').appendChild(loadMoreBtn);
    }
    
    renderStationsBatch();
}

function renderStationsBatch() {
    const nextBatch = globalStations.slice(renderedCount, renderedCount + BATCH_SIZE);
    if(nextBatch.length === 0) return;

    if (renderedCount === 0) {
        // Update status card for first load only if we got a location
        elements.pulseRing.classList.add('hidden');
        if (globalStations[0] && globalStations[0].distance != null) {
            elements.statusText.textContent = "נמצאו התחנות הקרובות!";
            elements.statusSubtext.textContent = "לחץ 'Waze' כדי לפתוח ישירות באפליקציה.";
            elements.stationsHeader.innerHTML = '<h2>התחנות הקרובות ביותר</h2>';
        } else {
            elements.stationsHeader.innerHTML = '<h2>כל התחנות (ללא מיקום נגיש)</h2>';
        }
        
        // Show list
        elements.stationsHeader.classList.remove('hidden');
        elements.stationsList.classList.remove('hidden');
    }

    nextBatch.forEach(station => {
        const li = document.createElement('li');
        li.className = 'station-item';

        // Format distance: if < 1km show meters, else show km with 1 decimal
        let distanceBadgeHtml = "";
        if (station.distance != null) {
            let formattedDist = station.distance < 1 
                ? `${Math.round(station.distance * 1000)} מטר` 
                : `${station.distance.toFixed(1)} ק"מ`;
            distanceBadgeHtml = `<span class="distance-badge">${formattedDist}</span>`;
        }

        // Create the address string if it exists in data
        let addressHtml = station.address ? `<p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 4px;">${station.address}</p>` : '';

        // https://waze.com/ul?ll=latitude,longitude&navigate=yes
        const wazeUrl = `https://waze.com/ul?ll=${station.lat},${station.lon}&navigate=yes`;
        
        // Google Maps Search URL to show hours and photos natively
        const mapsQuery = encodeURIComponent(`פז ${station.name} ${station.address || ''}`);
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
        
        // Free Google Maps embedded iframe
        const mapIframeUrl = `https://maps.google.com/maps?q=${station.lat},${station.lon}&hl=he&z=15&output=embed`;

        // Phone button
        const phoneBtnHtml = station.phone ? `
                    <a href="tel:${station.phone}" class="waze-btn" style="background: #ff9800; box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);">
                        <i class="fas fa-phone" style="transform: scaleX(-1);"></i> התקשר
                    </a>` : '';

        li.innerHTML = `
            <div class="station-item-header">
                <div class="station-info">
                    <h3>${station.displayName || station.name}</h3>
                    ${addressHtml}
                    ${distanceBadgeHtml}
                </div>
                <div class="action-buttons" style="display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap;">
                    ${phoneBtnHtml}
                    <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="waze-btn" style="background: #34a853; box-shadow: 0 4px 15px rgba(52, 168, 83, 0.4);">
                        <i class="fas fa-map-marked-alt"></i> Google Maps
                    </a>
                    <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" class="waze-btn">
                        ${wazeIcon} Waze
                    </a>
                </div>
            </div>
            <div class="station-map-container">
                <iframe width="100%" height="150" style="border:0; min-height: 150px;" loading="lazy" src="${mapIframeUrl}"></iframe>
            </div>
        `;

        elements.stationsList.appendChild(li);
    });

    renderedCount += nextBatch.length;
    
    // Toggle Load More button visibility
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (renderedCount < globalStations.length) {
        loadMoreBtn.classList.remove('hidden');
    } else {
        loadMoreBtn.classList.add('hidden');
    }
}

// ================= PWA Installation Logic =================
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const iosInstallGuide = document.getElementById('ios-install-guide');
const closeIosGuideBtn = document.getElementById('close-ios-guide');

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('SW registered successfully');
        }).catch(err => {
            console.log('SW registration failed: ', err);
        });
    });
}

// Listen for install prompt on Android/Chrome
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
        installBtn.classList.remove('hidden');
    }
});

// Handle Install Button Click
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

        if (isIos() && !isInStandaloneMode()) {
            // iOS doesn't support the automated prompt, show manual guide
            if (iosInstallGuide) iosInstallGuide.classList.remove('hidden');
        } else if (deferredPrompt) {
            // Show standard Android prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        } else if (isInStandaloneMode()) {
            alert("האפליקציה כבר מותקנת!");
            installBtn.classList.add('hidden');
        }
    });
}

// Handle close iOS guide
if (closeIosGuideBtn) {
    closeIosGuideBtn.addEventListener('click', () => {
        if (iosInstallGuide) iosInstallGuide.classList.add('hidden');
    });
}

// Helper to show button on iOS if not installed
window.addEventListener('load', () => {
    const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);
    if (isIos() && !isInStandaloneMode() && installBtn) {
        installBtn.classList.remove('hidden');
    }
});

// Hide install button after installation
window.addEventListener('appinstalled', (evt) => {
    console.log('App was successfully installed');
    if (installBtn) installBtn.classList.add('hidden');
});

// Start application
document.addEventListener('DOMContentLoaded', init);
