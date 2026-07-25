import { MapCore } from '../modules/map/map-core.js';
import { SpotsGrid } from '../modules/map/spots-grid.js';
console.log('📍 MapPage cargado - MapCore:', typeof MapCore);
console.log('📍 MapPage cargado - SpotsGrid:', typeof SpotsGrid);
export class MapPage {
    constructor(app) {
        this.app = app;
        this.mapCore = null;
        this.spotsGrid = null;
    }

    async show() {
        console.log('🗺️ Mostrando página del mapa...');
        const app = document.getElementById('app');
        app.innerHTML = this.getMapHTML();
        
        // Inicializar el mapa y la grilla
        await this.init();
    }

    getMapHTML() {
        return `
            <div class="map-page-container">
                <div class="card fishing-card">
                    <div class="card-body">
                        <h3>🗺️ Mapa de Spots de Pesca</h3>
                        <p>Explora y gestiona tus spots de pesca en el mapa interactivo.</p>
                        <div id="map-container" style="height: 500px; border-radius: 8px; background: #f8f9fa;">
                            <div class="text-center" style="padding-top: 200px;">
                                <div class="loading-spinner"></div>
                                <p>Cargando mapa...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        console.log('🗺️ Inicializando página del mapa...');
        
        // Inicializar el mapa
        await this.initMap();
        
        // Inicializar la grilla de spots del usuario
        this.initSpotsGrid();
    }

    async initMap() {
        try {
            // Crear instancia del mapa
            this.mapCore = new MapCore(this.app);
            await this.mapCore.init();
            
            // Cargar spots en el mapa
            await this.mapCore.loadSpots();
            
        } catch (error) {
            console.error('❌ Error inicializando el mapa:', error);
            this.app.showNotification('Error al cargar el mapa', 'error');
        }
    }

    initSpotsGrid() {
        // Solo si el usuario está autenticado
        if (this.app.isAuthenticated()) {
            this.spotsGrid = new SpotsGrid(this.app, this.mapCore);
            this.spotsGrid.init();
        }
    }

    cleanup() {
        // Limpiar la grilla al salir de la página
        if (this.spotsGrid) {
            this.spotsGrid.cleanup();
            this.spotsGrid = null;
        }
        
        // Limpiar el mapa
        if (this.mapCore) {
            this.mapCore.cleanup();
            this.mapCore = null;
        }
    }
}