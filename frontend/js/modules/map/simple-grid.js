// frontend/js/modules/map/simple-grid.js
// ==================================================
// GRILLA SIMPLE - MÓDULO INDEPENDIENTE (VERSIÓN MEJORADA)
// ==================================================

export class SimpleSpotsGrid {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.isVisible = false;
        this.spots = [];
        this.isInitialized = false; // ✅ NUEVO: Trackear estado de inicialización
        console.log('🔄 Constructor de SimpleSpotsGrid llamado');
    }

    async init() {
        // ✅ EVITAR INICIALIZACIÓN MÚLTIPLE
        if (this.isInitialized) {
            console.log('⚠️ Grilla ya está inicializada, omitiendo...');
            return;
        }

        console.log('🔄 Inicializando grilla simple...');
        
        // ✅ VERIFICACIÓN DE SEGURIDAD MEJORADA
        if (!this.app.isAuthenticated()) {
            console.log('❌ Usuario no autenticado, no se inicializa la grilla');
            this.cleanup();
            this.showNotAuthenticated();
            return;
        }

        try {
            console.log('✅ Usuario autenticado, procediendo...');
            this.createContainer();
            await this.loadUserSpots();
            this.isInitialized = true; // ✅ MARCAR COMO INICIALIZADO
            console.log('✅ Grilla completamente inicializada');
        } catch (error) {
            console.error('❌ Error en inicialización de grilla:', error);
            this.isInitialized = false;
        }
    }

    createContainer() {
        // ✅ LIMPIAR CUALQUIER INSTANCIA EXISTENTE
        const existing = document.getElementById('simple-spots-grid');
        if (existing) {
            console.log('🗑️ Eliminando grilla existente...');
            existing.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'simple-spots-grid';
        this.container.className = 'simple-spots-grid';
        this.container.innerHTML = `
            <div class="grid-header">
                <h5>🎣 Mis Spots de Pesca</h5>
                <div class="grid-actions">
                    <button class="btn btn-sm btn-outline-primary" id="refresh-grid" title="Actualizar">
                        <i class="fas fa-sync-alt"></i>
                        <span class="btn-text">Actualizar</span>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" id="toggle-grid">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>
            </div>
            <div class="grid-content">
                <div id="spots-list">
                    <div class="loading-spots">
                        <div class="spinner-border spinner-border-sm text-primary"></div>
                        <p>Cargando tus spots...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
        this.setupEventListeners();
        console.log('✅ Contenedor de grilla creado');
    }

    setupEventListeners() {
        // ✅ USAR EVENT DELEGATION EN DOCUMENT PARA MAYOR COMPATIBILIDAD
        
        // Evento para el botón de actualizar
        document.addEventListener('click', (e) => {
            if (e.target.closest('#refresh-grid')) {
                console.log('🔄 Botón refresh clickeado');
                if (!this.app.isAuthenticated()) {
                    this.app.showNotification('❌ Debes iniciar sesión para actualizar spots', 'error');
                    this.showNotAuthenticated();
                    return;
                }
                console.log('🔄 Actualizando grilla manualmente...');
                this.loadUserSpots();
            }
        });

        // Evento para el botón de toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('#toggle-grid')) {
                console.log('🔘 Botón toggle clickeado');
                this.toggleVisibility();
            }
        });
    }

    removeEventListeners() {
        // ✅ LIMPIAR EVENT LISTENERS PARA EVITAR DUPLICADOS
        const refreshBtn = document.getElementById('refresh-grid');
        const toggleBtn = document.getElementById('toggle-grid');
        
        if (refreshBtn) {
            refreshBtn.replaceWith(refreshBtn.cloneNode(true));
        }
        if (toggleBtn) {
            toggleBtn.replaceWith(toggleBtn.cloneNode(true));
        }
    }

    async loadUserSpots() {
        if (!this.app.isAuthenticated()) {
            console.error('❌ Usuario no autenticado, no se pueden cargar spots');
            this.showNotAuthenticated();
            return;
        }

        try {
            console.log('📂 Llamando a spotsManager.getUserSpots()...');
            this.spots = await this.app.spotsManager.getUserSpots();
            console.log(`✅ spotsManager devolvió ${this.spots.length} spots`);
            this.renderSpots(this.spots);
        } catch (error) {
            console.error('❌ Error en loadUserSpots:', error);
            this.showError('Error cargando spots: ' + error.message);
        }
    }

    renderSpots(spots) {
        const container = document.getElementById('spots-list');
        if (!container) {
            console.error('❌ No se encontró el contenedor de spots');
            return;
        }

        if (!this.app.isAuthenticated()) {
            this.showNotAuthenticated();
            return;
        }

        if (!spots || spots.length === 0) {
            container.innerHTML = `
                <div class="no-spots">
                    <i class="fas fa-map-marker-alt text-muted"></i>
                    <p>No tienes spots guardados</p>
                    <small class="text-muted">Agrega spots en el mapa para verlos aquí</small>
                </div>
            `;
            return;
        }

        console.log('🎨 Renderizando spots en la grilla...');
        const spotsHTML = spots.map(spot => `
            <div class="grid-spot-item" data-spot-id="${spot.id}">
                <div class="spot-info">
                    <div class="spot-name">${spot.name}</div>
                    <div class="spot-details">
                        <span class="spot-type">${spot.type || spot.water_type}</span>
                        ${spot.species ? `<span class="spot-species">• ${this.truncateText(spot.species, 25)}</span>` : ''}
                    </div>
                </div>
                <div class="spot-actions">
                    <button class="btn btn-sm btn-outline-primary view-spot" data-spot-id="${spot.id}" title="Ver en mapa">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-spot" 
                            data-spot-id="${spot.id}" 
                            data-spot-name="${this.escapeHtml(spot.name)}"
                            title="Eliminar spot">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = spotsHTML;
        this.setupSpotEventListeners();
        console.log('✅ Spots renderizados en la grilla');
    }

    setupSpotEventListeners() {
        // ✅ LIMPIAR EVENT LISTENERS EXISTENTES PRIMERO
        const deleteButtons = document.querySelectorAll('.delete-spot');
        const viewButtons = document.querySelectorAll('.view-spot');
        
        deleteButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        viewButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });

        // ✅ AGREGAR NUEVOS EVENT LISTENERS
        const newDeleteButtons = document.querySelectorAll('.delete-spot');
        const newViewButtons = document.querySelectorAll('.view-spot');

        newDeleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.app.isAuthenticated()) {
                    this.app.showNotification('❌ Debes iniciar sesión para eliminar spots', 'error');
                    return;
                }
                const spotId = e.currentTarget.getAttribute('data-spot-id');
                const spotName = e.currentTarget.getAttribute('data-spot-name');
                this.deleteSpot(spotId, spotName);
            });
        });

        newViewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.app.isAuthenticated()) {
                    this.app.showNotification('❌ Debes iniciar sesión para ver spots', 'error');
                    return;
                }
                const spotId = e.currentTarget.getAttribute('data-spot-id');
                this.viewSpot(spotId);
            });
        });
    }

    async deleteSpot(spotId, spotName) {
        // ✅ DOBLE VERIFICACIÓN DE SEGURIDAD
        if (!this.app.isAuthenticated()) {
            this.app.showNotification('❌ Debes iniciar sesión para eliminar spots', 'error');
            return;
        }

        console.log(`🗑️ INICIANDO ELIMINACIÓN - Spot ID: ${spotId}`);
        
        if (!confirm(`¿Estás seguro de eliminar el spot "${spotName}"?\n\nEsta acción no se puede deshacer.`)) {
            console.log('❌ Eliminación cancelada por el usuario');
            return;
        }

        try {
            console.log(`1️⃣ Llamando a spotsManager.deleteSpot(${spotId})...`);
            this.app.showNotification('🔄 Eliminando spot...', 'info');
            
            const success = await this.app.spotsManager.deleteSpot(spotId);
            
            console.log(`2️⃣ Resultado de deleteSpot:`, success);
            
            if (success) {
                console.log('✅ Spot eliminado exitosamente del backend');
                
                // Remover de la lista local
                this.spots = this.spots.filter(spot => spot.id != spotId);
                console.log(`3️⃣ Spots después de filtrar: ${this.spots.length}`);
                
                // Volver a renderizar
                this.renderSpots(this.spots);
                
                this.app.showNotification('✅ Spot eliminado correctamente', 'success');
                
                // Actualizar mapa si existe
                if (this.app.mapCore && this.app.mapCore.removeSpotMarker) {
                    console.log('🗺️ Eliminando marcador del mapa...');
                    this.app.mapCore.removeSpotMarker(spotId);
                }
            } else {
                console.error('❌ deleteSpot devolvió false');
                throw new Error('No se pudo eliminar el spot - respuesta falsa');
            }
        } catch (error) {
            console.error('❌ ERROR en deleteSpot:', error);
            this.app.showNotification('❌ Error eliminando spot: ' + error.message, 'error');
        }
    }

    async viewSpot(spotId) {
        // ✅ VERIFICAR AUTENTICACIÓN
        if (!this.app.isAuthenticated()) {
            this.app.showNotification('❌ Debes iniciar sesión para ver spots', 'error');
            return;
        }

        console.log(`📍 Intentando visualizar spot ${spotId}...`);
        
        const spot = this.findSpotById(spotId);
        if (!spot) {
            console.error('❌ No se pudo encontrar el spot con ID:', spotId);
            this.app.showNotification('Error: No se pudo encontrar el spot', 'error');
            return;
        }

        console.log('🔍 Spot encontrado:', spot);

        if (!spot.latitude || !spot.longitude) {
            console.error('❌ El spot no tiene coordenadas válidas:', spot);
            this.app.showNotification('Error: El spot no tiene coordenadas válidas', 'error');
            return;
        }

        // Guardar el spot para usar después de navegar al mapa
        sessionStorage.setItem('spotToView', JSON.stringify(spot));
        
        // Navegar al mapa
        console.log('🗺️ Navegando a la página del mapa...');
        this.app.router.navigate('/mapa');
        
        this.app.showNotification('📍 Navegando al mapa...', 'info');
    }

    findSpotById(spotId) {
        if (!this.spots || !this.spots.length) {
            console.log('📂 No hay spots cargados en la grilla');
            return null;
        }
        
        const spot = this.spots.find(s => s.id == spotId);
        if (!spot) {
            console.log('🔍 Spot no encontrado en this.spots');
        }
        return spot;
    }

    toggleVisibility() {
        // ✅ Obtener el contenedor directamente del DOM
        const container = document.getElementById('simple-spots-grid');
        if (!container) {
            console.error('❌ Contenedor de grilla no encontrado');
            return;
        }

        const content = container.querySelector('.grid-content');
        const icon = container.querySelector('#toggle-grid i');
        
        if (!content) {
            console.error('❌ grid-content no encontrado');
            return;
        }

        if (this.isVisible) {
            content.style.display = 'none';
            if (icon) icon.className = 'fas fa-chevron-down';
            this.isVisible = false;
            console.log('📦 Grilla contraída');
        } else {
            content.style.display = 'block';
            if (icon) icon.className = 'fas fa-chevron-up';
            this.isVisible = true;
            console.log('👁️ Grilla expandida');
        }
    }

    showError(message) {
        const container = document.getElementById('spots-list');
        container.innerHTML = `
            <div class="error-spots">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <p>${message}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="app.simpleGrid.loadUserSpots()">
                    Reintentar
                </button>
            </div>
        `;
    }

    showNotAuthenticated() {
        const container = document.getElementById('spots-list');
        if (container) {
            container.innerHTML = `
                <div class="not-authenticated">
                    <i class="fas fa-exclamation-triangle text-warning"></i>
                    <p>Debes iniciar sesión para ver tus spots</p>
                    <button class="btn btn-sm btn-primary" onclick="app.router.goTo('/auth')">
                        Iniciar Sesión
                    </button>
                </div>
            `;
        }
    }

    // Utilidades
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ✅ CLEANUP MEJORADO
    cleanup() {
        console.log('🧹 Limpiando grilla completamente...');
        
        // 1. Remover contenedor del DOM
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        // 2. Limpiar datos y estado
        this.spots = [];
        this.isVisible = false;
        this.isInitialized = false; // ✅ RESETEAR ESTADO DE INICIALIZACIÓN
        
        // 3. Limpiar event listeners globales
        this.removeEventListeners();
        
        console.log('✅ Grilla completamente limpiada');
    }

    // ✅ NUEVO MÉTODO: Forzar reinicialización
    async reinitialize() {
        console.log('🔄 Reinicializando grilla forzadamente...');
        this.cleanup();
        await this.init();
    }
}