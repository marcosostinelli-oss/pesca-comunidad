// ==================================================
// MÓDULO DE PÁGINA DE INICIO - VERSIÓN LIMPIA
// ==================================================

export class HomePage {
    constructor(app) {
        this.app = app;
        this.map = null;
    }

    async show() {
        const app = document.getElementById('app');
        app.innerHTML = this.getHomeHTML();
        this.setupEventListeners();
        
        // Inicializar el mapa después de que se renderice el HTML
        setTimeout(async () => {
            await this.initializeHomepageMap();
        }, 100);
    }

    getHomeHTML() {
        const currentUser = this.app.getCurrentUser();
        
        return `
            <div>
                <div class="text-center mb-5">
                    <h1>🎣 Bienvenido a PescaComunidad</h1>
                    <p class="lead">Conecta con otros pescadores, comparte tus spots y encuentra compañeros de pesca</p>
                </div>
                
                <!-- MAPA EN HOMEPAGE -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h3 class="card-title">
                                    <i class="fas fa-map-marked-alt text-primary"></i> 
                                    Mapa Interactivo de Pesca
                                </h3>
                                <p class="text-muted mb-4">Explora los mejores lugares de pesca, condiciones actuales y reportes de la comunidad</p>
                                <div id="home-map" style="min-height: 400px; width: 100%; border-radius: 8px;"></div>
                                <div class="text-center mt-3">
                                    <a href="/mapa" class="btn btn-primary">
                                        <i class="fas fa-expand me-2"></i>Ver Mapa Completo
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- FEATURE CARDS -->
                <div class="row mb-4">
                    <div class="col-md-4 mb-3">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h5>📍 Spots de Pesca</h5>
                                <p>Comparte y descubre los mejores lugares para pescar</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h5>👥 Comunidad</h5>
                                <p>Conecta con otros apasionados de la pesca</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h5>🌤️ Clima en Tiempo Real</h5>
                                <p>Consulta condiciones climáticas para tu pesca</p>
                            </div>
                        </div>
                    </div>
                </div>

                ${!currentUser ? `
                    <div class="text-center mt-5">
                        <button class="btn btn-fishing btn-lg" id="register-nav-btn">
                            ¡Únete a la Comunidad!
                        </button>
                    </div>
                ` : `
                    <div class="text-center mt-5">
                        <button class="btn btn-primary me-2" id="profile-home-btn">👤 Mi Perfil</button>
                        <button class="btn btn-success" id="view-map-btn">🗺️ Ver Mapa</button>
                    </div>
                `}
            </div>
        `;
    }

    async initializeHomepageMap() {
        try {
            const mapContainer = document.getElementById('home-map');
            if (!mapContainer) {
                console.log('⚠️ Contenedor home-map no encontrado');
                return;
            }

            // Crear mapa en el elemento home-map
            this.map = L.map('home-map', {
                dragging: true,
                touchZoom: true,
                zoomControl: true
            }).setView([-34.6037, -58.3816], 10);

            // Añadir capa de tiles de OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
                minZoom: 5
            }).addTo(this.map);

            // Cargar spots del mapa core
            if (this.app.mapCore) {
                const spots = await this.app.mapCore.loadSpotsFromDatabase();
                if (spots && spots.length > 0) {
                    spots.forEach(spot => {
                        if (spot.latitude && spot.longitude) {
                            L.circleMarker([spot.latitude, spot.longitude], {
                                radius: 6,
                                fillColor: '#2563eb',
                                color: '#fff',
                                weight: 2,
                                opacity: 0.8,
                                fillOpacity: 0.7
                            }).addTo(this.map).bindPopup(`<strong>${spot.name}</strong>`);
                        }
                    });
                }
            }

            // Ajustar mapa al contenedor después de crearlo
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 100);

            console.log('✅ Mapa de homepage inicializado');
        } catch (error) {
            console.error('❌ Error inicializando mapa en homepage:', error);
        }
    }

    setupEventListeners() {
        // Event listeners existentes
        const registerBtn = document.getElementById('register-nav-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.app.authUI.showAuthModal('register');
            });
        }

        const profileBtn = document.getElementById('profile-home-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.app.router.navigate('/perfil');
            });
        }

        const mapBtn = document.getElementById('view-map-btn');
        if (mapBtn) {
            mapBtn.addEventListener('click', () => {
                this.app.router.navigate('/mapa');
            });
        }
    }

    async initializeHomepageMap() {
        try {
            const mapContainer = document.getElementById('home-map');
            if (!mapContainer) {
                console.log('⚠️ Contenedor home-map no encontrado');
                return;
            }

            // Crear mapa en el elemento home-map
            this.map = L.map('home-map', {
                dragging: true,
                touchZoom: true,
                zoomControl: true
            }).setView([-34.6037, -58.3816], 10);

            // Añadir capa de tiles de OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
                minZoom: 5
            }).addTo(this.map);

            // Cargar spots del mapa core
            if (this.app.mapCore) {
                const spots = await this.app.mapCore.loadSpotsFromDatabase();
                if (spots && spots.length > 0) {
                    spots.forEach(spot => {
                        if (spot.latitude && spot.longitude) {
                            L.circleMarker([spot.latitude, spot.longitude], {
                                radius: 6,
                                fillColor: '#2563eb',
                                color: '#fff',
                                weight: 2,
                                opacity: 0.8,
                                fillOpacity: 0.7
                            }).addTo(this.map).bindPopup(`<strong>${spot.name}</strong>`);
                        }
                    });
                }
            }

            // Ajustar mapa al contenedor después de crearlo
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 100);

            console.log('✅ Mapa de homepage inicializado');
        } catch (error) {
            console.error('❌ Error inicializando mapa en homepage:', error);
        }
    }
}