// ==================================================
// INTERFAZ DE USUARIO PARA GUÍAS - VERSIÓN CORREGIDA
// ==================================================

console.log('🚀 Cargando guides-ui.js (versión corregida)...');

// ==================================================
// IMPORTACIONES CORREGIDAS
// ==================================================

// Importar el módulo de guías
import { guidesModule } from './guides.js';

// Sistema de carga segura de dependencias UI
let showModal, closeModal, showNotification;
let dependenciesLoaded = false;

// Función para cargar todas las dependencias UI
const loadUIDependencies = async () => {
    if (dependenciesLoaded) return true;
    
    console.log('📦 Cargando dependencias UI...');
    
    try {
        // Cargar models.js - RUTA CORRECTA: ../ui/ (un nivel arriba desde guides)
        const modelsModule = await import('../ui/models.js');
        showModal = modelsModule.showModal || modelsModule.default?.showModal;
        closeModal = modelsModule.closeModal || modelsModule.default?.closeModal;
        
        if (!showModal || !closeModal) {
            console.warn('⚠️ Funciones de modal no encontradas en models.js');
            createModalFallback();
        }
    } catch (error) {
        console.error('❌ Error cargando models.js:', error);
        createModalFallback();
    }

    try {
        // Cargar notifications.js - RUTA CORRECTA: ../ui/ (un nivel arriba desde guides)
        const notificationsModule = await import('../ui/notifications.js');
        showNotification = notificationsModule.showNotification || notificationsModule.default?.showNotification;
        
        if (!showNotification) {
            console.warn('⚠️ showNotification no encontrado en notifications.js');
            createNotificationFallback();
        }
    } catch (error) {
        console.error('❌ Error cargando notifications.js:', error);
        createNotificationFallback();
    }
    
    dependenciesLoaded = true;
    console.log('✅ Dependencias UI cargadas');
    return true;
};

// Fallback para modales
function createModalFallback() {
    console.log('🔄 Usando sistema de modales fallback');
    
    showModal = (content, options = {}) => {
        console.log('📦 Mostrando modal (fallback):', content);
        
        // Verificar si ya hay un modal abierto
        const existingModals = document.querySelectorAll('.modal-overlay');
        if (existingModals.length > 0) {
            console.log('⚠️ Ya hay un modal abierto, cerrando primero...');
            existingModals.forEach(modal => modal.remove());
        }
        
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9998;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            max-width: ${options.size === 'lg' ? '800px' : options.size === 'md' ? '500px' : '400px'};
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        
        // Header del modal
        if (options.title) {
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.style.cssText = `
                padding: 15px 20px;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            const title = document.createElement('h5');
            title.textContent = options.title;
            title.style.margin = '0';
            header.appendChild(title);
            
            if (options.showCloseButton !== false) {
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '&times;';
                closeBtn.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                `;
                closeBtn.onclick = () => overlay.remove();
                header.appendChild(closeBtn);
            }
            
            modal.appendChild(header);
        }
        
        // Body del modal
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.cssText = 'padding: 20px;';
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        } else {
            body.innerHTML = '<p>Contenido no válido</p>';
        }
        
        modal.appendChild(body);
        
        // Footer del modal (opcional)
        if (options.buttons) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            footer.style.cssText = `
                padding: 15px 20px;
                border-top: 1px solid #dee2e6;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            `;
            
            options.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.textContent = btn.text;
                button.className = `btn ${btn.class || 'btn-secondary'}`;
                button.onclick = (e) => {
                    if (btn.onClick) btn.onClick(e);
                    if (btn.closeOnClick !== false) overlay.remove();
                };
                footer.appendChild(button);
            });
            
            modal.appendChild(footer);
        }
        
        // Ensamblar
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Cerrar al hacer clic fuera
        if (options.closeOnOutsideClick !== false) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });
        }
        
        // Cerrar con ESC
        if (options.closeOnEsc !== false) {
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            overlay._escHandler = escHandler;
        }
        
        // Retornar ID del modal
        const modalId = `modal-${Date.now()}`;
        overlay.id = modalId;
        
        return modalId;
    };
    
    closeModal = (modalId) => {
        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.remove();
        } else {
            // Cerrar el último modal
            const modals = document.querySelectorAll('.modal-overlay');
            if (modals.length > 0) {
                modals[modals.length - 1].remove();
            }
        }
    };
}

// Fallback para notificaciones
function createNotificationFallback() {
    console.log('🔄 Usando sistema de notificaciones fallback');
    
    showNotification = (message, type = 'info') => {
        console.log(`📢 [${type.toUpperCase()}]: ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            padding: 15px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        
        // Icono según tipo
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 10px;">
                <div style="font-size: 1.2em;">${icons[type] || 'ℹ️'}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 5px;">
                        ${type === 'success' ? 'Éxito' : 
                          type === 'error' ? 'Error' : 
                          type === 'warning' ? 'Advertencia' : 'Información'}
                    </div>
                    <div>${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">
                    &times;
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) notification.remove();
                }, 300);
            }
        }, 5000);
        
        return notification;
    };
    
    // Agregar estilos para animaciones
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================================================
// CLASE PRINCIPAL DE LA UI - VERSIÓN CORREGIDA
// ==================================================

class GuidesUI {
    constructor() {
        console.log('🎨 Constructor de GuidesUI llamado');
        this.isInitialized = false;
        this.eventListeners = new Map(); // Para rastrear listeners
        this.modals = new Map(); // Para rastrear modales abiertos
        this.debounceTimers = new Map(); // Para prevenir clics rápidos
        this.isShowingRegisterForm = false; // Control de formulario de registro
        this.currentModalOverlay = null; // Referencia al modal actual
        
        // Inicializar después de cargar dependencias
        this.init();
    }

    async init() {
        if (this.isInitialized) {
            console.log('✅ GuidesUI ya está inicializado');
            return;
        }
        
        console.log('🔄 Inicializando GuidesUI...');
        
        try {
            // 1. Cargar dependencias UI
            await loadUIDependencies();
            
            // 2. Configurar eventos
            this.setupEventListeners();
            
            // 3. Inicializar módulo de guías si es necesario
            if (!guidesModule.isInitialized) {
                await guidesModule.init();
            }
            
            this.isInitialized = true;
            console.log('✅ GuidesUI inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error crítico inicializando GuidesUI:', error);
            throw error;
        }
    }

    // ✅ NUEVO: Método para limpiar event listeners
    cleanupEventListeners() {
        this.eventListeners.forEach(({ element, type, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(type, handler);
            }
        });
        this.eventListeners.clear();
    }

    // ✅ CORREGIDO: Configuración de eventos con prevención de duplicados
    setupEventListeners() {
        console.log('🔗 Configurando eventos de UI...');
        
        // Limpiar cualquier listener anterior
        this.cleanupEventListeners();
        
        // Usar delegación de eventos con debouncing
        const eventHandler = (e) => {
            const target = e.target;
            
            // Botón para registrarse como guía
            if (target.closest('#registerGuideBtn')) {
                e.preventDefault();
                e.stopImmediatePropagation(); // 🔥 IMPORTANTE: Evitar propagación múltiple
                this.debouncedCall('registerGuide', () => this.showRegisterGuideForm());
                return;
            }
            
            // Botón para ver detalles de guía
            if (target.closest('.view-guide-btn')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const btn = target.closest('.view-guide-btn');
                const guideId = btn?.dataset?.guideId || btn?.getAttribute('data-guide-id');
                if (guideId) this.debouncedCall(`view-guide-${guideId}`, () => this.showGuideDetails(guideId));
                return;
            }
            
            // Botón para filtrar guías
            if (target.closest('#filterGuidesBtn')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.debouncedCall('filterGuides', () => this.filterGuides());
                return;
            }
            
            // Botón para crear spot como guía
            if (target.closest('#createGuideSpotBtn')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.debouncedCall('createGuideSpot', () => this.showCreateGuideSpotForm());
                return;
            }
            
            // Botón para contactar guía
            if (target.closest('.contact-guide-btn')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const btn = target.closest('.contact-guide-btn');
                const guideId = btn?.dataset?.guideId || btn?.getAttribute('data-guide-id');
                if (guideId) this.debouncedCall(`contact-guide-${guideId}`, () => this.contactGuide(guideId));
                return;
            }
            
            // Botón para mostrar todas las guías
            if (target.closest('#showAllGuidesBtn')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.debouncedCall('showAllGuides', () => this.renderGuidesList());
                return;
            }
            
            // Botón para agregar reseña
            if (target.closest('#addReviewBtn')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const btn = target.closest('#addReviewBtn');
                const guideId = btn?.dataset?.guideId || btn?.getAttribute('data-guide-id');
                if (guideId) this.debouncedCall(`add-review-${guideId}`, () => this.showAddReviewForm(guideId));
                return;
            }
        };
        
        // Agregar listener con capture: false para evitar duplicados
        document.addEventListener('click', eventHandler, { capture: true });
        
        // Guardar referencia para limpiar después
        this.eventListeners.set('document-click', {
            element: document,
            type: 'click',
            handler: eventHandler
        });
        
        // Escuchar eventos de cambio de ruta
        const routeHandler = (e) => {
            if (e.detail?.route === '/guias') {
                console.log('📍 Ruta cambiada a /guias, renderizando lista...');
                this.renderGuidesList();
            }
        };
        
        document.addEventListener('routeChanged', routeHandler);
        this.eventListeners.set('route-changed', {
            element: document,
            type: 'routeChanged',
            handler: routeHandler
        });
        
        // Escuchar eventos de autenticación
        const authHandlers = {
            userLoggedIn: () => {
                console.log('👤 Usuario inició sesión, actualizando UI...');
                this.updateUIBasedOnAuth();
            },
            userLoggedOut: () => {
                console.log('👋 Usuario cerró sesión, actualizando UI...');
                this.updateUIBasedOnAuth();
            },
            guideRegistered: () => {
                console.log('📝 Guía registrado, actualizando UI...');
                this.updateUIBasedOnAuth();
            }
        };
        
        Object.entries(authHandlers).forEach(([event, handler]) => {
            document.addEventListener(event, handler);
            this.eventListeners.set(event, {
                element: document,
                type: event,
                handler: handler
            });
        });
    }

    // ✅ NUEVO: Método debounce para prevenir múltiples llamadas
    debouncedCall(key, callback, delay = 300) {
        const timerKey = `debounce-${key}`;
        
        // Limpiar timer anterior
        if (this.debounceTimers.has(timerKey)) {
            clearTimeout(this.debounceTimers.get(timerKey));
        }
        
        // Establecer nuevo timer
        const timer = setTimeout(() => {
            callback();
            this.debounceTimers.delete(timerKey);
        }, delay);
        
        this.debounceTimers.set(timerKey, timer);
    }

    // ✅ CORREGIDO: Método para mostrar formulario de registro con verificación
    async showRegisterGuideForm() {
        console.log('📝 Mostrando formulario de registro de guía (método principal)');
        
        // 🔥 VERIFICACIÓN CRÍTICA: Evitar múltiples llamadas
        if (this.isShowingRegisterForm) {
            console.log('⚠️ Ya se está mostrando el formulario, ignorando...');
            return;
        }
        
        this.isShowingRegisterForm = true;
        
        try {
            // Verificar autenticación
            const token = localStorage.getItem('pesca_token');
            if (!token) {
                if (showNotification) {
                    showNotification('Debes iniciar sesión para registrarte como guía', 'error');
                }
                this.isShowingRegisterForm = false;
                return;
            }
            
            // Obtener usuario actual
            const userData = localStorage.getItem('pesca_user');
            let user = {};
            try {
                user = userData ? JSON.parse(userData) : {};
            } catch (e) {
                console.error('❌ Error parseando datos de usuario:', e);
            }
            
            // Verificar si ya es guía
            if (guidesModule.isGuide()) {
                if (showNotification) {
                    showNotification('Ya estás registrado como guía', 'info');
                }
                this.isShowingRegisterForm = false;
                return;
            }
            
            // ✅ NUEVO: Verificar si ya hay un modal abierto
            const existingModal = document.querySelector('.modal-overlay.guides-modal');
            if (existingModal) {
                console.log('⚠️ Ya hay un modal abierto, cerrando primero...');
                existingModal.remove();
            }
            
            const modalContent = `
                <div class="register-guide-form">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-user-tie me-2"></i> Registrarse como Guía de Pesca
                        </h5>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-3">
                            <i class="fas fa-info-circle me-2"></i>
                            Completa tu información profesional para ofrecer servicios como guía de pesca.
                        </div>
                        
                        <form id="registerGuideForm">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-id-card me-1"></i> Número de Licencia
                                        </label>
                                        <input type="text" class="form-control" name="license_number" required 
                                               placeholder="Ej: ARG-2024-001">
                                        <small class="form-text text-muted">Número oficial de tu licencia de guía</small>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-calendar-alt me-1"></i> Años de Experiencia
                                        </label>
                                        <input type="number" class="form-control" name="years_experience" 
                                               min="1" max="50" required placeholder="5">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group mb-3">
                                <label class="form-label">
                                    <i class="fas fa-info-circle me-1"></i> Descripción Profesional
                                </label>
                                <textarea class="form-control" name="description" rows="4" required 
                                          placeholder="Describe tu experiencia, especialidades, equipamiento..."></textarea>
                            </div>
                            
                            <div class="form-group mb-3">
                                <label class="form-label">
                                    <i class="fas fa-concierge-bell me-1"></i> Especialidades
                                </label>
                                <div class="tags-input-container">
                                    <input type="text" class="form-control" id="specialtiesInput" 
                                           placeholder="Escribe una especialidad y presiona Enter">
                                    <div id="specialtiesTags" class="tags-container mt-2"></div>
                                </div>
                                <small class="form-text text-muted">
                                    Ej: Pesca embarcada, Pesca costera, Fly fishing, Pesca nocturna
                                </small>
                                <input type="hidden" name="specialties" id="specialtiesHidden">
                            </div>
                            
                            <div class="form-group mb-3">
                                <label class="form-label">
                                    <i class="fas fa-map-marked-alt me-1"></i> Zonas de Operación
                                </label>
                                <div class="tags-input-container">
                                    <input type="text" class="form-control" id="zonesInput" 
                                           placeholder="Escribe una zona y presiona Enter">
                                    <div id="zonesTags" class="tags-container mt-2"></div>
                                </div>
                                <small class="form-text text-muted">
                                    Ej: Mar del Plata, Necochea, Miramar, Buenos Aires
                                </small>
                                <input type="hidden" name="zones" id="zonesHidden">
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-dollar-sign me-1"></i> Precio por Día (USD)
                                        </label>
                                        <input type="number" class="form-control" name="price_per_day" 
                                               min="0" step="0.01" placeholder="150.00">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-phone me-1"></i> Teléfono de Contacto
                                        </label>
                                        <input type="tel" class="form-control" name="contact_phone" 
                                               placeholder="+54 9 223 123-4567" 
                                               value="${user.whatsapp || user.phone || ''}">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group mb-3">
                                <label class="form-label">
                                    <i class="fas fa-envelope me-1"></i> Email de Contacto
                                </label>
                                <input type="email" class="form-control" name="contact_email" 
                                       value="${user.email || ''}">
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="termsCheck" required>
                                <label class="form-check-label" for="termsCheck">
                                    Acepto los términos y condiciones para guías de pesca
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelGuideForm">
                            <i class="fas fa-times me-1"></i> Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="submitGuideForm">
                            <i class="fas fa-check me-1"></i> Registrar como Guía
                        </button>
                    </div>
                </div>
            `;
            
            // ✅ NUEVO: Usar nuestro propio modal en lugar de showModal
            this.showCustomModal(modalContent, 'Registro de Guía', 'lg');
            
        } catch (error) {
            console.error('❌ Error mostrando formulario de registro:', error);
            this.isShowingRegisterForm = false;
        }
    }

    // ✅ NUEVO: Método para mostrar modal personalizado
    showCustomModal(content, title = 'Modal', size = 'md') {
        console.log('📦 Mostrando modal personalizado');
        
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay guides-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9998;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        // Determinar tamaño
        const maxWidth = size === 'lg' ? '800px' : size === 'md' ? '600px' : '400px';
        
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            max-width: ${maxWidth};
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        
        // Header del modal
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.style.cssText = `
            padding: 15px 20px;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const titleElement = document.createElement('h5');
        titleElement.textContent = title;
        titleElement.style.margin = '0';
        header.appendChild(titleElement);
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        `;
        closeBtn.onclick = () => {
            this.closeCurrentModal();
        };
        header.appendChild(closeBtn);
        
        modal.appendChild(header);
        
        // Body del modal
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.cssText = 'padding: 20px;';
        body.innerHTML = content;
        modal.appendChild(body);
        
        // Ensamblar
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Guardar referencia
        this.currentModalOverlay = overlay;
        
        // Cerrar al hacer clic fuera
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeCurrentModal();
            }
        });
        
        // Cerrar con ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeCurrentModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        overlay._escHandler = escHandler;
        
        // Inicializar tags después de agregar al DOM
        setTimeout(() => {
            this.initTagsInput('specialtiesInput', 'specialtiesTags', 'specialtiesHidden');
            this.initTagsInput('zonesInput', 'zonesTags', 'zonesHidden');
            
            // Configurar botón de cancelar
            const cancelBtn = document.getElementById('cancelGuideForm');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeCurrentModal();
                });
            }
            
            // Configurar botón de envío
            const submitBtn = document.getElementById('submitGuideForm');
            if (submitBtn) {
                submitBtn.addEventListener('click', async () => {
                    const form = document.getElementById('registerGuideForm');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                    
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    
                    // Procesar tags como arrays JSON
                    try {
                        data.specialties = JSON.parse(data.specialties || '[]');
                        data.zones = JSON.parse(data.zones || '[]');
                    } catch (error) {
                        data.specialties = data.specialties ? data.specialties.split(',').map(s => s.trim()) : [];
                        data.zones = data.zones ? data.zones.split(',').map(z => z.trim()) : [];
                    }
                    
                    // Convertir años de experiencia a número
                    if (data.years_experience) {
                        data.years_experience = parseInt(data.years_experience);
                    }
                    
                    // Convertir precio a número
                    if (data.price_per_day) {
                        data.price_per_day = parseFloat(data.price_per_day);
                    }
                    
                    console.log('📤 Enviando datos de guía:', data);
                    
                    const result = await guidesModule.registerAsGuide(data);
                    if (result) {
                        this.closeCurrentModal();
                        
                        // Actualizar UI
                        this.updateUIBasedOnAuth();
                        
                        // Si estamos en la página de guías, actualizar la lista
                        if (window.location.hash === '#/guias') {
                            this.renderGuidesList();
                        }
                    }
                });
            }
        }, 100);
    }

    // ✅ NUEVO: Método para cerrar modal actual
    closeCurrentModal() {
        console.log('🔒 Cerrando modal actual');
        
        if (this.currentModalOverlay) {
            // Remover event listener ESC si existe
            if (this.currentModalOverlay._escHandler) {
                document.removeEventListener('keydown', this.currentModalOverlay._escHandler);
            }
            
            this.currentModalOverlay.remove();
            this.currentModalOverlay = null;
        }
        
        // También cerrar cualquier otro modal de guides
        const existingModals = document.querySelectorAll('.modal-overlay.guides-modal');
        existingModals.forEach(modal => modal.remove());
        
        // Restablecer flag
        this.isShowingRegisterForm = false;
        
        // Limpiar debounce timers relacionados
        this.debounceTimers.forEach((timer, key) => {
            if (key.startsWith('debounce-registerGuide')) {
                clearTimeout(timer);
                this.debounceTimers.delete(key);
            }
        });
    }

    // ✅ ACTUALIZADO: Método para cerrar el formulario de registro
    closeRegisterForm() {
        this.closeCurrentModal();
    }

    updateUIBasedOnAuth() {
        // Actualizar botones basados en autenticación
        const registerBtn = document.getElementById('registerGuideBtn');
        const createSpotBtn = document.getElementById('createGuideSpotBtn');
        
        const isAuthenticated = !!localStorage.getItem('pesca_token');
        const isGuide = guidesModule.isGuide();
        
        if (registerBtn) {
            if (isAuthenticated && !isGuide) {
                registerBtn.style.display = 'inline-block';
            } else {
                registerBtn.style.display = 'none';
            }
        }
        
        if (createSpotBtn) {
            if (isAuthenticated && isGuide) {
                createSpotBtn.style.display = 'inline-block';
            } else {
                createSpotBtn.style.display = 'none';
            }
        }
    }

    initTagsInput(inputId, tagsContainerId, hiddenInputId) {
        const input = document.getElementById(inputId);
        const tagsContainer = document.getElementById(tagsContainerId);
        const hiddenInput = document.getElementById(hiddenInputId);
        
        if (!input || !tagsContainer || !hiddenInput) {
            console.warn(`⚠️ No se encontraron elementos para tags input: ${inputId}`);
            return;
        }
        
        let tags = [];
        
        const updateHiddenInput = () => {
            hiddenInput.value = JSON.stringify(tags);
        };
        
        const createTag = (text) => {
            const tag = document.createElement('span');
            tag.className = 'badge bg-primary me-1 mb-1';
            tag.innerHTML = `
                ${text}
                <button type="button" class="btn-close btn-close-white btn-sm ms-1" 
                        style="font-size: 0.6rem;" data-tag="${text}"></button>
            `;
            
            tag.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                const tagText = e.target.dataset.tag;
                tags = tags.filter(t => t !== tagText);
                updateHiddenInput();
                renderTags();
            });
            
            return tag;
        };
        
        const renderTags = () => {
            tagsContainer.innerHTML = '';
            tags.forEach(tagText => {
                tagsContainer.appendChild(createTag(tagText));
            });
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tagText = input.value.trim();
                
                if (tagText && !tags.includes(tagText)) {
                    tags.push(tagText);
                    updateHiddenInput();
                    renderTags();
                    input.value = '';
                }
            }
        });
        
        // Inicializar
        updateHiddenInput();
    }

    async renderGuidesList(filters = {}) {
        console.log('📋 Renderizando lista de guías con filtros:', filters);
        
        const container = document.getElementById('guidesListContainer');
        if (!container) {
            console.warn('⚠️ No se encontró el contenedor de guías (#guidesListContainer)');
            
            // Intentar encontrar contenedor alternativo
            const mainContent = document.getElementById('main-content');
            if (mainContent && !mainContent.querySelector('#guidesListContainer')) {
                mainContent.innerHTML = `
                    <div class="container py-5">
                        <div id="guidesListContainer">
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                </div>
                                <p class="mt-2">Cargando guías de pesca...</p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return;
            }
        }
        
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Cargando guías de pesca...</p>
            </div>
        `;
        
        try {
            const guides = await guidesModule.getGuides(filters);
            
            if (guides.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-users-slash fa-3x text-muted mb-3"></i>
                        <h3>No se encontraron guías</h3>
                        <p class="text-muted">No hay guías disponibles con los filtros seleccionados.</p>
                        <button class="btn btn-outline-primary mt-2" id="showAllGuidesBtn">
                            <i class="fas fa-eye me-1"></i> Ver todos los guías
                        </button>
                    </div>
                `;
                return;
            }
            
            const html = `
                <div class="row g-4">
                    ${guides.map(guide => `
                        <div class="col-md-6 col-lg-4">
                            <div class="card guide-card h-100 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex align-items-start mb-3">
                                        <div class="guide-avatar me-3 position-relative">
                                            <img src="${guide.profile_pic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guide.name) + '&background=007bff&color=fff'}" 
                                                 class="rounded-circle" width="60" height="60" alt="${guide.name}"
                                                 style="object-fit: cover;">
                                            ${guide.is_verified ? 
                                                '<span class="badge bg-success position-absolute top-0 start-100 translate-middle" title="Guía verificado"><i class="fas fa-check"></i></span>' : 
                                                ''}
                                        </div>
                                        <div>
                                            <h5 class="card-title mb-1">${this.escapeHtml(guide.name)}</h5>
                                            <div class="guide-rating mb-2">
                                                ${this.renderStars(guide.rating || 0)}
                                                <small class="text-muted ms-1">
                                                    ${guide.rating ? guide.rating.toFixed(1) : 'N/A'}
                                                    ${guide.total_reviews ? `(${guide.total_reviews})` : ''}
                                                </small>
                                            </div>
                                            ${guide.years_experience ? `
                                                <div class="text-muted small">
                                                    <i class="fas fa-calendar-alt me-1"></i>
                                                    ${guide.years_experience} años de experiencia
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    
                                    <p class="card-text text-muted small mb-3">
                                        ${guide.description ? 
                                            (guide.description.length > 120 ? 
                                                this.escapeHtml(guide.description.substring(0, 120)) + '...' : 
                                                this.escapeHtml(guide.description)) : 
                                            'Sin descripción disponible'}
                                    </p>
                                    
                                    ${guide.location ? `
                                        <div class="mb-2">
                                            <i class="fas fa-map-marker-alt text-primary me-1"></i>
                                            <span class="small">${this.escapeHtml(guide.location)}</span>
                                        </div>
                                    ` : ''}
                                    
                                    ${guide.price_per_day ? `
                                        <div class="mb-3">
                                            <i class="fas fa-dollar-sign text-success me-1"></i>
                                            <strong>$${guide.price_per_day}/día</strong>
                                        </div>
                                    ` : ''}
                                    
                                    ${guide.specialties && guide.specialties.length > 0 ? `
                                        <div class="mb-3">
                                            <div class="small text-muted mb-1">Especialidades:</div>
                                            <div class="d-flex flex-wrap gap-1">
                                                ${guide.specialties.slice(0, 3).map(spec => `
                                                    <span class="badge bg-light text-dark border">${this.escapeHtml(spec)}</span>
                                                `).join('')}
                                                ${guide.specialties.length > 3 ? 
                                                    `<span class="badge bg-light text-dark border">+${guide.specialties.length - 3}</span>` : 
                                                    ''}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="card-footer bg-transparent border-top-0 pt-0">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-primary btn-sm view-guide-btn" data-guide-id="${guide.id}">
                                            <i class="fas fa-eye me-1"></i> Ver Perfil Completo
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm contact-guide-btn" data-guide-id="${guide.id}">
                                            <i class="fas fa-envelope me-1"></i> Contactar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('❌ Error renderizando lista de guías:', error);
            
            container.innerHTML = `
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle"></i> Error al cargar guías</h4>
                    <p>No se pudo cargar la lista de guías. Por favor, intenta de nuevo más tarde.</p>
                    <button class="btn btn-outline-danger btn-sm mt-2" onclick="guidesUI.renderGuidesList()">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            `;
        }
    }

    async showGuideDetails(guideId) {
        console.log(`👤 Mostrando detalles del guía ID: ${guideId}`);
        
        try {
            const guide = await guidesModule.getGuideById(guideId);
            if (!guide) {
                if (showNotification) {
                    showNotification('Guía no encontrado', 'error');
                }
                return;
            }
            
            const modalContent = `
                <div class="guide-details">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-user-tie me-2"></i> ${this.escapeHtml(guide.name)}
                            ${guide.is_verified ? 
                                '<span class="badge bg-success ms-2"><i class="fas fa-check"></i> Verificado</span>' : 
                                ''}
                        </h5>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4 text-center mb-3">
                                <img src="${guide.profile_pic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guide.name) + '&background=007bff&color=fff&size=200'}" 
                                     class="img-fluid rounded-circle mb-3" style="max-width: 200px; height: 200px; object-fit: cover;" alt="${this.escapeHtml(guide.name)}">
                                
                                <div class="guide-rating-large mb-3">
                                    ${this.renderStars(guide.rating || 0)}
                                    <div class="mt-1">
                                        <strong>${guide.rating ? guide.rating.toFixed(1) : 'N/A'}</strong>
                                        <span class="text-muted">/5.0</span>
                                        ${guide.total_reviews ? 
                                            `<div class="small text-muted">${guide.total_reviews} reseñas</div>` : 
                                            ''}
                                    </div>
                                </div>
                                
                                ${guide.price_per_day ? `
                                    <div class="price-display mb-3">
                                        <div class="text-muted small">Precio por día</div>
                                        <div class="h4 text-success">$${guide.price_per_day}</div>
                                    </div>
                                ` : ''}
                                
                                ${guide.contact_phone ? `
                                    <div class="mt-3">
                                        <a href="tel:${guide.contact_phone}" class="btn btn-outline-primary btn-sm">
                                            <i class="fas fa-phone me-1"></i> Llamar
                                        </a>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="col-md-8">
                                <div class="mb-4">
                                    <h6 class="border-bottom pb-2">
                                        <i class="fas fa-info-circle me-2"></i> Información del Guía
                                    </h6>
                                    
                                    ${guide.license_number ? `
                                        <div class="row mb-2">
                                            <div class="col-sm-4 text-muted">Licencia:</div>
                                            <div class="col-sm-8">${this.escapeHtml(guide.license_number)}</div>
                                        </div>
                                    ` : ''}
                                    
                                    ${guide.years_experience ? `
                                        <div class="row mb-2">
                                            <div class="col-sm-4 text-muted">Experiencia:</div>
                                            <div class="col-sm-8">
                                                <i class="fas fa-calendar-alt me-1 text-primary"></i>
                                                ${guide.years_experience} años
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    ${guide.location ? `
                                        <div class="row mb-2">
                                            <div class="col-sm-4 text-muted">Ubicación:</div>
                                            <div class="col-sm-8">
                                                <i class="fas fa-map-marker-alt me-1 text-primary"></i>
                                                ${this.escapeHtml(guide.location)}
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    ${guide.email ? `
                                        <div class="row mb-2">
                                            <div class="col-sm-4 text-muted">Email:</div>
                                            <div class="col-sm-8">
                                                <i class="fas fa-envelope me-1 text-primary"></i>
                                                ${this.escapeHtml(guide.email)}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                                
                                ${guide.description ? `
                                    <div class="mb-4">
                                        <h6 class="border-bottom pb-2">
                                            <i class="fas fa-file-alt me-2"></i> Descripción
                                        </h6>
                                        <p class="mb-0">${this.escapeHtml(guide.description)}</p>
                                    </div>
                                ` : ''}
                                
                                ${guide.specialties && guide.specialties.length > 0 ? `
                                    <div class="mb-4">
                                        <h6 class="border-bottom pb-2">
                                            <i class="fas fa-concierge-bell me-2"></i> Especialidades
                                        </h6>
                                        <div class="d-flex flex-wrap gap-2">
                                            ${guide.specialties.map(spec => `
                                                <span class="badge bg-primary">${this.escapeHtml(spec)}</span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${guide.zones && guide.zones.length > 0 ? `
                                    <div class="mb-4">
                                        <h6 class="border-bottom pb-2">
                                            <i class="fas fa-map-marked-alt me-2"></i> Zonas de Operación
                                        </h6>
                                        <div class="d-flex flex-wrap gap-2">
                                            ${guide.zones.map(zone => `
                                                <span class="badge bg-light text-dark border">${this.escapeHtml(zone)}</span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">
                            <i class="fas fa-times me-1"></i> Cerrar
                        </button>
                        <button type="button" class="btn btn-primary" id="addReviewBtn" data-guide-id="${guide.id}">
                            <i class="fas fa-star me-1"></i> Agregar Reseña
                        </button>
                    </div>
                </div>
            `;
            
            showModal(modalContent, {
                title: 'Perfil del Guía',
                size: 'lg',
                showCloseButton: true
            });
            
        } catch (error) {
            console.error('❌ Error mostrando detalles del guía:', error);
            
            if (showNotification) {
                showNotification('Error al cargar información del guía', 'error');
            }
        }
    }

    showAddReviewForm(guideId) {
        console.log(`⭐ Mostrando formulario de reseña para guía ${guideId}`);
        
        const modalContent = `
            <div class="add-review-form">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-star me-2"></i> Agregar Reseña
                    </h5>
                </div>
                <div class="modal-body">
                    <form id="addReviewForm">
                        <div class="form-group mb-4">
                            <label class="form-label">Calificación</label>
                            <div class="star-rating" id="starRating">
                                ${[1, 2, 3, 4, 5].map(i => `
                                    <i class="far fa-star fa-2x me-1" data-rating="${i}" 
                                       style="cursor: pointer; color: #ffc107;"></i>
                                `).join('')}
                            </div>
                            <input type="hidden" name="rating" id="selectedRating" value="0" required>
                        </div>
                        
                        <div class="form-group mb-3">
                            <label class="form-label">Comentario (opcional)</label>
                            <textarea class="form-control" name="comment" rows="4" 
                                      placeholder="Comparte tu experiencia con este guía..."></textarea>
                        </div>
                        
                        <div class="form-group mb-3">
                            <label class="form-label">Fecha del viaje</label>
                            <input type="date" class="form-control" name="trip_date">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times me-1"></i> Cancelar
                    </button>
                    <button type="button" class="btn btn-primary" id="submitReviewBtn">
                        <i class="fas fa-check me-1"></i> Enviar Reseña
                    </button>
                </div>
            </div>
        `;
        
        const modalId = showModal(modalContent, {
            title: 'Agregar Reseña',
            size: 'md',
            showCloseButton: true
        });
        
        // Estrellas interactivas
        const stars = document.querySelectorAll('#starRating .fa-star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                document.getElementById('selectedRating').value = rating;
                
                stars.forEach((s, i) => {
                    if (i < rating) {
                        s.classList.remove('far');
                        s.classList.add('fas');
                    } else {
                        s.classList.remove('fas');
                        s.classList.add('far');
                    }
                });
            });
        });
        
        // Manejar envío
        const submitBtn = document.getElementById('submitReviewBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const form = document.getElementById('addReviewForm');
                const rating = document.getElementById('selectedRating').value;
                
                if (rating === '0') {
                    if (showNotification) {
                        showNotification('Por favor selecciona una calificación', 'error');
                    }
                    return;
                }
                
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.rating = parseInt(rating);
                
                const result = await guidesModule.addReview(guideId, data);
                if (result) {
                    closeModal(modalId);
                    
                    if (showNotification) {
                        showNotification('Reseña agregada correctamente', 'success');
                    }
                    
                    // Volver a mostrar detalles del guía actualizado
                    this.showGuideDetails(guideId);
                }
            });
        }
    }

    showCreateGuideSpotForm() {
        console.log('📍 Mostrando formulario de creación de spot');
        
        if (!guidesModule.isGuide()) {
            if (showNotification) {
                showNotification('Debes ser guía para crear spots especiales', 'error');
            }
            return;
        }
        
        const modalContent = `
            <div class="create-guide-spot-form">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-map-marker-alt me-2"></i> Crear Spot de Guía
                    </h5>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info mb-3">
                        <i class="fas fa-info-circle me-2"></i>
                        Los spots de guía aparecen con un icono especial en el mapa y son visibles para otros usuarios.
                    </div>
                    
                    <form id="createGuideSpotForm">
                        <div class="form-group mb-3">
                            <label class="form-label">Nombre del Spot</label>
                            <input type="text" class="form-control" name="name" required 
                                   placeholder="Ej: Mejor punto para pesca costera">
                        </div>
                        
                        <div class="form-group mb-3">
                            <label class="form-label">Descripción</label>
                            <textarea class="form-control" name="description" rows="3" 
                                      placeholder="Describe las características del spot..."></textarea>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label class="form-label">Latitud</label>
                                    <input type="number" class="form-control" name="latitude" step="any" required 
                                           id="guideSpotLat" placeholder="Ej: -38.028000">
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label class="form-label">Longitud</label>
                                    <input type="number" class="form-control" name="longitude" step="any" required 
                                           id="guideSpotLng" placeholder="Ej: -57.531000">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group mb-3">
                            <button type="button" class="btn btn-outline-secondary btn-sm" id="selectLocationBtn">
                                <i class="fas fa-map me-1"></i> Seleccionar en mapa
                            </button>
                        </div>
                        
                        <div class="form-group mb-3">
                            <label class="form-label">Especies de peces (separadas por coma)</label>
                            <input type="text" class="form-control" name="fish_species" 
                                   placeholder="Ej: corvina, pescadilla, lenguado">
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label class="form-label">Mejor temporada</label>
                                    <select class="form-control" name="best_season">
                                        <option value="">Cualquiera</option>
                                        <option value="verano">Verano</option>
                                        <option value="otoño">Otoño</option>
                                        <option value="invierno">Invierno</option>
                                        <option value="primavera">Primavera</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label class="form-label">Acceso</label>
                                    <select class="form-control" name="access_type">
                                        <option value="public">Público</option>
                                        <option value="private">Privado</option>
                                        <option value="restricted">Restringido</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="publicCheck" checked>
                            <label class="form-check-label" for="publicCheck">
                                Hacer spot público (visible para todos)
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times me-1"></i> Cancelar
                    </button>
                    <button type="button" class="btn btn-primary" id="submitGuideSpotBtn">
                        <i class="fas fa-plus me-1"></i> Crear Spot
                    </button>
                </div>
            </div>
        `;
        
        const modalId = showModal(modalContent, {
            title: 'Crear Spot de Guía',
            size: 'lg',
            showCloseButton: true
        });
        
        // Prellenar con ubicación actual si está disponible
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const latInput = document.getElementById('guideSpotLat');
                const lngInput = document.getElementById('guideSpotLng');
                if (latInput) latInput.value = position.coords.latitude.toFixed(6);
                if (lngInput) lngInput.value = position.coords.longitude.toFixed(6);
            }, () => {
                console.warn('⚠️ No se pudo obtener la ubicación actual');
            });
        }
        
        // Botón para seleccionar en mapa
        const selectLocationBtn = document.getElementById('selectLocationBtn');
        if (selectLocationBtn) {
            selectLocationBtn.addEventListener('click', () => {
                this.selectLocationOnMap();
            });
        }
        
        // Manejar envío
        const submitBtn = document.getElementById('submitGuideSpotBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const form = document.getElementById('createGuideSpotForm');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }
                
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                // Procesar especies
                if (data.fish_species) {
                    data.fish_species = data.fish_species.split(',').map(s => s.trim()).filter(s => s);
                }
                
                // Convertir público a booleano
                const publicCheck = document.getElementById('publicCheck');
                data.is_public = publicCheck ? publicCheck.checked : true;
                
                // Convertir coordenadas a números
                if (data.latitude) data.latitude = parseFloat(data.latitude);
                if (data.longitude) data.longitude = parseFloat(data.longitude);
                
                const result = await guidesModule.createGuideSpot(data);
                if (result) {
                    closeModal(modalId);
                    
                    if (showNotification) {
                        showNotification('Spot creado exitosamente', 'success');
                    }
                }
            });
        }
    }

    // ==================================================
    // MÉTODOS AUXILIARES
    // ==================================================

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += '<i class="fas fa-star text-warning"></i>';
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt text-warning"></i>';
            } else {
                stars += '<i class="far fa-star text-warning"></i>';
            }
        }
        return stars;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async filterGuides() {
        console.log('🔍 Aplicando filtros a guías');
        
        // Obtener valores de filtros
        const filterZone = document.getElementById('filterZone');
        const filterMinPrice = document.getElementById('filterMinPrice');
        const filterMaxPrice = document.getElementById('filterMaxPrice');
        const filterExperience = document.getElementById('filterExperience');
        const filterSpecialty = document.getElementById('filterSpecialty');
        
        const filters = {};
        if (filterZone && filterZone.value) filters.zone = filterZone.value;
        if (filterMinPrice && filterMinPrice.value) filters.min_price = filterMinPrice.value;
        if (filterMaxPrice && filterMaxPrice.value) filters.max_price = filterMaxPrice.value;
        if (filterExperience && filterExperience.value) filters.min_experience = filterExperience.value;
        if (filterSpecialty && filterSpecialty.value) filters.specialty = filterSpecialty.value;
        
        await this.renderGuidesList(filters);
    }

    contactGuide(guideId) {
        console.log(`📞 Contactando guía ID: ${guideId}`);
        
        if (showNotification) {
            showNotification('La función de contacto está en desarrollo. Próximamente podrás contactar directamente a los guías.', 'info');
        }
        
        // En una implementación real, esto abriría un chat o formulario de contacto
        // Por ahora, solo mostramos un mensaje
    }

    selectLocationOnMap() {
        console.log('🗺️ Seleccionando ubicación en mapa');
        
        if (showNotification) {
            showNotification('Selecciona una ubicación en el mapa principal. Esta función se integrará próximamente.', 'info');
        }
        
        // Esta función se integraría con el módulo de mapa
        // Por ahora solo muestra una notificación
    }
}

// ==================================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==================================================

// Crear instancia
const guidesUIInstance = new GuidesUI();

// Función para obtener la instancia (para uso asíncrono)
export const getGuidesUI = async () => {
    if (!guidesUIInstance.isInitialized) {
        await guidesUIInstance.init();
    }
    return guidesUIInstance;
};

// Exportar instancia directa
export const guidesUI = guidesUIInstance;

// Hacer disponible globalmente
window.guidesUI = guidesUIInstance;

// Exportar también por defecto
export default guidesUIInstance;

console.log('✅ guides-ui.js cargado y listo para usar');