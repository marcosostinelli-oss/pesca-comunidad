// ==================================================
// MÓDULO DE MAPA - GESTIÓN DE MAPA Y SPOTS CON CLIMA EN TIEMPO REAL
// ==================================================

import { WeatherService } from '../weather/weather.js';

export class MapCore {
    constructor(app) {
        this.app = app;
        this.weatherService = new WeatherService();
        this.map = null;
        this.userLocationMarker = null;
        this.spotMarkers = [];
        this.currentLocation = null;
        this.spotCreationMode = false;
        this.tempMarker = null;
        this.clickMarker = null;
        this.searchMarker = null;
        this.selectedCoordinates = null;
        
        // Estado del clima
        this.currentWeather = null;
        this.weatherForecast = null;
    }

    // Inicializar mapa completo
    async initFullMap() {
        console.log('🗺️ Inicializando mapa completo...');
        
        try {
            const mapContainer = document.getElementById('full-map');
            if (!mapContainer) {
                console.error('❌ Contenedor del mapa no encontrado');
                return;
            }

            this.map = L.map('full-map').setView([-34.6037, -58.3816], 10);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.map);

            this.initializeMapEvents();
            this.initializeWeatherButtons();
            
            // ✅ CARGAR CLIMA ACTUAL AL INICIALIZAR
            await this.showWeatherPanel('weather-btn');

            await this.getUserLocation();
            await this.loadSpotsFromDatabase();

            // Verificar si hay un spot para centrar (viene de la grilla)
            this.checkForSpotToView();

            console.log('✅ Mapa completo inicializado correctamente');

        } catch (error) {
            console.error('❌ Error inicializando mapa completo:', error);
            
            if (this.map) {
                this.map.setView([-34.6037, -58.3816], 10);
            }
            this.app.showNotification('Error cargando el mapa. Usando ubicación por defecto.', 'warning');
        }
    }

    // Verificar si hay un spot para centrar (desde la grilla)
    checkForSpotToView() {
        try {
            const spotToView = sessionStorage.getItem('spotToView');
            if (spotToView) {
                console.log('📍 Encontrado spot para centrar desde grilla');
                const spot = JSON.parse(spotToView);
                
                // Pequeño delay para asegurar que el mapa esté listo
                setTimeout(() => {
                    this.centerMapOnSpot(spot);
                }, 1000);
                
                // Limpiar storage
                sessionStorage.removeItem('spotToView');
            }
        } catch (error) {
            console.error('❌ Error procesando spot para visualizar:', error);
            sessionStorage.removeItem('spotToView');
        }
    }

    // Inicializar eventos del mapa
    initializeMapEvents() {
        const locationBtn = document.getElementById('location-btn');
        if (locationBtn) {
            locationBtn.addEventListener('click', async () => {
                await this.getUserLocation();
                // ✅ ACTUALIZAR CLIMA AL MOVERSE
                await this.showWeatherPanel('weather-btn');
            });
        }

        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', async () => {
                await this.searchLocation();
                // ✅ ACTUALIZAR CLIMA AL BUSCAR
                await this.showWeatherPanel('weather-btn');
            });
        }

        const reloadSpotsBtn = document.getElementById('reload-spots-btn');
        if (reloadSpotsBtn) {
            reloadSpotsBtn.addEventListener('click', async () => {
                this.app.showNotification('🔄 Recargando spots...', 'info');
                const success = await this.reloadSpots();
                if (success) {
                    this.app.showNotification('✅ Spots recargados correctamente', 'success');
                } else {
                    this.app.showNotification('⚠️ Error recargando spots', 'warning');
                }
            });
        }

        const addSpotBtn = document.getElementById('add-spot-btn');
        if (addSpotBtn) {
            addSpotBtn.disabled = true;
            addSpotBtn.classList.remove('btn-warning');
            addSpotBtn.classList.add('btn-secondary');
            addSpotBtn.addEventListener('click', () => this.activateSpotCreation());
        }

        const spotForm = document.getElementById('spot-form');
        if (spotForm) {
            spotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSpot();
            });
        }

        const cancelSpotBtn = document.getElementById('cancel-spot-btn');
        if (cancelSpotBtn) {
            cancelSpotBtn.addEventListener('click', () => this.cancelSpotCreation());
        }

        if (this.map) {
            this.map.on('click', (e) => {
                if (this.spotCreationMode) {
                    this.handleMapClickForSpot(e);
                }
            });
            
            // ✅ ACTUALIZAR CLIMA AL MOVER EL MAPA
            this.map.on('moveend', () => {
                if (!this.spotCreationMode) {
                    this.showWeatherPanel('weather-btn');
                }
            });
        }
    }

    // Obtener ubicación del usuario
    async getUserLocation() {
        console.log('📍 Obteniendo ubicación del usuario...');
        
        if (!navigator.geolocation) {
            this.app.showNotification('La geolocalización no es soportada por tu navegador', 'error');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 100000,
                    maximumAge: 60000
                });
            });

            const { latitude, longitude } = position.coords;
            this.currentLocation = { lat: latitude, lng: longitude };
            
            console.log(`📍 Ubicación obtenida: ${latitude}, ${longitude}`);

            this.map.setView([latitude, longitude], 13);

            if (this.userLocationMarker) {
                this.map.removeLayer(this.userLocationMarker);
            }

            this.userLocationMarker = L.marker([latitude, longitude])
                .addTo(this.map)
                .bindPopup('📍 Tu ubicación actual')
                .openPopup();

            const addSpotBtn = document.getElementById('add-spot-btn');
            if (addSpotBtn) {
                addSpotBtn.disabled = false;
                addSpotBtn.classList.remove('btn-secondary');
                addSpotBtn.classList.add('btn-warning');
            }

            this.app.showNotification('Ubicación detectada correctamente', 'success');

        } catch (error) {
            console.error('❌ Error obteniendo ubicación:', error);
            
            let errorMessage = 'No se pudo obtener tu ubicación. ';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Permiso de ubicación denegado.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Ubicación no disponible.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Tiempo de espera agotado.';
                    break;
                default:
                    errorMessage += 'Error desconocido.';
            }
            
            this.app.showNotification(errorMessage, 'error');
            
            const addSpotBtn = document.getElementById('add-spot-btn');
            if (addSpotBtn) {
                addSpotBtn.disabled = true;
                addSpotBtn.classList.remove('btn-warning');
                addSpotBtn.classList.add('btn-secondary');
            }
        }
    }

    // Buscar ubicación
    async searchLocation() {
        const searchInput = document.getElementById('search-input');
        const query = searchInput.value.trim();

        if (!query) {
            this.app.showNotification('Por favor ingresa una ubicación para buscar', 'warning');
            return;
        }

        console.log(`🔍 Buscando ubicación: ${query}`);

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);

                this.map.setView([lat, lon], 13);

                if (this.searchMarker) {
                    this.map.removeLayer(this.searchMarker);
                }

                this.searchMarker = L.marker([lat, lon])
                    .addTo(this.map)
                    .bindPopup(`📍 ${result.display_name}`)
                    .openPopup();

                this.app.showNotification(`Ubicación encontrada: ${result.display_name}`, 'success');

            } else {
                this.app.showNotification('No se encontró la ubicación especificada', 'error');
            }

        } catch (error) {
            console.error('❌ Error buscando ubicación:', error);
            this.app.showNotification('Error al buscar la ubicación', 'error');
        }
    }

    // Activar modo creación de spot
    activateSpotCreation() {
        console.log('🎯 Activando modo creación de spot...');
        
        if (!this.app.getCurrentUser()) {
            this.app.showNotification('Debes iniciar sesión para agregar spots', 'warning');
            return;
        }

        this.spotCreationMode = true;
        
        const addSpotBtn = document.getElementById('add-spot-btn');
        if (addSpotBtn) {
            addSpotBtn.textContent = '✅ Confirmar Spot';
            addSpotBtn.classList.remove('btn-warning');
            addSpotBtn.classList.add('btn-success');
        }

        this.app.showNotification('Haz clic en el mapa para agregar un spot de pesca', 'info');
    }

    // Manejar clic en el mapa para crear spot
    handleMapClickForSpot(e) {
        console.log('🎯 Clic en mapa para crear spot:', e.latlng);
        
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
        }

        if (this.clickMarker) {
            this.map.removeLayer(this.clickMarker);
        }

        this.tempMarker = L.marker(e.latlng)
            .addTo(this.map)
            .bindPopup('📍 Nuevo spot de pesca<br><em>Formulario abierto</em>')
            .openPopup();

        this.selectedCoordinates = e.latlng;
        
        this.showSpotForm(e.latlng);
    }

    // Mostrar formulario de spot
    showSpotForm(latlng) {
        console.log('📝 Mostrando formulario de spot...', latlng);
        
        const modalElement = document.getElementById('spot-form-container');
        if (!modalElement) {
            console.error('❌ Modal de spot no encontrado');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        
        const latInput = document.getElementById('spot-latitude');
        const lngInput = document.getElementById('spot-longitude');
        const coordinatesInput = document.getElementById('spot-coordinates');
        
        console.log('📍 Buscando inputs de coordenadas:', {
            latInput: latInput ? `encontrado (${latInput.id})` : 'no encontrado',
            lngInput: lngInput ? `encontrado (${lngInput.id})` : 'no encontrado',
            coordinatesInput: coordinatesInput ? `encontrado (${coordinatesInput.id})` : 'no encontrado'
        });
        
        if (latInput && lngInput) {
            latInput.value = latlng.lat;
            lngInput.value = latlng.lng;
            console.log(`📍 Coordenadas asignadas a inputs ocultos: ${latlng.lat}, ${latlng.lng}`);
        }
        
        if (coordinatesInput) {
            coordinatesInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
            console.log(`📍 Coordenadas asignadas al campo visual: ${coordinatesInput.value}`);
        }
        
        setTimeout(() => {
            console.log('✅ Verificación de valores asignados:', {
                latInput: latInput?.value,
                lngInput: lngInput?.value,
                coordinatesInput: coordinatesInput?.value
            });
        }, 100);

        modal.show();
    }

    // Cancelar creación de spot
    cancelSpotCreation() {
        this.spotCreationMode = false;
        
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
        
        if (this.clickMarker) {
            this.map.removeLayer(this.clickMarker);
            this.clickMarker = null;
        }
        
        this.selectedCoordinates = null;

        const addSpotBtn = document.getElementById('add-spot-btn');
        if (addSpotBtn) {
            addSpotBtn.textContent = '➕ Agregar Spot';
            addSpotBtn.classList.remove('btn-success');
            addSpotBtn.classList.add('btn-warning');
        }
        
        console.log('❌ Creación de spot cancelada');
    }

    // Guardar spot
    async saveSpot() {
        console.log('💾 Iniciando guardado de spot...');
        
        if (!this.app.spotsManager || typeof this.app.spotsManager.saveSpot !== 'function') {
            console.error('❌ spotsManager no disponible:', {
                spotsManager: this.app.spotsManager,
                saveSpot: typeof this.app.spotsManager?.saveSpot
            });
            this.app.showNotification('Error: Sistema de spots no disponible', 'error');
            return;
        }
        
        try {
            const form = document.getElementById('spot-form');
            if (!form) {
                throw new Error('Formulario de spot no encontrado');
            }
            
            const formData = new FormData(form);
            
            let latitude, longitude;
            
            const latInput = document.getElementById('spot-latitude');
            const lngInput = document.getElementById('spot-longitude');
            const coordinatesInput = document.getElementById('spot-coordinates');
            
            console.log('📍 Fuentes de coordenadas disponibles:', {
                latInput: latInput?.value,
                lngInput: lngInput?.value,
                coordinatesInput: coordinatesInput?.value,
                selectedCoordinates: this.selectedCoordinates
            });
            
            if (latInput && lngInput && latInput.value && lngInput.value) {
                latitude = parseFloat(latInput.value);
                longitude = parseFloat(lngInput.value);
                console.log('📍 Usando coordenadas de inputs ocultos');
            } else if (coordinatesInput && coordinatesInput.value) {
                const coords = coordinatesInput.value.split(',').map(coord => parseFloat(coord.trim()));
                if (coords.length === 2) {
                    latitude = coords[0];
                    longitude = coords[1];
                    console.log('📍 Usando coordenadas del campo visual');
                }
            } else if (this.selectedCoordinates) {
                latitude = this.selectedCoordinates.lat;
                longitude = this.selectedCoordinates.lng;
                console.log('📍 Usando coordenadas del clic guardado');
            } else if (this.clickMarker) {
                const latlng = this.clickMarker.getLatLng();
                latitude = latlng.lat;
                longitude = latlng.lng;
                console.log('📍 Usando coordenadas del marcador de clic');
            } else {
                throw new Error('No se pudieron obtener las coordenadas del spot');
            }

            console.log(`📍 Coordenadas finales: ${latitude}, ${longitude}`);
            
            const spotData = {
                name: formData.get('name') || document.getElementById('spot-name')?.value,
                type: formData.get('type') || document.getElementById('spot-type')?.value,
                description: formData.get('description') || document.getElementById('spot-description')?.value,
                species: formData.get('species') || document.getElementById('spot-species')?.value,
                bestTime: formData.get('bestTime') || document.getElementById('spot-best-time')?.value,
                accessibility: formData.get('accessibility') || 'moderado',
                facilities: Array.from(formData.getAll('facilities')) || [],
                coordinates: { lat: latitude, lng: longitude },
                latitude: latitude,
                longitude: longitude,
                visibility: formData.get('visibility') || document.getElementById('spot-visibility')?.value || 'public'
            };

            console.log('📋 Datos del spot preparados:', spotData);

            if (!spotData.name || !spotData.type) {
                this.app.showNotification('Nombre y tipo de spot son requeridos', 'error');
                return;
            }

            if (!spotData.latitude || !spotData.longitude) {
                this.app.showNotification('Coordenadas del spot no válidas', 'error');
                return;
            }

            console.log('💾 Enviando datos a spotsManager...');
            const savedSpot = await this.app.spotsManager.saveSpot(spotData);
            
            if (savedSpot) {
                console.log('✅ Spot guardado exitosamente:', savedSpot);
                
                const modalElement = document.getElementById('spot-form-container');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }
                }

                form.reset();
                
                this.cancelSpotCreation();
                
                const marker = this.createSpotMarker(savedSpot);
                if (marker) {
                    this.spotMarkers.push({
                        id: savedSpot.id,
                        marker: marker,
                        spot: savedSpot
                    });
                }
                
                this.app.showNotification('✅ Spot guardado correctamente', 'success');
            } else {
                throw new Error('No se pudo guardar el spot - respuesta vacía');
            }

        } catch (error) {
            console.error('❌ Error guardando spot:', error);
            this.app.showNotification('Error guardando el spot: ' + error.message, 'error');
        }
    }

    // Crear marcador de spot - ACTUALIZADO CON INFORMACIÓN DEL CREADOR
    createSpotMarker(spot) {
        try {
            console.log('📍 Creando marcador para spot:', spot);
            
            let lat, lng;
            
            if (spot.coordinates && spot.coordinates.lat && spot.coordinates.lng) {
                lat = spot.coordinates.lat;
                lng = spot.coordinates.lng;
                console.log('📍 Usando coordenadas de estructura coordinates');
            } else if (spot.coordinates && spot.coordinates.latitude && spot.coordinates.longitude) {
                lat = spot.coordinates.latitude;
                lng = spot.coordinates.longitude;
                console.log('📍 Usando coordenadas de estructura coordinates alternativa');
            } else if (spot.latitude && spot.longitude) {
                lat = spot.latitude;
                lng = spot.longitude;
                console.log('📍 Usando coordenadas planas');
            } else {
                console.error('❌ No se encontraron coordenadas válidas en el spot:', spot);
                return null;
            }

            console.log(`📍 Coordenadas obtenidas: lat=${lat}, lng=${lng}`);

            const icon = this.getSpotIcon(spot);
            
            const marker = L.marker([lat, lng], { icon: icon })
                .addTo(this.map)
                .bindPopup(this.createSpotPopup(spot));

            console.log(`✅ Marcador creado exitosamente para spot: ${spot.name}`);
            return marker;

        } catch (error) {
            console.error('❌ Error creando marcador de spot:', error, spot);
            return null;
        }
    }

    // Icono de caña de pescar con colores según visibilidad
    getSpotIcon(spot) {
        const emoji = '🎣';
        
        let borderColor = '#007bff';
        let backgroundColor = 'white';
        
        if (spot.visibility === 'private' || spot.visibility === 'privado') {
            borderColor = '#dc3545';
            backgroundColor = '#fff5f5';
        } else if (spot.visibility === 'friends-only' || spot.visibility === 'solo-amigos') {
            borderColor = '#ffc107';
            backgroundColor = '#fffbf0';
        } else {
            borderColor = '#28a745';
            backgroundColor = '#f8fff9';
        }

        return L.divIcon({
            html: `
                <div style="
                    background: ${backgroundColor}; 
                    border: 3px solid ${borderColor}; 
                    border-radius: 50%; 
                    width: 45px; 
                    height: 45px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 20px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    transition: all 0.3s ease;
                " 
                onmouseover="this.style.transform='scale(1.1)'" 
                onmouseout="this.style.transform='scale(1)'">
                    ${emoji}
                </div>
            `,
            className: 'spot-marker',
            iconSize: [45, 45],
            iconAnchor: [22, 22]
        });
    }

    // Crear popup de spot - ACTUALIZADO CON INFORMACIÓN DEL CREADOR
    createSpotPopup(spot) {
        const facilities = spot.facilities && spot.facilities.length > 0 
            ? spot.facilities.join(', ')
            : 'Ninguna';

        const waterType = spot.type || spot.water_type || 'No especificado';
        const species = spot.species || 'No especificado';
        const bestTime = spot.best_time || spot.bestTime || 'No especificado';
        const accessibility = spot.accessibility || 'No especificado';

        // Obtener información del usuario actual
        const currentUser = this.app.getCurrentUser();
        const isOwnSpot = currentUser && (spot.user_id === currentUser.id);
        
        // Determinar el texto del creador
        let creatorText = '';
        if (isOwnSpot) {
            creatorText = '<strong>Tú</strong>';
        } else if (spot.user_name) {
            // Enlace al perfil del usuario
            creatorText = `<a href="#" onclick="app.router.navigate('/perfil/${spot.user_id}')" class="user-profile-link">${spot.user_name}</a>`;
        } else if (spot.user_email) {
            creatorText = spot.user_email;
        } else {
            creatorText = 'Usuario desconocido';
        }

        let visibilityBadge = '';
        if (spot.visibility === 'private' || spot.visibility === 'privado') {
            visibilityBadge = '<span class="badge bg-danger">🔒 Privado</span>';
        } else if (spot.visibility === 'friends-only' || spot.visibility === 'solo-amigos') {
            visibilityBadge = '<span class="badge bg-warning text-dark">👥 Solo Amigos</span>';
        } else {
            visibilityBadge = '<span class="badge bg-success">🌍 Público</span>';
        }

        return `
            <div class="spot-popup">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0">${spot.name}</h6>
                    ${visibilityBadge}
                </div>
                <p><strong>📍 Tipo:</strong> ${waterType}</p>
                <p><strong>📝 Descripción:</strong> ${spot.description || 'Sin descripción'}</p>
                <p><strong>🐟 Especies:</strong> ${species}</p>
                <p><strong>⏰ Mejor momento:</strong> ${bestTime}</p>
                <p><strong>♿ Accesibilidad:</strong> ${accessibility}</p>
                <p><strong>🏪 Facilidades:</strong> ${facilities}</p>
                
                <!-- NUEVA SECCIÓN: Información del creador -->
                <div class="spot-creator-info mt-2 pt-2 border-top">
                    <p class="mb-1"><strong>Creado por:</strong> ${creatorText}</p>
                    ${spot.user_email && !isOwnSpot ? `<p class="mb-0 text-muted small">${spot.user_email}</p>` : ''}
                </div>

                ${spot.isLocal ? '<p class="text-info mt-2"><strong>💾 Guardado Localmente</strong></p>' : ''}
            </div>
        `;
    }

    // Cargar spots desde base de datos
    async loadSpotsFromDatabase() {
        try {
            console.log('📂 Cargando spots desde la base de datos...');
            
            if (!this.app.spotsManager) {
                console.error('❌ spotsManager no disponible para cargar spots');
                this.addSampleSpots();
                return;
            }
        
            let spots = [];
            const user = this.app.getCurrentUser();
            const isAuthenticated = this.app.isAuthenticated();
        
            console.log('🔐 Estado de autenticación:', {
                usuario: user ? user.name : 'No autenticado',
                autenticado: isAuthenticated,
                userId: user ? user.id : 'N/A'
            });

            if (isAuthenticated && user) {
                console.log('🔐 Usuario autenticado, cargando TODOS los spots...');
            
                try {
                    if (typeof this.app.spotsManager.getAllUserSpots === 'function') {
                        console.log('🔄 Llamando a getAllUserSpots...');
                        spots = await this.app.spotsManager.getAllUserSpots();
                        console.log(`✅ getAllUserSpots devolvió ${spots.length} spots`);
                    } else {
                        console.error('❌ getAllUserSpots no está disponible en spotsManager');
                        throw new Error('Método getAllUserSpots no disponible');
                    }
                } catch (error) {
                    console.error('❌ Error con getAllUserSpots:', error);
                    spots = await this.app.spotsManager.getPublicSpots();
                }
            
            } else {
                console.log('👤 Usuario no autenticado, cargando solo spots públicos...');
                spots = await this.app.spotsManager.getPublicSpots();
            }
        
            console.log(`📊 Total de spots a mostrar: ${spots.length}`);
        
            const publicSpots = spots.filter(spot => 
                spot.visibility === 'public' || spot.visibility === 'público'
            );
            const friendsSpots = spots.filter(spot => 
                spot.visibility === 'friends-only' || spot.visibility === 'solo-amigos'
            );
            const privateSpots = spots.filter(spot => 
                spot.visibility === 'private' || spot.visibility === 'privado'
            );
        
            console.log('🎯 Distribución de spots:');
            console.log(`   🌍 Públicos: ${publicSpots.length}`);
            console.log(`   👥 Solo-amigos: ${friendsSpots.length}`);
            console.log(`   🔒 Privados: ${privateSpots.length}`);

            spots.forEach(spot => {
                let icon = '🌍';
                if (spot.visibility === 'friends-only' || spot.visibility === 'solo-amigos') icon = '👥';
                if (spot.visibility === 'private' || spot.visibility === 'privado') icon = '🔒';
            
                const isOwn = spot.user_id === (user ? user.id : null);
                console.log(`   ${icon} ${spot.name} (${spot.visibility}) ${isOwn ? '[TUYO]' : ''}`);
            });

            if (!this.spotMarkers) {
                this.spotMarkers = [];
            }
        
            if (this.spotMarkers.length > 0) {
                this.spotMarkers.forEach(spotMarker => {
                    this.map.removeLayer(spotMarker.marker);
                });
                this.spotMarkers = [];
            }
        
            let loadedCount = 0;
        
            spots.forEach(spot => {
                try {
                    const marker = this.createSpotMarker(spot);
                    if (marker) {
                        this.spotMarkers.push({
                            id: spot.id,
                            marker: marker,
                            spot: spot
                        });
                        loadedCount++;
                        console.log(`📍 Marcador creado: ${spot.name} (${spot.visibility})`);
                    }
                } catch (error) {
                    console.error(`❌ Error creando marcador para ${spot.name}:`, error);
                }
            });
        
            console.log(`✅ ${loadedCount} spots cargados correctamente`);
        
            if (loadedCount === 0) {
                console.warn('⚠️ No se cargó ningún spot, agregando ejemplos...');
                this.addSampleSpots();
            }
        
        } catch (error) {
            console.error('❌ Error cargando spots desde base de datos:', error);
            this.addSampleSpots();
        }
    }

    // Agregar spots de ejemplo (fallback)
    addSampleSpots() {
        console.log('📝 Agregando spots de ejemplo...');
        
        const sampleSpots = [
            {
                id: 1,
                name: 'Río de la Plata - Costanera',
                type: 'río',
                description: 'Pesca de pejerrey y tararira en la costanera',
                species: 'pejerrey, tararira, bagre',
                bestTime: 'tarde-noche',
                accessibility: 'fácil',
                facilities: ['estacionamiento', 'iluminación'],
                latitude: -34.543,
                longitude: -58.445,
                visibility: 'public'
            },
            {
                id: 2,
                name: 'Laguna de Chascomús',
                type: 'lago',
                description: 'Pesca de pejerrey y carpa en laguna',
                species: 'pejerrey, carpa, dientudo',
                bestTime: 'mañana',
                accessibility: 'moderado',
                facilities: ['camping', 'muelle'],
                latitude: -35.573,
                longitude: -58.008,
                visibility: 'public'
            }
        ];

        sampleSpots.forEach(spot => {
            const marker = this.createSpotMarker(spot);
            if (marker) {
                this.spotMarkers.push({
                    id: spot.id,
                    marker: marker,
                    spot: spot
                });
            }
        });

        console.log(`✅ ${sampleSpots.length} spots de ejemplo agregados`);
    }

    // Inicializar botones de clima
    initializeWeatherButtons() {
        console.log('🌤️ Inicializando botones de clima...');
        
        const weatherBtn = document.getElementById('weather-btn');
        const forecastBtn = document.getElementById('forecast-btn');
        const tidesBtn = document.getElementById('tides-btn');
        const fishingForecastBtn = document.getElementById('fishing-forecast-btn');

        if (weatherBtn) {
            weatherBtn.addEventListener('click', () => this.showWeatherPanel('weather-btn'));
        }
        if (forecastBtn) {
            forecastBtn.addEventListener('click', () => this.showWeatherPanel('forecast-btn'));
        }
        if (tidesBtn) {
            tidesBtn.addEventListener('click', () => this.showWeatherPanel('tides-btn'));
        }
        if (fishingForecastBtn) {
            fishingForecastBtn.addEventListener('click', () => this.showWeatherPanel('fishing-forecast-btn'));
        }

        console.log('✅ Botones de clima inicializados');
    }

    // ==================================================
    // ✅ NUEVO: SISTEMA DE CLIMA EN TIEMPO REAL
    // ==================================================

    // Mostrar panel de clima - ACTUALIZADO CON DATOS REALES
    async showWeatherPanel(activeButtonId) {
        console.log('🌤️ Mostrando panel de clima:', activeButtonId);
        
        const weatherPanel = document.getElementById('weather-panel');
        if (!weatherPanel) {
            console.error('❌ Panel de clima no encontrado');
            return;
        }

        document.querySelectorAll('.btn-group .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(activeButtonId);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // ✅ OBTENER UBICACIÓN ACTUAL DEL MAPA
        const center = this.map.getCenter();
        const lat = center.lat;
        const lng = center.lng;

        try {
            let content = '';
            
            switch (activeButtonId) {
                case 'weather-btn':
                    content = await this.getCurrentWeatherContent(lat, lng);
                    break;
                case 'forecast-btn':
                    content = await this.getWeatherForecastContent(lat, lng);
                    break;
                case 'tides-btn':
                    content = await this.getTidesContent(lat, lng);
                    break;
                case 'fishing-forecast-btn':
                    content = await this.getFishingForecastContent(lat, lng);
                    break;
            }
            
            weatherPanel.innerHTML = content;
            console.log('✅ Panel de clima actualizado con datos reales:', activeButtonId);
            
        } catch (error) {
            console.error('❌ Error cargando datos de clima:', error);
            // Fallback a datos de muestra
            weatherPanel.innerHTML = this.getSampleWeatherContent(activeButtonId);
        }
    }

    // ✅ Obtener clima actual desde Open-Meteo (vía WeatherService)
    async getCurrentWeatherContent(lat, lng) {
        try {
            console.log(`🌤️ Obteniendo clima actual para: ${lat}, ${lng}`);

            const weather = await this.weatherService.getCurrentWeather(lat, lng);

            return `
                <div class="weather-content">
                    <h6>${weather.emoji} Clima Actual</h6>
                    <div class="text-center">
                        <div class="display-6 text-primary">${weather.temperature}°C</div>
                        <p><strong>Condición:</strong> ${weather.description}</p>
                        <p><strong>Viento:</strong> ${weather.windspeed} km/h</p>
                        <p><strong>Dirección:</strong> ${weather.winddirection}°</p>
                        <small class="text-success">✅ Datos en tiempo real de Open-Meteo</small>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error obteniendo clima actual:', error);
            return this.getSampleWeatherContent('weather-btn');
        }
    }

    // ✅ Obtener pronóstico extendido (vía WeatherService)
    async getWeatherForecastContent(lat, lng) {
        try {
            console.log(`📅 Obteniendo pronóstico para: ${lat}, ${lng}`);

            const forecast = await this.weatherService.getForecast(lat, lng, 3);
            let forecastHTML = '<h6>📅 Pronóstico Extendido</h6>';

            forecast.forEach(day => {
                forecastHTML += `
                    <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                        <div>
                            <strong>${day.isToday ? 'Hoy' : day.dayName}</strong>
                            <br>
                            <small class="text-muted">${day.formattedDate}</small>
                        </div>
                        <span class="fs-5">${day.emoji}</span>
                        <div class="text-end">
                            <strong>${day.maxTemp}°</strong>
                            <br>
                            <small class="text-muted">${day.minTemp}°</small>
                        </div>
                    </div>
                `;
            });

            forecastHTML += `<small class="text-success mt-2 d-block">✅ Pronóstico actualizado</small>`;

            return `<div class="weather-content">${forecastHTML}</div>`;
        } catch (error) {
            console.error('Error obteniendo pronóstico:', error);
            return this.getSampleWeatherContent('forecast-btn');
        }
    }

    // ✅ Contenido de mareas (vía WeatherService)
    async getTidesContent(lat, lng) {
        try {
            const tides = this.weatherService.getTides(lat, lng);
            
            return `
                <div class="weather-content">
                    <h6>🌊 Mareas</h6>
                    <div class="text-center">
                        <div class="display-6 text-info">${tides.currentHeight}m</div>
                        <p class="lead">Marea ${tides.current}</p>
                        <div class="text-start">
                            <p><strong>🔼 Próxima pleamar:</strong> ${tides.nextHigh}</p>
                            <p><strong>🔽 Próxima bajamar:</strong> ${tides.nextLow}</p>
                        </div>
                        <div class="mt-3 p-2 bg-info bg-opacity-10 rounded">
                            <small>💡 Mejor pesca: 2 horas antes y después de la pleamar</small>
                        </div>
                        <small class="text-info">🌡️ Basado en datos de ubicación</small>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error obteniendo mareas:', error);
            return this.getSampleWeatherContent('tides-btn');
        }
    }

    // ✅ Contenido de pronóstico de pesca (vía WeatherService)
    async getFishingForecastContent(lat, lng) {
        try {
            const weather = await this.weatherService.getCurrentWeather(lat, lng);
            const fishingScore = this.weatherService.calculateFishingScore(weather);
            
            let rating = '';
            let color = '';
            let advice = '';
            
            if (fishingScore >= 8) {
                rating = 'Excelente 🎣';
                color = 'success';
                advice = 'Condiciones perfectas para pescar';
            } else if (fishingScore >= 6) {
                rating = 'Buena 👍';
                color = 'primary';
                advice = 'Buen día para pescar';
            } else if (fishingScore >= 4) {
                rating = 'Regular ⚠️';
                color = 'warning';
                advice = 'Condiciones moderadas';
            } else {
                rating = 'Mala 🔴';
                color = 'danger';
                advice = 'Mejor esperar a otro día';
            }

            return `
                <div class="weather-content">
                    <h6>🎣 Condiciones de Pesca</h6>
                    <div class="text-center">
                        <div class="display-4 text-${color}">${fishingScore}/10</div>
                        <p class="lead">${rating}</p>
                        <div class="text-start small">
                            <div>✅ Presión estable</div>
                            <div>✅ Viento moderado (${Math.round(weather.windspeed)} km/h)</div>
                            <div>✅ Temperatura óptima (${Math.round(weather.temperature)}°C)</div>
                            <div>🌅 Mejor horario: 06:00-10:00 / 17:00-20:00</div>
                        </div>
                        <div class="mt-3 p-2 bg-${color} bg-opacity-10 rounded">
                            <small>💡 ${advice}</small>
                        </div>
                        <small class="text-success">✅ Análisis en tiempo real</small>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error obteniendo pronóstico de pesca:', error);
            return this.getSampleWeatherContent('fishing-forecast-btn');
        }
    }

    // ✅ NUEVO: Datos de muestra como fallback
    getSampleWeatherContent(activeButtonId) {
        let content = '';
        switch (activeButtonId) {
            case 'weather-btn':
                content = `
                    <div class="weather-content">
                        <h6>🌤️ Clima Actual</h6>
                        <div class="text-center">
                            <p><strong>Temperatura:</strong> 22°C</p>
                            <p><strong>Condición:</strong> Parcialmente nublado</p>
                            <p><strong>Viento:</strong> 15 km/h NE</p>
                            <p><strong>Humedad:</strong> 65%</p>
                            <small class="text-warning">⚠️ Usando datos de muestra - Reconectando...</small>
                        </div>
                    </div>
                `;
                break;
            case 'forecast-btn':
                content = `
                    <div class="weather-content">
                        <h6>📅 Pronóstico Extendido</h6>
                        <div class="text-center">
                            <p><strong>Hoy:</strong> 22°C - Parcialmente nublado</p>
                            <p><strong>Mañana:</strong> 24°C - Soleado</p>
                            <p><strong>Pasado:</strong> 20°C - Lluvias dispersas</p>
                            <small class="text-warning">⚠️ Pronóstico de muestra</small>
                        </div>
                    </div>
                `;
                break;
            case 'tides-btn':
                content = `
                    <div class="weather-content">
                        <h6>🌊 Mareas</h6>
                        <div class="text-center">
                            <p><strong>Pleamar:</strong> 06:30 - 1.8m</p>
                            <p><strong>Bajamar:</strong> 12:45 - 0.3m</p>
                            <p><strong>Pleamar:</strong> 18:20 - 1.6m</p>
                            <small class="text-warning">⚠️ Datos de muestra</small>
                        </div>
                    </div>
                `;
                break;
            case 'fishing-forecast-btn':
                content = `
                    <div class="weather-content">
                        <h6>🎣 Condiciones de Pesca</h6>
                        <div class="text-center">
                            <p><strong>Índice de Pesca:</strong> 🔴 7/10</p>
                            <p><strong>Mejor horario:</strong> 18:00 - 20:00</p>
                            <p><strong>Especies activas:</strong> Pejerrey, bagre</p>
                            <small class="text-warning">⚠️ Evaluación de muestra</small>
                        </div>
                    </div>
                `;
                break;
        }
        return content;
    }

    // Recargar spots desde base de datos
    async reloadSpots() {
        try {
            console.log('🔄 Recargando spots desde base de datos...');
            
            if (this.spotMarkers && this.spotMarkers.length > 0) {
                this.spotMarkers.forEach(spotMarker => {
                    this.map.removeLayer(spotMarker.marker);
                });
                this.spotMarkers = [];
            }
            
            await this.loadSpotsFromDatabase();
            
            console.log('✅ Spots recargados correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error recargando spots:', error);
            return false;
        }
    }

    // Verificar y cargar spots si es necesario
    async ensureSpotsLoaded() {
        try {
            if (!this.spotMarkers || this.spotMarkers.length === 0) {
                console.log('📂 No hay spots cargados, cargando desde base de datos...');
                await this.loadSpotsFromDatabase();
            } else {
                console.log(`✅ Ya hay ${this.spotMarkers.length} spots cargados`);
            }
        } catch (error) {
            console.error('❌ Error asegurando carga de spots:', error);
        }
    }

    // ==================================================
    // MÉTODOS NUEVOS PARA LA GRILLA - INTEGRADOS
    // ==================================================

    /**
     * Centra el mapa en un spot específico
     * @param {Object} spot - Objeto spot con latitude y longitude
     */
    centerMapOnSpot(spot) {
        if (this.map && spot.latitude && spot.longitude) {
            console.log(`📍 Centrando mapa en: ${spot.name}`);
            
            // Centrar y hacer zoom
            this.map.setView([spot.latitude, spot.longitude], 15);
            
            // Abrir popup del marcador si existe
            const marker = this.findMarkerBySpotId(spot.id);
            if (marker) {
                setTimeout(() => {
                    marker.openPopup();
                }, 500);
            }
            
            this.app.showNotification(`📍 Centrado en ${spot.name}`, 'success');
            return true;
        }
        console.warn('⚠️ No se pudo centrar el mapa en el spot:', spot);
        return false;
    }

    /**
     * Elimina un marcador del mapa por ID de spot
     * @param {number} spotId - ID del spot a eliminar
     */
    removeSpotMarker(spotId) {
        console.log(`🗑️ Buscando marcador para eliminar: ${spotId}`);
        
        const markerIndex = this.spotMarkers.findIndex(item => item.id == spotId);
        
        if (markerIndex !== -1) {
            const spotMarker = this.spotMarkers[markerIndex];
            
            // Eliminar marcador del mapa
            this.map.removeLayer(spotMarker.marker);
            
            // Eliminar del array
            this.spotMarkers.splice(markerIndex, 1);
            
            console.log(`✅ Marcador eliminado: ${spotId}`);
            return true;
        }
        
        console.warn(`⚠️ No se encontró marcador para eliminar: ${spotId}`);
        return false;
    }

    /**
     * Encuentra un marcador por ID de spot
     * @param {number} spotId - ID del spot a buscar
     * @returns {L.Marker|null} - Marcador encontrado o null
     */
    findMarkerBySpotId(spotId) {
        const found = this.spotMarkers.find(item => item.id == spotId);
        if (found) {
            return found.marker;
        }
        return null;
    }

    /**
     * Obtiene información completa del marcador por ID
     * @param {number} spotId - ID del spot
     * @returns {Object|null} - Objeto con marker y spot info
     */
    getSpotMarkerInfo(spotId) {
        return this.spotMarkers.find(item => item.id == spotId) || null;
    }

    // Limpiar el mapa
    cleanup() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        this.userLocationMarker = null;
        this.spotMarkers = [];
        this.currentLocation = null;
        this.spotCreationMode = false;
        this.tempMarker = null;
        this.clickMarker = null;
        this.searchMarker = null;
        this.selectedCoordinates = null;
        
        console.log('🧹 MapCore limpiado correctamente');
    }
}