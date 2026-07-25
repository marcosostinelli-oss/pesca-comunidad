// ==================================================
// MÓDULO DE GRILLA DE SPOTS DEL USUARIO - MEJORADO
// ==================================================

export class SpotsGrid {
    constructor(app, mapCore) {
        this.app = app;
        this.mapCore = mapCore;
        this.container = null;
        this.gridElement = null;
        this.userSpots = [];
        this.isVisible = true;
    }

    // Inicializar la grilla
    async init() {
        console.log('🔄 Inicializando grilla de spots en mapa...');
        this.createContainer();
        await this.loadUserSpots();
        this.setupEventListeners();
    }

    // Crear el contenedor de la grilla EN LA PARTE INFERIOR
    createContainer() {
        // Verificar si ya existe
        this.container = document.getElementById('user-spots-grid-container');
        if (this.container) {
            this.container.remove();
        }

        // Crear nuevo contenedor EN LA PARTE INFERIOR
        this.container = document.createElement('div');
        this.container.id = 'user-spots-grid-container';
        this.container.className = 'user-spots-grid-container';
        
        // Insertar en el DOM - AL FINAL DEL BODY para que esté en la parte inferior
        document.body.appendChild(this.container);

        this.container.innerHTML = `
            <div class="spots-grid-header">
                <h4><i class="fas fa-map-marker-alt me-2"></i>Mis Spots de Pesca</h4>
                <div class="spots-grid-actions">
                    <button class="btn btn-sm btn-outline-primary" id="refresh-spots-grid">
                        <i class="fas fa-sync-alt me-1"></i>Actualizar
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" id="toggle-spots-grid">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>
            </div>
            <div class="spots-grid-content">
                <div class="spots-grid" id="spots-grid">
                    <div class="loading-spots">
                        <div class="loading-spinner"></div>
                        <p>Cargando tus spots...</p>
                    </div>
                </div>
            </div>
        `;

        this.gridElement = document.getElementById('spots-grid');
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botón de actualizar
        const refreshBtn = document.getElementById('refresh-spots-grid');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadUserSpots());
        }

        // Botón de toggle (mostrar/ocultar)
        const toggleBtn = document.getElementById('toggle-spots-grid');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleGrid());
        }
    }

    // Alternar visibilidad de la grilla
    toggleGrid() {
        this.isVisible = !this.isVisible;
        const content = this.container.querySelector('.spots-grid-content');
        const toggleIcon = this.container.querySelector('#toggle-spots-grid i');
        
        if (this.isVisible) {
            content.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
        } else {
            content.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }

    // Cargar spots del usuario
    async loadUserSpots() {
        try {
            console.log('📂 Cargando spots para la grilla...');
            
            if (!this.app.isAuthenticated()) {
                this.showNotAuthenticated();
                return;
            }

            this.showLoading();

            const spots = await this.app.spotsManager.getUserSpots();
            this.userSpots = spots;
            
            console.log(`✅ ${spots.length} spots cargados para la grilla`);
            this.renderSpots(spots);

        } catch (error) {
            console.error('❌ Error cargando spots para la grilla:', error);
            this.showError('Error cargando spots. Intenta recargar.');
        }
    }

    // Mostrar loading
    showLoading() {
        if (this.gridElement) {
            this.gridElement.innerHTML = `
                <div class="loading-spots">
                    <div class="loading-spinner"></div>
                    <p>Cargando tus spots...</p>
                </div>
            `;
        }
    }

    // Mostrar error
    showError(message) {
        if (this.gridElement) {
            this.gridElement.innerHTML = `
                <div class="error-spots">
                    <i class="fas fa-exclamation-triangle text-warning mb-2"></i>
                    <p>${message}</p>
                    <button class="btn btn-sm btn-outline-primary" onclick="app.spotsGrid.loadUserSpots()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    // Mostrar no autenticado
    showNotAuthenticated() {
        if (this.gridElement) {
            this.gridElement.innerHTML = `
                <div class="not-authenticated">
                    <i class="fas fa-user-slash text-muted mb-2"></i>
                    <p>Inicia sesión para ver tus spots</p>
                    <button class="btn btn-sm btn-primary" onclick="app.auth.showAuthModal()">
                        <i class="fas fa-sign-in-alt me-1"></i>Iniciar Sesión
                    </button>
                </div>
            `;
        }
    }

    // Renderizar spots en la grilla - MEJORADO para más compacto
    renderSpots(spots) {
        if (!spots || spots.length === 0) {
            this.gridElement.innerHTML = `
                <div class="no-spots">
                    <i class="fas fa-map-marker-alt text-muted mb-2"></i>
                    <h5>No tienes spots guardados</h5>
                    <p>Agrega algunos spots en el mapa para verlos aquí</p>
                </div>
            `;
            return;
        }

        const spotsHTML = spots.map(spot => this.createSpotCard(spot)).join('');
        this.gridElement.innerHTML = spotsHTML;

        // Agregar event listeners a los botones de eliminar
        this.addDeleteEventListeners();
    }

    // Crear tarjeta de spot - VERSIÓN COMPACTA para grilla
    createSpotCard(spot) {
        const waterType = spot.type || spot.water_type || 'No especificado';
        const species = spot.species ? (spot.species.length > 30 ? spot.species.substring(0, 30) + '...' : spot.species) : 'No especificado';
        
        // Badge de visibilidad
        let visibilityBadge = '';
        if (spot.visibility === 'private' || spot.visibility === 'privado') {
            visibilityBadge = '<span class="badge bg-danger">🔒</span>';
        } else if (spot.visibility === 'friends-only' || spot.visibility === 'solo-amigos') {
            visibilityBadge = '<span class="badge bg-warning text-dark">👥</span>';
        } else {
            visibilityBadge = '<span class="badge bg-success">🌍</span>';
        }

        return `
            <div class="spot-card-compact" data-spot-id="${spot.id}">
                <div class="spot-card-header-compact">
                    <div class="spot-info-compact">
                        <h6 class="spot-name-compact">${spot.name}</h6>
                        <div class="spot-meta-compact">
                            <span class="water-type">${waterType}</span>
                            ${visibilityBadge}
                        </div>
                    </div>
                    <div class="spot-actions-compact">
                        <button class="btn btn-sm btn-outline-primary view-spot-btn" 
                                data-spot-id="${spot.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-spot-btn" 
                                data-spot-id="${spot.id}" 
                                data-spot-name="${spot.name}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="spot-card-body-compact">
                    <div class="spot-details-compact">
                        <small class="text-muted">
                            <i class="fas fa-fish me-1"></i>${species}
                        </small>
                        ${spot.accessibility ? `
                        <small class="text-muted ms-2">
                            <i class="fas fa-wheelchair me-1"></i>${spot.accessibility}
                        </small>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Agregar event listeners para eliminar y ver
    addDeleteEventListeners() {
        // Botones de eliminar
        const deleteButtons = this.gridElement.querySelectorAll('.delete-spot-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spotId = e.currentTarget.getAttribute('data-spot-id');
                const spotName = e.currentTarget.getAttribute('data-spot-name');
                this.confirmDeleteSpot(spotId, spotName);
            });
        });

        // Botones de ver (centrar mapa en el spot)
        const viewButtons = this.gridElement.querySelectorAll('.view-spot-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spotId = e.currentTarget.getAttribute('data-spot-id');
                this.viewSpotOnMap(spotId);
            });
        });
    }

    // Centrar mapa en el spot
    viewSpotOnMap(spotId) {
        const spot = this.userSpots.find(s => s.id == spotId);
        if (spot && this.mapCore) {
            this.mapCore.centerMapOnSpot(spot);
            this.app.showNotification(`📍 Centrado en ${spot.name}`, 'info');
        }
    }

    // Confirmar eliminación de spot - MEJORADO con modal más claro
    confirmDeleteSpot(spotId, spotName) {
        // Usar el sistema de modales de la app si existe, sino crear uno simple
        if (this.app.modals && this.app.modals.confirm) {
            this.app.modals.confirm(
                `¿Eliminar spot "${spotName}"?`,
                'Esta acción no se puede deshacer. El spot se eliminará permanentemente.',
                'Eliminar',
                'danger'
            ).then((confirmed) => {
                if (confirmed) {
                    this.executeDeleteSpot(spotId);
                }
            });
        } else {
            // Modal de respaldo
            const modalHTML = `
                <div class="modal fade" id="deleteSpotModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title text-danger">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    Confirmar Eliminación
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>¿Estás seguro de que deseas eliminar el spot <strong>"${spotName}"</strong>?</p>
                                <p class="text-muted small">Esta acción no se puede deshacer. El spot se eliminará permanentemente.</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="fas fa-times me-1"></i>Cancelar
                                </button>
                                <button type="button" class="btn btn-danger" id="confirmDeleteSpotBtn">
                                    <i class="fas fa-trash me-1"></i>Eliminar Permanentemente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remover modal existente
            const existingModal = document.getElementById('deleteSpotModal');
            if (existingModal) existingModal.remove();
            
            // Agregar nuevo modal
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('deleteSpotModal'));
            modal.show();
            
            // Configurar evento de confirmación
            document.getElementById('confirmDeleteSpotBtn').onclick = () => {
                modal.hide();
                this.executeDeleteSpot(spotId);
            };
            
            // Limpiar modal al cerrar
            document.getElementById('deleteSpotModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        }
    }

    // Ejecutar eliminación del spot
    async executeDeleteSpot(spotId) {
        try {
            console.log(`🗑️ Eliminando spot: ${spotId}`);
            
            // Mostrar loading
            this.app.showNotification('🔄 Eliminando spot...', 'info');
            
            // Eliminar spot
            const success = await this.app.spotsManager.deleteSpot(spotId);
            
            if (success) {
                console.log('✅ Spot eliminado exitosamente');
                
                // Actualizar grilla
                await this.loadUserSpots();
                
                // Actualizar mapa - remover marcador
                if (this.mapCore && this.mapCore.removeSpotMarker) {
                    this.mapCore.removeSpotMarker(spotId);
                }
                
                this.app.showNotification('✅ Spot eliminado correctamente', 'success');
            } else {
                throw new Error('No se pudo eliminar el spot');
            }

        } catch (error) {
            console.error('❌ Error eliminando spot:', error);
            this.app.showNotification('❌ Error eliminando el spot: ' + error.message, 'error');
        }
    }

    // Limpiar grilla
    cleanup() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.gridElement = null;
        this.userSpots = [];
    }
}