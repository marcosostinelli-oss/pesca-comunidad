// frontend/js/app.js
// ==================================================
// APLICACIÓN PESCA COMUNIDAD - VERSIÓN CORREGIDA
// ==================================================
import { Auth } from './modules/auth/auth.js';
import { AuthUI } from './modules/auth/auth-ui.js';
import { HomePage } from './modules/pages/home.js';
import { ProfilePage } from './modules/pages/profile.js';
import { MapCore } from './modules/map/map-core.js';
import { SpotsManager } from './modules/map/spots.js';
import { EventManager } from './modules/ui/events.js';
import { NotificationManager } from './modules/ui/notifications.js';
import { Router } from './modules/router/router.js';

// ✅ MÓDULOS DE AMIGOS
import { FriendsManager } from './modules/friends/friends.js';
import { FriendsUI } from './modules/friends/friends-ui.js';

class PescaApp {
    constructor() {
        // Variables de estado
        this.currentUser = null;
        this.map = null;
        this.currentMarker = null;
        this.spotCoordinates = null;
        this.simpleGrid = null;
        this.gridInitialized = false;
        
        // ✅ INICIALIZAR MÓDULOS EN ORDEN CORRECTO
        this.auth = new Auth(this);
        this.authUI = new AuthUI(this);
        this.homePage = new HomePage(this);
        this.profilePage = new ProfilePage(this);
        this.spotsManager = new SpotsManager(this);
        this.mapCore = new MapCore(this);
        this.events = new EventManager(this);
        this.notifications = new NotificationManager(this);
        this.router = new Router(this);
        
        // ✅ MÓDULOS DE AMIGOS - CON MANEJO DE ERRORES
        try {
            this.friendsManager = new FriendsManager(this);
            this.friendsUI = new FriendsUI(this);
            console.log('✅ Módulos de amigos inicializados correctamente');
        } catch (error) {
            console.error('❌ Error inicializando módulos de amigos:', error);
            this.friendsManager = null;
            this.friendsUI = null;
        }
        
        // ✅ MÓDULOS DE GUÍAS - INICIALIZACIÓN DIFERIDA
        this.guidesManager = null;
        this.guidesUI = null;
        
        this.init();
    }

    // ✅ MÉTODO showHomePage - CORREGIDO CON PARÁMETRO isReload
    showHomePage(isReload = false) {
        console.log('🏠 Mostrando página de inicio...', isReload ? '(recarga)' : '');
        
        try {
            this.hideHomeContent();
            const app = document.getElementById('app');
            
            if (!app) {
                console.error('❌ No se encontró el elemento #app');
                this.showHomeFallbackPage();
                return;
            }

            // ✅ CONTENIDO ORIGINAL QUE QUIERES (sin el contenido de respaldo)
            app.innerHTML = `
                <div class="text-center fade-in">
                    <h1>🎣 Bienvenido a PescaComunidad</h1>
                    <p class="lead">Conecta con otros pescadores, comparte tus spots y encuentra compañeros de pesca</p>
                    
                    <div class="row mt-5">
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

                    ${!this.currentUser ? `
                        <div class="mt-5">
                            <a href="#/auth" class="btn btn-fishing btn-lg">
                                ¡Únete a la Comunidad!
                            </a>
                        </div>
                    ` : `
                        <div class="mt-5">
                            <a href="#/perfil" class="btn btn-primary me-2">
                                👤 Mi Perfil
                            </a>
                            <a href="#/mapa" class="btn btn-success">
                                🗺️ Ver Mapa
                            </a>
                            <a href="#/amigos" class="btn btn-info">
                                👥 Mis Amigos
                            </a>
                            <a href="#/guias" class="btn btn-warning">
                                👨‍🏭 Guías
                            </a>
                        </div>
                    `}
                </div>
            `;
            
            console.log('✅ Página de inicio original mostrada correctamente');
            
            // ✅ ACTUALIZAR NAVEGACIÓN ACTIVA
            if (this.router && this.router.updateActiveNavLink) {
                this.router.updateActiveNavLink('/', true); // true = isHash
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error en showHomePage:', error);
            
            // ✅ MOSTRAR UNA VERSIÓN SIMPLE PERO NO LA DE RESPALDO COMPLETA
            this.showHomeFallbackPage();
            return false;
        }
    }

    // ✅ NUEVO: Método de fallback para home (más simple que showBasicHomePage)
    showHomeFallbackPage() {
        const app = document.getElementById('app');
        if (!app) return;
        
        app.innerHTML = `
            <div class="container mt-4 text-center">
                <h1>🎣 PescaComunidad</h1>
                <p class="lead">La comunidad de pescadores más grande</p>
                
                <div class="mt-4">
                    <a href="#/mapa" class="btn btn-primary me-2">
                        Ver Mapa
                    </a>
                    <a href="#/auth" class="btn btn-success">
                        Iniciar Sesión
                    </a>
                </div>
            </div>
        `;
    }

    // ✅ MÉTODO showGuidesPage - ACTUALIZADO
    async showGuidesPage(isReload = false) {
        console.log('🎣 Mostrando página de guías...', isReload ? '(recarga)' : '');
        
        try {
            // Cargar módulos de guías dinámicamente
            await this.loadGuidesModules();
            
            if (this.guidesUI && typeof this.guidesUI.renderGuidesList === 'function') {
                this.hideHomeContent();
                
                // Mostrar contenido de guías
                const app = document.getElementById('app');
                app.innerHTML = this.getGuidesPageHTML();
                
                // Inicializar la UI de guías
                this.guidesUI.init();
                await this.guidesUI.renderGuidesList();
                
                // Actualizar navegación activa
                if (this.router && this.router.updateActiveNavLink) {
                    this.router.updateActiveNavLink('/guias', true);
                }
            } else {
                throw new Error('Módulo de guías no disponible');
            }
        } catch (error) {
            console.error('❌ Error mostrando página de guías:', error);
            this.showGuidesFallbackPage();
        }
    }

    // ✅ MÉTODO loadGuidesModules - SIN CAMBIOS
    async loadGuidesModules() {
        if (this.guidesManager && this.guidesUI) {
            return;
        }
        try {
            const { guidesModule } = await import('./modules/guides/guides.js');
            const { guidesUI } = await import('./modules/guides/guides-ui.js');
            
            this.guidesManager = guidesModule;
            this.guidesUI = guidesUI;
            
            console.log('✅ Módulos de guías cargados correctamente');
        } catch (error) {
            console.error('❌ Error cargando módulos de guías:', error);
            throw error;
        }
    }

    // ✅ MÉTODO getGuidesPageHTML - SIN CAMBIOS
    getGuidesPageHTML() {
        return `
            <div class="guides-page">
                <div class="page-header">
                    <h1><i class="fas fa-users"></i> Guías de Pesca</h1>
                    <p class="lead">Encuentra guías profesionales en tu zona y contrata sus servicios</p>
                </div>
                
                <div class="guides-controls">
                    <div class="filters-card">
                        <h3><i class="fas fa-filter"></i> Filtrar Guías</h3>
                        <div class="filter-group">
                            <div class="form-group">
                                <label>Zona o Ciudad</label>
                                <input type="text" id="filterZone" class="form-control" 
                                       placeholder="Ej: Mar del Plata">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Precio Mínimo (USD)</label>
                                    <input type="number" id="filterMinPrice" class="form-control" 
                                           placeholder="50" min="0">
                                </div>
                                
                                <div class="form-group">
                                    <label>Precio Máximo (USD)</label>
                                    <input type="number" id="filterMaxPrice" class="form-control" 
                                           placeholder="300" min="0">
                                </div>
                            </div>
                            
                            <button id="filterGuidesBtn" class="btn btn-primary btn-block">
                                <i class="fas fa-search"></i> Buscar Guías
                            </button>
                        </div>
                    </div>
                    
                    <div class="guides-actions">
                        <div class="action-card" data-guide-only style="display: none;">
                            <h3><i class="fas fa-user-tie"></i> Eres Guía</h3>
                            <p>Gestiona tu perfil y spots especiales</p>
                            <button class="btn btn-success btn-block" id="createGuideSpotBtn">
                                <i class="fas fa-plus"></i> Crear Spot de Guía
                            </button>
                        </div>
                        
                        <div class="action-card" data-fisherman-only>
                            <h3><i class="fas fa-user-plus"></i> ¿Quieres ser Guía?</h3>
                            <p>Ofrece tus servicios a otros pescadores</p>
                            <button class="btn btn-success btn-block" id="registerGuideBtn">
                                <i class="fas fa-id-card"></i> Registrarse como Guía
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="guides-list-section">
                    <h2><i class="fas fa-list"></i> Guías Disponibles</h2>
                    <div id="guidesListContainer">
                        <!-- Los guías se cargarán aquí -->
                    </div>
                </div>
                
                <div class="guides-info">
                    <div class="info-card">
                        <i class="fas fa-shield-alt fa-2x"></i>
                        <h4>Guías Verificados</h4>
                        <p>Todos nuestros guías cuentan con licencia vigente y experiencia comprobada</p>
                    </div>
                    
                    <div class="info-card">
                        <i class="fas fa-star fa-2x"></i>
                        <h4>Sistema de Reseñas</h4>
                        <p>Califica y comenta sobre tu experiencia con cada guía</p>
                    </div>
                    
                    <div class="info-card">
                        <i class="fas fa-map-marked-alt fa-2x"></i>
                        <h4>Spots Especiales</h4>
                        <p>Los guías comparten sus mejores spots con la comunidad</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ✅ MÉTODO showGuidesFallbackPage - SIN CAMBIOS
    showGuidesFallbackPage() {
        this.hideHomeContent();
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h3><i class="fas fa-user-tie"></i> Guías de Pesca</h3>
                            </div>
                            <div class="card-body">
                                <p class="lead">Encuentra guías profesionales de pesca en tu zona</p>
                                
                                <div class="alert alert-info">
                                    <p>La gestión completa de guías no está disponible en este momento.</p>
                                    <p>Estamos trabajando para solucionarlo.</p>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-body">
                                                <h5 class="card-title">Guías Disponibles</h5>
                                                <p>Busca guías por zona, experiencia y precio.</p>
                                                <div class="mb-3">
                                                    <label class="form-label">Zona</label>
                                                    <input type="text" class="form-control" placeholder="Ej: Mar del Plata">
                                                </div>
                                                <button class="btn btn-primary">Buscar Guías</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-body">
                                                <h5 class="card-title">Registrarse como Guía</h5>
                                                <p>Ofrece tus servicios a otros pescadores.</p>
                                                <div class="mb-3">
                                                    <label class="form-label">Email</label>
                                                    <input type="email" class="form-control" placeholder="tu@email.com">
                                                </div>
                                                <button class="btn btn-success">Solicitar Registro</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <a href="#/home" class="btn btn-primary">
                                        <i class="fas fa-arrow-left"></i> Volver al inicio
                                    </a>
                                    <button class="btn btn-outline-secondary ms-2" onclick="location.reload()">
                                        <i class="fas fa-refresh"></i> Recargar página
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ✅ MÉTODO showFriendsPage - ACTUALIZADO CON PARÁMETRO
    showFriendsPage(isReload = false) {
        console.log('👥 Mostrando página de amigos...', isReload ? '(recarga)' : '');
        
        if (this.friendsUI && typeof this.friendsUI.showFriendsPage === 'function') {
            this.hideHomeContent();
            this.friendsUI.showFriendsPage();
            
            // Actualizar navegación activa
            if (this.router && this.router.updateActiveNavLink) {
                this.router.updateActiveNavLink('/amigos', true);
            }
        } else {
            console.error('❌ FriendsUI no disponible - Mostrando página de respaldo');
            this.showFriendsFallbackPage();
        }
    }

    // ✅ MÉTODO showFriendsFallbackPage - ACTUALIZADO
    showFriendsFallbackPage() {
        this.hideHomeContent();
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-warning">
                                <h3><i class="fas fa-exclamation-triangle"></i> Gestión de Amigos</h3>
                            </div>
                            <div class="card-body">
                                <p class="lead">Conecta con otros pescadores y comparte los spots</p>
                                
                                <div class="alert alert-info">
                                    <p>La gestión completa de amigos no está disponible en este momento.</p>
                                    <p>Estamos trabajando para solucionarlo.</p>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-body">
                                                <h5 class="card-title">Agregar Amigos</h5>
                                                <div class="mb-3">
                                                    <label class="form-label">Email del usuario</label>
                                                    <input type="email" class="form-control" placeholder="ejemplo@gmail.com">
                                                </div>
                                                <button class="btn btn-primary">Enviar solicitud</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-body">
                                                <h5 class="card-title">Buscar Usuarios</h5>
                                                <div class="mb-3">
                                                    <input type="text" class="form-control" placeholder="Buscar por nombre o email...">
                                                </div>
                                                <small class="text-muted">Escribe al menos 3 caracteres para buscar</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <a href="#/home" class="btn btn-primary">
                                        <i class="fas fa-arrow-left"></i> Volver al inicio
                                    </a>
                                    <button class="btn btn-outline-secondary ms-2" onclick="location.reload()">
                                        <i class="fas fa-refresh"></i> Recargar página
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ✅ MÉTODOS NECESARIOS PARA LOS MÓDULOS - ACTUALIZADOS
    setCurrentUser(user) {
        const previousUser = this.currentUser;
        
        if (user) {
            localStorage.setItem('pesca_user', JSON.stringify(user));
        } else {
            // ✅ USUARIO NULL = LOGOUT - LIMPIAR TODO COMPLETAMENTE
            localStorage.removeItem('pesca_user');
            localStorage.removeItem('pesca_token');
            localStorage.removeItem('spotToView');
            
            // ✅ LIMPIAR GRILLA AL DESLOGUEAR
            if (this.simpleGrid) {
                console.log('🗑️ Limpiando grilla por logout...');
                this.simpleGrid.cleanup();
                this.simpleGrid = null;
                this.gridInitialized = false;
            }
        }
        
        this.currentUser = user;
        console.log('👤 Usuario establecido:', user ? user.name : 'null');
        
        // ✅ INICIALIZAR GRILLA SI EL USUARIO ACABA DE LOGUEARSE
        if (user && !previousUser) {
            console.log('🚀 Usuario acaba de loguearse, inicializando grilla...');
            this.initializeGridWithRetry();
        }
        
        // Actualizar UI de autenticación
        if (this.auth && this.auth.renderAuthButtons) {
            this.auth.renderAuthButtons();
        }
        this.updateUIForAuthState();
    }

    // ✅ MÉTODO AGREGADO: Obtener usuario actual de forma segura
    getCurrentUser() {
        try {
            // Primero intentar desde el estado actual
            if (this.currentUser) {
                return this.currentUser;
            }
            
            // Fallback: obtener desde localStorage
            const userData = localStorage.getItem('pesca_user');
            if (userData) {
                const user = JSON.parse(userData);
                this.currentUser = user; // Actualizar estado
                return user;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error obteniendo usuario actual:', error);
            return null;
        }
    }

    // ✅ MÉTODO AGREGADO: Verificar si el usuario está autenticado
    isAuthenticated() {
        const user = this.getCurrentUser();
        const token = localStorage.getItem('pesca_token');
        return !!(user && token);
    }

    // ✅ MÉTODO AGREGADO: Obtener token de autenticación
    getAuthToken() {
        return localStorage.getItem('pesca_token');
    }

    setMap(map) {
        this.map = map;
    }

    getMap() {
        return this.map;
    }

    setCurrentMarker(marker) {
        this.currentMarker = marker;
    }

    getCurrentMarker() {
        return this.currentMarker;
    }

    setSpotCoordinates(coordinates) {
        this.spotCoordinates = coordinates;
    }

    getSpotCoordinates() {
        return this.spotCoordinates;
    }

    showNotification(message, type = 'info') {
        this.notifications.show(message, type);
    }

    // ✅ NUEVO: Actualizar UI según estado de autenticación
    updateUIForAuthState() {
        console.log('🔄 Actualizando UI para estado auth:', this.currentUser ? 'autenticado' : 'no autenticado');
        
        // Si estamos en la página de auth y el usuario se autentica, redirigir al home
        const appContent = document.getElementById('app');
        if (appContent && appContent.innerHTML.includes('auth-form') && this.currentUser) {
            console.log('🔄 Redirigiendo desde auth a home...');
            this.router.goTo('/home');
        }
    }

    init() {
        console.log('🎣 Inicializando PescaComunidad...');
        
        // ✅ INICIALIZAR USUARIO DESDE LOCALSTORAGE
        this.initializeUserFromStorage();
        
        // ✅ USAR MÓDULOS EN LUGAR DE MÉTODOS LOCALES
        this.auth.checkAuth();
        this.auth.renderAuthButtons();
        this.setupEventDelegation();
        
        // ✅ INICIALIZAR GRILLA SI HAY USUARIO AUTENTICADO
        if (this.isAuthenticated()) {
            console.log('🔐 Usuario autenticado al cargar, inicializando grilla...');
            this.initializeGridWithRetry();
        }
        
        console.log('✅ Router SPA inicializado');
    }

    // ✅ MÉTODO AGREGADO: Inicializar usuario desde localStorage
    initializeUserFromStorage() {
        try {
            const userData = localStorage.getItem('pesca_user');
            const token = localStorage.getItem('pesca_token');
            
            if (userData && token) {
                this.currentUser = JSON.parse(userData);
                console.log('👤 Usuario cargado desde storage:', this.currentUser.name);
            } else {
                console.log('🔐 No hay usuario autenticado en storage');
                this.currentUser = null;
            }
        } catch (error) {
            console.error('❌ Error cargando usuario desde storage:', error);
            this.currentUser = null;
        }
    }

    // ==================================================
    // MANEJO DE EVENTOS - ACTUALIZADO
    // ==================================================

    setupEventDelegation() {
        console.log('✅ Configurando delegación de eventos...');
        
        document.addEventListener('click', (event) => {
            this.handleGlobalClick(event);
        });

        document.addEventListener('submit', (event) => {
            this.handleFormSubmit(event);
        });
    }

    handleGlobalClick(event) {
        const target = event.target;
        const button = target.closest('button');
        
        if (button) {
            this.handleButtonClick(button, event);
        }
    }

    handleFormSubmit(event) {
        const form = event.target;
        event.preventDefault();
        
        console.log('🔄 Formulario enviado:', form.id);
        
        if (form.id === 'auth-form' || form.id === 'password-recovery-form') {
            return;
        }
    }

    handleButtonClick(button, event) {
        const texto = button.textContent.trim();
        const id = button.id;
        
        console.log('🔍 Click en botón:', { texto, id });

        // Evitar botones de submit en formularios
        if (button.closest('form') && button.type === 'submit') {
            return;
        }

        // Permitir botones con onclick específico
        if (button.hasAttribute('onclick')) {
            return;
        }

        // ✅ ACTUALIZADO: Navegación usando Router
        if (id === 'logout-btn' || texto === 'Cerrar Sesión') {
            event.preventDefault();
            this.auth.logout();
            return;
        }

        // Los demás botones de navegación ahora son enlaces manejados por el Router
    }

    // ==================================================
    // NAVEGACIÓN ENTRE PÁGINAS - ACTUALIZADA CON ROUTER
    // ==================================================

    // ✅ showAuth ACTUALIZADO CON PARÁMETRO
    showAuth(isReload = false) {
        console.log('🔐 Mostrando formulario de autenticación...', isReload ? '(recarga)' : '');
        this.hideHomeContent();
        this.authUI.show();
        
        // Actualizar navegación activa
        if (this.router && this.router.updateActiveNavLink) {
            this.router.updateActiveNavLink('/auth', true);
        }
    }

    // ✅ showProfile ACTUALIZADO CON PARÁMETRO
    showProfile(userId = null, isReload = false) {
        console.log(`👤 Mostrando perfil${userId ? ' del usuario ID: ' + userId : ' personal'}`, isReload ? '(recarga)' : '');
        
        // ✅ NUEVO: Delegar al ProfilePage con el userId
        if (this.profilePage) {
            this.hideHomeContent();
            this.profilePage.show(userId);
            
            // Actualizar navegación activa
            if (this.router && this.router.updateActiveNavLink) {
                this.router.updateActiveNavLink('/perfil', true);
            }
        } else {
            console.error('❌ ProfilePage no disponible');
            this.showProfileFallback();
        }
    }

    // ✅ showProfileFallback - ACTUALIZADO
    showProfileFallback() {
        if (!this.currentUser) {
            console.log('⚠️ Usuario no autenticado, redirigiendo a auth...');
            this.router.goTo('/auth');
            return;
        }

        console.log('👤 Mostrando perfil de:', this.currentUser.name);
        this.hideHomeContent();
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="row">
                <div class="col-md-8 mx-auto">
                    <!-- Encabezado del Perfil -->
                    <div class="card fishing-card mb-4">
                        <div class="card-body text-center">
                            <div class="profile-avatar mb-3">
                                <i class="fas fa-user-circle fa-4x fishing-text-primary"></i>
                            </div>
                            <h3>🎣 Mi Perfil de Pesca</h3>
                            <p class="text-muted">Gestiona tu información personal y preferencias de pesca</p>
                        </div>
                    </div>

                    <!-- Vista de Perfil (Modo Lectura) -->
                    <div class="card fishing-card" id="profile-view">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <h4>Información Personal</h4>
                                <button class="btn btn-primary" onclick="app.switchToEditMode()">
                                    <i class="fas fa-edit me-2"></i>Editar Perfil
                                </button>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Nombre completo</label>
                                        <div class="profile-value">${this.currentUser.name || 'No especificado'}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Email</label>
                                        <div class="profile-value">${this.currentUser.email}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">WhatsApp</label>
                                        <div class="profile-value">${this.currentUser.whatsapp || 'No especificado'}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Experiencia</label>
                                        <div class="profile-value">${this.getExperienceText(this.currentUser.experience)}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Especies favoritas</label>
                                        <div class="profile-value">${this.currentUser.favorite_species || 'No especificado'}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">País</label>
                                        <div class="profile-value">${this.currentUser.country || 'No especificado'}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Provincia/Estado</label>
                                        <div class="profile-value">${this.currentUser.province || 'No especificado'}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Ciudad</label>
                                        <div class="profile-value">${this.currentUser.city || 'No especificado'}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="profile-field mb-3">
                                <label class="form-label text-muted">Miembro desde</label>
                                <div class="profile-value">${this.formatDate(this.currentUser.created_at)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Formulario de Edición (Modo Edición) -->
                    <div class="card fishing-card d-none" id="profile-edit">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <h4>Editar Perfil</h4>
                                <button class="btn btn-outline-secondary" onclick="app.switchToViewMode()">
                                    <i class="fas fa-times me-2"></i>Cancelar
                                </button>
                            </div>
                            
                            <form id="profile-edit-form">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-name" class="form-label">Nombre completo *</label>
                                            <input type="text" class="form-control" id="edit-name" 
                                                   value="${this.currentUser.name || ''}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" 
                                                   value="${this.currentUser.email}" disabled>
                                            <div class="form-text">El email no se puede modificar</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-whatsapp" class="form-label">WhatsApp</label>
                                            <input type="tel" class="form-control" id="edit-whatsapp" 
                                                   value="${this.currentUser.whatsapp || ''}" 
                                                   placeholder="+549 11 1234-5678">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-experience" class="form-label">Experiencia en pesca</label>
                                            <select class="form-select" id="edit-experience">
                                                <option value="">Seleccionar experiencia</option>
                                                <option value="beginner" ${this.currentUser.experience === 'beginner' ? 'selected' : ''}>Principiante</option>
                                                <option value="intermediate" ${this.currentUser.experience === 'intermediate' ? 'selected' : ''}>Intermedio</option>
                                                <option value="advanced" ${this.currentUser.experience === 'advanced' ? 'selected' : ''}>Avanzado</option>
                                                <option value="expert" ${this.currentUser.experience === 'expert' ? 'selected' : ''}>Experto</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-favorite-species" class="form-label">Especies favoritas</label>
                                            <input type="text" class="form-control" id="edit-favorite-species" 
                                                   value="${this.currentUser.favorite_species || ''}" 
                                                   placeholder="Ej: trucha, pejerrey, dorado">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-country" class="form-label">País</label>
                                            <select class="form-select" id="edit-country">
                                                <option value="Argentina" ${this.currentUser.country === 'Argentina' ? 'selected' : ''}>Argentina</option>
                                                <option value="Uruguay" ${this.currentUser.country === 'Uruguay' ? 'selected' : ''}>Uruguay</option>
                                                <option value="Chile" ${this.currentUser.country === 'Chile' ? 'selected' : ''}>Chile</option>
                                                <option value="Brasil" ${this.currentUser.country === 'Brasil' ? 'selected' : ''}>Brasil</option>
                                                <option value="Paraguay" ${this.currentUser.country === 'Paraguay' ? 'selected' : ''}>Paraguay</option>
                                                <option value="Bolivia" ${this.currentUser.country === 'Bolivia' ? 'selected' : ''}>Bolivia</option>
                                                <option value="Perú" ${this.currentUser.country === 'Perú' ? 'selected' : ''}>Perú</option>
                                                <option value="Otro" ${!this.currentUser.country || this.currentUser.country === 'Otro' ? 'selected' : ''}>Otro</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-province" class="form-label">Provincia/Estado</label>
                                            <input type="text" class="form-control" id="edit-province" 
                                                   value="${this.currentUser.province || ''}" 
                                                   placeholder="Ej: Buenos Aires, Córdoba, etc.">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-city" class="form-label">Ciudad</label>
                                            <input type="text" class="form-control" id="edit-city" 
                                                   value="${this.currentUser.city || ''}" 
                                                   placeholder="Ej: Mar del Plata, Bariloche, etc.">
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex gap-2 justify-content-end mt-4">
                                    <button type="button" class="btn btn-outline-secondary" onclick="app.switchToViewMode()">
                                        Cancelar
                                    </button>
                                    <button type="submit" class="btn btn-success">
                                        <i class="fas fa-save me-2"></i>Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Botones de Navegación -->
                    <div class="card fishing-card mt-4">
                        <div class="card-body text-center">
                            <div class="btn-group" role="group">
                                <a href="#/mapa" class="btn btn-primary me-2">
                                    <i class="fas fa-map me-2"></i>🗺️ Ver Mapa de Spots
                                </a>
                                <a href="#/amigos" class="btn btn-info me-2">
                                    <i class="fas fa-user-friends me-2"></i>👥 Mis Amigos
                                </a>
                                <a href="#/guias" class="btn btn-warning me-2">
                                    <i class="fas fa-user-tie me-2"></i>👨‍🏭 Guías
                                </a>
                                <a href="#/home" class="btn btn-outline-secondary">
                                    <i class="fas fa-home me-2"></i>🏠 Inicio
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adjuntar evento al formulario de edición
        const editForm = document.getElementById('profile-edit-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate();
            });
        }
    }

    // ✅ showMapPage ACTUALIZADO CON PARÁMETRO
    showMapPage(isReload = false) {
        console.log('🗺️ Mostrando página del mapa...', isReload ? '(recarga)' : '');
        
        // ✅ NUEVO: Limpiar mapa anterior si existe
        if (this.mapCore && this.mapCore.cleanup) {
            this.mapCore.cleanup();
        }
        
        // ✅ NUEVO: Limpiar grilla anterior
        if (this.simpleGrid) {
            this.simpleGrid.cleanup();
            this.simpleGrid = null;
            this.gridInitialized = false;
        }
        
        this.hideHomeContent();
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="row">
                <!-- Panel lateral de condiciones -->
                <div class="col-md-4">
                    <div class="card fishing-card mb-3">
                        <div class="card-body">
                            <h5>🌤️ Condiciones de Pesca</h5>
                            <div class="btn-group weather-tabs w-100 mb-3" role="group">
                                <button type="button" class="btn btn-outline-primary active" id="weather-btn">Clima</button>
                                <button type="button" class="btn btn-outline-primary" id="forecast-btn">Extendido</button>
                                <button type="button" class="btn btn-outline-primary" id="tides-btn">Mareas</button>
                                <button type="button" class="btn btn-outline-primary" id="fishing-forecast-btn">Pesca</button>
                            </div>
                            <div id="weather-panel">
                                <!-- Aquí se cargará la información del clima -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="card fishing-card">
                        <div class="card-body">
                            <h5>🔍 Buscar Ubicación</h5>
                            <div class="input-group mb-3">
                                <input type="text" class="form-control" id="search-input" placeholder="Ej: Mar del Plata">
                                <button class="btn btn-primary" id="search-btn">Buscar</button>
                            </div>
                            <div class="d-grid gap-2">
                                <button class="btn btn-success" id="location-btn">📍 Mi Ubicación</button>
                                <button class="btn btn-warning" id="add-spot-btn" disabled>➕ Agregar Spot</button>
                                <button class="btn btn-info" id="reload-spots-btn">🔄 Recargar Spots</button>
                                <a href="#/amigos" class="btn btn-outline-info">👥 Ver Amigos</a>
                                <a href="#/guias" class="btn btn-outline-warning">👨‍🏭 Ver Guías</a>
                                <a href="#/home" class="btn btn-outline-secondary">← Volver al Inicio</a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Mapa -->
                <div class="col-md-8">
                    <div class="card fishing-card">
                        <div class="card-body">
                            <h5>🗺️ Mapa Completo de Spots de Pesca</h5>
                            <div id="full-map" style="height: 600px; border-radius: 8px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Botón Flotante (FAB) para Agregar Spot en Mobile -->
            <button class="fab-add-spot" id="fab-add-spot" title="Agregar Spot">➕</button>

            <!-- ✅ ACTUALIZADO: Formulario para agregar spot (con campos mejorados) -->
            <div class="modal fade" id="spot-form-container" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-map-marker-alt me-2"></i>Agregar Nuevo Spot de Pesca
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="spot-form">
                                <!-- ✅ MEJORADO: Campos de coordenadas ocultos para mejor compatibilidad -->
                                <input type="hidden" id="spot-latitude" name="latitude">
                                <input type="hidden" id="spot-longitude" name="longitude">
                                
                                <!-- Coordenadas (solo lectura) -->
                                <div class="mb-3">
                                    <label for="spot-coordinates" class="form-label">
                                        <i class="fas fa-location-dot me-1"></i>Ubicación Seleccionada
                                    </label>
                                    <input type="text" class="form-control" id="spot-coordinates" readonly>
                                    <div class="form-text">Haz clic en el mapa para seleccionar una ubicación</div>
                                </div>

                                <!-- Nombre del Spot -->
                                <div class="mb-3">
                                    <label for="spot-name" class="form-label">
                                        <i class="fas fa-tag me-1"></i>Nombre del Spot *
                                    </label>
                                    <input type="text" class="form-control" id="spot-name" name="name" required 
                                           placeholder="Ej: Laguna de los Patos, Río Colorado...">
                                </div>
                                
                                <!-- Tipo de Agua -->
                                <div class="mb-3">
                                    <label for="spot-type" class="form-label">
                                        <i class="fas fa-water me-1"></i>Tipo de Agua *
                                    </label>
                                    <select class="form-select" id="spot-type" name="type" required>
                                        <option value="">Seleccionar tipo de agua</option>
                                        <option value="río">Río</option>
                                        <option value="lago">Lago</option>
                                        <option value="mar">Mar</option>
                                        <option value="embalse">Embalse</option>
                                        <option value="arroyo">Arroyo</option>
                                        <option value="presa">Presa</option>
                                        <option value="canal">Canal</option>
                                    </select>
                                </div>
                                
                                <!-- Especies -->
                                <div class="mb-3">
                                    <label for="spot-species" class="form-label">
                                        <i class="fas fa-fish me-1"></i>Especies que se pueden pescar
                                    </label>
                                    <input type="text" class="form-control" id="spot-species" name="species"
                                           placeholder="Ej: trucha, carpa, dorado, surubí, bagre...">
                                    <div class="form-text">Separa las especies con comas</div>
                                </div>
                                
                                <!-- Mejor Horario -->
                                <div class="mb-3">
                                    <label for="spot-best-time" class="form-label">
                                        <i class="fas fa-clock me-1"></i>Mejor Horario para Pescar
                                    </label>
                                    <select class="form-select" id="spot-best-time" name="bestTime">
                                        <option value="">Seleccionar horario</option>
                                        <option value="mañana">Mañana</option>
                                        <option value="tarde">Tarde</option>
                                        <option value="noche">Noche</option>
                                        <option value="amanecer">Amanecer</option>
                                        <option value="atardecer">Atardecer</option>
                                        <option value="todo el día">Todo el día</option>
                                    </select>
                                </div>

                                <!-- ✅ NUEVO: Accesibilidad -->
                                <div class="mb-3">
                                    <label for="spot-accessibility" class="form-label">
                                        <i class="fas fa-road me-1"></i>Accesibilidad y Restricciones
                                    </label>
                                    <select class="form-select" id="spot-accessibility" name="accessibility">
                                        <option value="fácil">Fácil - Acceso sencillo para todos</option>
                                        <option value="moderado" selected>Moderado - Requiere algo de esfuerzo</option>
                                        <option value="difícil">Difícil - Solo para personas con buena condición física</option>
                                        <option value="solo con vehículo">Solo con vehículo - Acceso vehicular necesario</option>
                                        <option value="club privado">Club Privado - Solo para socios</option>
                                    </select>
                                </div>

                                <!-- ✅ NUEVO: Facilidades -->
                                <div class="mb-3">
                                    <label class="form-label">
                                        <i class="fas fa-utensils me-1"></i>Facilidades Disponibles
                                    </label>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="facilities" value="estacionamiento" id="facility-parking">
                                        <label class="form-check-label" for="facility-parking">
                                            Estacionamiento
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="facilities" value="baños" id="facility-bathrooms">
                                        <label class="form-check-label" for="facility-bathrooms">
                                            Baños
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="facilities" value="camping" id="facility-camping">
                                        <label class="form-check-label" for="facility-camping">
                                            Zona de camping
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="facilities" value="muelle" id="facility-pier">
                                        <label class="form-check-label" for="facility-pier">
                                            Muelle
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="facilities" value="restaurante" id="facility-restaurant">
                                        <label class="form-check-label" for="facility-restaurant">
                                            Restaurante/Cafetería
                                        </label>
                                    </div>
                                </div>
                                
                                <!-- Visibilidad -->
                                <div class="mb-3">
                                    <label for="spot-visibility" class="form-label">
                                        <i class="fas fa-eye me-1"></i>Visibilidad
                                    </label>
                                    <select class="form-select" id="spot-visibility" name="visibility">
                                        <option value="public">Público (todos pueden ver)</option>
                                        <option value="friends-only">Solo Amigos</option>
                                        <option value="private">Privado (solo tú)</option>
                                    </select>
                                    <div class="form-text">
                                        <span class="text-info">🔵 Público</span> - 
                                        <span class="text-warning">🟠 Solo amigos</span> - 
                                        <span class="text-danger">🔴 Privado</span>
                                    </div>
                                </div>
                                
                                <!-- Descripción -->
                                <div class="mb-3">
                                    <label for="spot-description" class="form-label">
                                        <i class="fas fa-file-alt me-1"></i>Descripción
                                    </label>
                                    <textarea class="form-control" id="spot-description" name="description" rows="3" 
                                              placeholder="Describe el spot, accesos, características, recomendaciones..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="cancel-spot-btn" data-bs-dismiss="modal">
                                <i class="fas fa-times me-1"></i>Cancelar
                            </button>
                            <button type="submit" form="spot-form" class="btn btn-primary">
                                <i class="fas fa-save me-1"></i>Guardar Spot
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ✅ MEJORADO: Inicializar mapa con manejo de errores
        setTimeout(async () => {
            try {
                console.log('🗺️ Inicializando mapa en showMapPage...');
                this.mapCore.initFullMap();
                
                // ✅ NUEVO: Inicializar grilla después del mapa
                setTimeout(() => {
                    this.initializeMapGrid();
                }, 1000);
                
                // ✅ CONFIGURAR EVENTOS DE LA GRILLA
                this.setupGridEvents();
                
                // ✅ ASEGURAR FAB VISIBLE EN MOBILE
                this.ensureFabVisible();
                                // Actualizar navegación activa
                if (this.router && this.router.updateActiveNavLink) {
                    this.router.updateActiveNavLink('/mapa', true);
                }
                
            } catch (error) {
                console.error('❌ Error inicializando mapa:', error);
                this.showNotification('Error al cargar el mapa. Por favor recarga la página.', 'error');
            }
        }, 100);
    }

    // ✅ showWeatherPage ACTUALIZADO CON PARÁMETRO
    showWeatherPage(isReload = false) {
        console.log('🌤️ Mostrando página de clima...', isReload ? '(recarga)' : '');
        this.hideHomeContent();
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="text-center">
                <h2>🌤️ Información Meteorológica</h2>
                <p class="lead">Consulta las condiciones climáticas para planificar tu pesca</p>
                
                <div class="row mt-4">
                    <div class="col-md-6 mb-3">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h5>📍 Clima Actual</h5>
                                <p>Información en tiempo real de tu ubicación</p>
                                <a href="#/mapa" class="btn btn-primary">
                                    Ver en el Mapa
                                </a>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h5>📅 Pronóstico Extendido</h5>
                                <p>Pronóstico de 5 días para planificar</p>
                                <a href="#/mapa" class="btn btn-info">
                                    Ver Pronóstico
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <a href="#/home" class="btn btn-outline-secondary">
                        ← Volver al Inicio
                    </a>
                </div>
            </div>
        `;
        
        // Actualizar navegación activa
        if (this.router && this.router.updateActiveNavLink) {
            this.router.updateActiveNavLink('/clima', true);
        }
    }

    // ✅ showFishingPage ACTUALIZADO CON PARÁMETRO
    showFishingPage(isReload = false) {
        console.log('🎣 Mostrando página de condiciones de pesca...', isReload ? '(recarga)' : '');
        this.hideHomeContent();
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="text-center">
                <h2>🎣 Condiciones de Pesca</h2>
                <p class="lead">Información específica para optimizar tu experiencia de pesca</p>
                
                <div class="row mt-4">
                    <div class="col-md-4 mb-3">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h5>🌊 Estado de Mareas</h5>
                                <p>Tablas de mareas y mejores momentos</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h5>🌙 Fase Lunar</h5>
                                <p>Influencia de la luna en la pesca</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card fishing-card">
                            <div class="card-body">
                                <h5>🐟 Especies Activas</h5>
                                <p>Qué especies están más activas</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <a href="#/home" class="btn btn-outline-secondary">
                        ← Volver al Inicio
                    </a>
                </div>
            </div>
        `;
        
        // Actualizar navegación activa
        if (this.router && this.router.updateActiveNavLink) {
            this.router.updateActiveNavLink('/pesca', true);
        }
    }

    hideHomeContent() {
        const homeContent = document.getElementById('home-content');
        if (homeContent) {
            homeContent.style.display = 'none';
        }
    }

    // ==================================================
    // MÉTODOS PARA EDICIÓN DE PERFIL
    // ==================================================

    switchToEditMode() {
        document.getElementById('profile-view').classList.add('d-none');
        document.getElementById('profile-edit').classList.remove('d-none');
    }

    switchToViewMode() {
        document.getElementById('profile-view').classList.remove('d-none');
        document.getElementById('profile-edit').classList.add('d-none');
    }

    async handleProfileUpdate() {
        const profileData = {
            name: document.getElementById('edit-name').value,
            whatsapp: document.getElementById('edit-whatsapp').value,
            experience: document.getElementById('edit-experience').value,
            favorite_species: document.getElementById('edit-favorite-species').value,
            country: document.getElementById('edit-country').value,
            province: document.getElementById('edit-province').value,
            city: document.getElementById('edit-city').value
        };

        try {
            const updatedUser = await this.auth.updateProfile(profileData);
            if (updatedUser) {
                this.switchToViewMode();
            }
        } catch (error) {
            console.error('Error actualizando perfil:', error);
        }
    }

    getExperienceText(experience) {
        const experiences = {
            'beginner': 'Principiante',
            'intermediate': 'Intermedio',
            'advanced': 'Avanzado',
            'expert': 'Experto'
        };
        return experiences[experience] || 'No especificado';
    }

    formatDate(dateString) {
        if (!dateString) return 'No disponible';
        
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'UTC'
        };
        
        try {
            return new Date(dateString).toLocaleDateString('es-ES', options);
        } catch (error) {
            return dateString;
        }
    }

    // ✅ NUEVO MÉTODO: Inicialización robusta de grilla con reintentos
    async initializeGridWithRetry(maxRetries = 3, delay = 1000) {
        if (this.gridInitialized && this.simpleGrid) {
            console.log('⚠️ Grilla ya está inicializada, actualizando...');
            try {
                await this.simpleGrid.loadSpots();
                return;
            } catch (error) {
                console.error('❌ Error actualizando grilla:', error);
            }
        }

        if (!this.isAuthenticated()) {
            console.log('❌ Usuario no autenticado, no se puede inicializar grilla');
            this.showGridError('Debes iniciar sesión para ver los spots');
            return;
        }

        console.log(`🔄 Intentando inicializar grilla (máximo ${maxRetries} intentos)...`);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔧 Intento ${attempt} de inicializar grilla...`);
                
                // ✅ CARGAR MÓDULO DINÁMICAMENTE
                const { SimpleSpotsGrid } = await import('./modules/map/simple-grid.js');
                
                // ✅ LIMPIAR GRILLA EXISTENTE
                if (this.simpleGrid) {
                    this.simpleGrid.cleanup();
                    this.simpleGrid = null;
                }
                
                // ✅ CREAR NUEVA INSTANCIA
                this.simpleGrid = new SimpleSpotsGrid(this);
                await this.simpleGrid.init();
                
                this.gridInitialized = true;
                console.log('✅ Grilla inicializada exitosamente');
                return;
                
            } catch (error) {
                console.error(`❌ Error en intento ${attempt} de inicializar grilla:`, error);
                
                if (attempt < maxRetries) {
                    console.log(`⏳ Esperando ${delay}ms antes del próximo intento...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 1.5;
                } else {
                    console.error('❌ Todos los intentos de inicializar grilla fallaron');
                    this.showGridError();
                    this.gridInitialized = false;
                }
            }
        }
    }

    // ✅ NUEVO MÉTODO: Forzar reinicialización de grilla
    async reinitializeGrid() {
        console.log('🔄 Reinicializando grilla forzadamente...');
        this.gridInitialized = false;
        
        if (this.simpleGrid) {
            this.simpleGrid.cleanup();
            this.simpleGrid = null;
        }
        
        await this.initializeGridWithRetry();
    }

    // ✅ NUEVO: Recargar grilla manualmente
    async reloadGrid() {
        console.log('🔄 Recargando grilla manualmente...');
        
        if (this.simpleGrid && typeof this.simpleGrid.loadSpots === 'function') {
            try {
                await this.simpleGrid.loadSpots();
                this.showNotification('Spots recargados correctamente', 'success');
            } catch (error) {
                console.error('❌ Error recargando grilla:', error);
                this.showNotification('Error recargando spots', 'error');
            }
        } else {
            await this.reinitializeGrid();
        }
    }

    // ==================================================
    // MANEJO ESPECÍFICO DEL PANEL DESPLEGABLE
    // ==================================================

    // ✅ NUEVO: Inicializar el panel desplegable sin conflictos
    initializeSpotsGridPanel() {
        console.log('🔄 Inicializando panel de spots...');
        
        const grid = document.getElementById('simple-spots-grid');
        const toggleBtn = document.getElementById('toggle-grid');
        
        if (!grid || !toggleBtn) {
            console.log('⏳ Panel de spots no encontrado aún, reintentando...');
            setTimeout(() => this.initializeSpotsGridPanel(), 1000);
            return;
        }
        
        console.log('✅ Elementos del panel encontrados');
        
        // ✅ ELIMINAR CUALQUIER EVENTO EXISTENTE (SOLUCIÓN SEGURA)
        const newToggleBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
        
        // ✅ CONFIGURAR NUESTRO PROPIO EVENTO
        const freshToggleBtn = document.getElementById('toggle-grid');
        
        freshToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const grid = document.getElementById('simple-spots-grid');
            const gridContent = grid.querySelector('.grid-content');
            const icon = freshToggleBtn.querySelector('i');
            
            // Alternar la clase de expansión
            if (grid.classList.contains('grid-expanded')) {
                grid.classList.remove('grid-expanded');
                if (gridContent) gridContent.style.display = 'none';
                icon.className = 'fas fa-chevron-up';
                freshToggleBtn.title = 'Mostrar lista';
            } else {
                grid.classList.add('grid-expanded');
                if (gridContent) gridContent.style.display = 'block';
                icon.className = 'fas fa-chevron-down';
                freshToggleBtn.title = 'Ocultar lista';
            }
            
            console.log('🎯 Panel toggled:', grid.classList.contains('grid-expanded'));
        });
        
        // ✅ Asegurar que empiece cerrado
        grid.classList.remove('grid-expanded');
        const gridContent = grid.querySelector('.grid-content');
        if (gridContent) gridContent.style.display = 'none';
        freshToggleBtn.title = 'Mostrar lista';
        
        console.log('✅ Panel de spots inicializado correctamente');
    }

    // ✅ NUEVO: Inicializar grilla del mapa
    initializeMapGrid() {
        if (!this.isAuthenticated()) {
            console.log('🔐 Usuario no autenticado, no se puede inicializar grilla');
            this.showGridError('Debes iniciar sesión para ver los spots');
            return;
        }

        console.log('🔄 Inicializando grilla del mapa...');
        this.initializeGridWithRetry();
        
        // ✅ AGREGAR ESTA LÍNEA: Inicializar el panel desplegable
        setTimeout(() => this.initializeSpotsGridPanel(), 500);
    }

    // ✅ NUEVO: Asegurar que el FAB sea visible en mobile
    ensureFabVisible() {
        const fab = document.getElementById('fab-add-spot');
        if (fab) {
            fab.style.display = 'flex';
            fab.style.position = 'fixed';
            fab.style.zIndex = '1001';
            console.log('✅ FAB visible en mobile');
        } else {
            console.log('⚠️ FAB no encontrado');
        }
    }

    // ✅ NUEVO: Configurar eventos de la grilla
    setupGridEvents() {
        // Botón de recargar spots
        const reloadBtn = document.getElementById('reload-spots-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                this.reloadGrid();
                this.showNotification('Recargando spots...', 'info');
            });
        }

        // Botón de toggle grilla
        const toggleBtn = document.getElementById('toggle-grid-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleGrid());
        }

        // Botón flotante (FAB) para agregar spot en mobile
        const fabAddSpot = document.getElementById('fab-add-spot');
        if (fabAddSpot) {
            fabAddSpot.addEventListener('click', () => {
                if (this.mapCore) {
                    // Activar modo creación de spot (como en desktop)
                    this.mapCore.activateSpotCreation();
                } else {
                    this.showNotification('Mapa no disponible', 'error');
                }
            });
        }
    }

    // ✅ NUEVO: Mostrar/ocultar grilla
    toggleGrid() {
        const gridContainer = document.getElementById('spots-grid-container');
        const toggleBtn = document.getElementById('toggle-grid-btn');
        
        if (gridContainer && toggleBtn) {
            if (gridContainer.style.display === 'none') {
                gridContainer.style.display = 'block';
                toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } else {
                gridContainer.style.display = 'none';
                toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            }
        }
    }

    // ✅ NUEVO: Mostrar error en la grilla
    showGridError(message = 'Error cargando los spots') {
        const gridContainer = document.getElementById('spots-grid');
        if (gridContainer) {
            gridContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${message}
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="app.initializeMapGrid()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    // ✅ NUEVO: Método para limpiar recursos cuando se cierra la aplicación
    cleanup() {
        console.log('🧹 Limpiando recursos de la aplicación...');
        
        if (this.mapCore && this.mapCore.cleanup) {
            this.mapCore.cleanup();
        }
        
        // ✅ LIMPIAR GRILLA SI EXISTE
        if (this.simpleGrid) {
            this.simpleGrid.cleanup();
            this.simpleGrid = null;
        }
        
        // Limpiar event listeners
        document.removeEventListener('click', this.handleGlobalClick);
        document.removeEventListener('submit', this.handleFormSubmit);
        
        console.log('✅ Aplicación limpiada correctamente');
    }
}

// ==================================================
// INICIALIZACIÓN
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM cargado, inicializando aplicación...');
    window.app = new PescaApp();
    
    // ✅ Hacer métodos globales disponibles (actualizados para Router)
    window.showAuth = () => window.app.router.goTo('/auth');
    window.showProfile = () => window.app.router.goTo('/perfil');
    window.showMapPage = () => window.app.router.goTo('/mapa');
    window.showWeatherPage = () => window.app.router.goTo('/clima');
    window.showFishingPage = () => window.app.router.goTo('/pesca');
    window.showHomePage = () => window.app.router.goTo('/home');
    window.showFriendsPage = () => window.app.router.goTo('/amigos');
    window.showGuidesPage = () => window.app.router.goTo('/guias');
    
    // ✅ NUEVO: Método global para reinicializar grilla
    window.reinitializeGrid = () => {
        if (window.app && window.app.reinitializeGrid) {
            window.app.reinitializeGrid();
        }
    };

    // ✅ NUEVO: Método global para recargar grilla
    window.reloadGrid = () => {
        if (window.app && window.app.reloadGrid) {
            window.app.reloadGrid();
        }
    };

    // ✅ NUEVO: Método global para cargar módulos de guías
    window.loadGuidesModules = async () => {
        if (window.app && window.app.loadGuidesModules) {
            await window.app.loadGuidesModules();
        }
    };
});

// ✅ NUEVO: Limpiar recursos cuando se cierra la página
window.addEventListener('beforeunload', function() {
    if (window.app && window.app.cleanup) {
        window.app.cleanup();
    }
});

console.log('✅ Configuración de guías completada');