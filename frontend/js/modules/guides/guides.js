// ==================================================
// MÓDULO DE GUÍAS - VERSIÓN DEFINITIVA
// ==================================================

console.log('🚀 Cargando módulo de guías...');

// ==================================================
// IMPORTACIONES CORREGIDAS
// ==================================================

// Importar constantes
import { API_BASE_URL } from '../../utils/constants.js';

// Sistema de carga segura de dependencias
let showNotification, emitEvent;

// Función para cargar dependencias dinámicamente
const loadDependencies = async () => {
    try {
        // Cargar notifications.js - RUTA CORRECTA: ../ui/ (un nivel arriba desde guides)
        const notificationsModule = await import('../ui/notifications.js');
        showNotification = notificationsModule.showNotification || notificationsModule.default?.showNotification;
        
        if (!showNotification) {
            console.warn('⚠️ showNotification no encontrado en notifications.js');
            showNotification = createFallbackNotification();
        }
    } catch (error) {
        console.error('❌ Error cargando notifications.js:', error);
        showNotification = createFallbackNotification();
    }

    try {
        // Cargar events.js - RUTA CORRECTA: ../ui/ (un nivel arriba desde guides)
        const eventsModule = await import('../ui/events.js');
        emitEvent = eventsModule.emitEvent || eventsModule.default?.emitEvent;
        
        if (!emitEvent) {
            console.warn('⚠️ emitEvent no encontrado en events.js');
            emitEvent = createFallbackEventEmitter();
        }
    } catch (error) {
        console.error('❌ Error cargando events.js:', error);
        emitEvent = createFallbackEventEmitter();
    }
};

// Fallback para notificaciones
function createFallbackNotification() {
    console.log('🔄 Usando sistema de notificaciones fallback');
    return (message, type = 'info') => {
        console.log(`📢 [${type.toUpperCase()}]: ${message}`);
        
        // Crear notificación básica
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</strong>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-sm" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        return notification;
    };
}

// Fallback para eventos
function createFallbackEventEmitter() {
    console.log('🔄 Usando sistema de eventos fallback');
    return (eventName, data = {}) => {
        console.log(`🔊 Evento emitido: ${eventName}`, data);
        
        // Crear evento personalizado
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
        
        // También disparar eventos globales para compatibilidad
        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(event);
        }
    };
}

// ==================================================
// CLASE PRINCIPAL DEL MÓDULO
// ==================================================

class GuidesModule {
    constructor() {
        console.log('🎣 Constructor de GuidesModule llamado');
        this.currentGuide = null;
        this.userType = 'fisherman';
        this.isInitialized = false;
        
        // Inicializar después de cargar dependencias
        this.init();
    }

    async init() {
        if (this.isInitialized) {
            console.log('✅ GuidesModule ya está inicializado');
            return;
        }
        
        console.log('🔄 Inicializando módulo de guías...');
        
        try {
            // 1. Cargar dependencias
            await loadDependencies();
            
            // 2. Verificar tipo de usuario
            await this.checkUserType();
            
            // 3. Configurar eventos
            this.bindEvents();
            
            this.isInitialized = true;
            console.log('✅ GuidesModule inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error crítico inicializando GuidesModule:', error);
            throw error;
        }
    }

    async checkUserType() {
        console.log('🔍 Verificando tipo de usuario...');
        
        try {
            const userData = localStorage.getItem('pesca_user');
            const token = localStorage.getItem('pesca_token');
            
            if (!userData || !token) {
                this.userType = 'fisherman';
                console.log('👤 Usuario no autenticado, tipo: fisherman');
                return;
            }
            
            const user = JSON.parse(userData);
            
            // Verificar si es guía
            if (user.user_type === 'guide' || user.is_guide === true) {
                this.userType = 'guide';
                this.currentGuide = user;
                console.log('👨‍🏭 Usuario es guía:', user.name || user.email);
            } else {
                this.userType = 'fisherman';
                console.log('🎣 Usuario es pescador:', user.name || user.email);
            }
            
            // Emitir evento
            if (emitEvent) {
                emitEvent('userTypeUpdated', { 
                    userType: this.userType, 
                    user: user 
                });
            }
            
        } catch (error) {
            console.error('❌ Error verificando tipo de usuario:', error);
            this.userType = 'fisherman';
            this.currentGuide = null;
        }
    }

    bindEvents() {
        console.log('🔗 Configurando eventos del módulo...');
        
        // Escuchar eventos de autenticación
        document.addEventListener('userLoggedIn', () => {
            console.log('👤 Usuario inició sesión, actualizando tipo...');
            this.checkUserType();
        });
        
        document.addEventListener('userLoggedOut', () => {
            console.log('👋 Usuario cerró sesión, reiniciando...');
            this.userType = 'fisherman';
            this.currentGuide = null;
        });
        
        // Escuchar eventos propios
        document.addEventListener('guideRegistered', (event) => {
            console.log('📝 Guía registrado:', event.detail);
            this.userType = 'guide';
            this.currentGuide = event.detail.guide;
        });
    }

    // ==================================================
    // MÉTODOS PRINCIPALES - API
    // ==================================================

    async getGuides(filters = {}) {
        console.log('🔍 Obteniendo guías con filtros:', filters);
        
        try {
            // Intentar obtener de la API real
            const queryParams = new URLSearchParams();
            
            if (filters.zone) queryParams.append('zone', filters.zone);
            if (filters.min_price) queryParams.append('min_price', filters.min_price);
            if (filters.max_price) queryParams.append('max_price', filters.max_price);
            if (filters.specialty) queryParams.append('specialty', filters.specialty);
            
            const queryString = queryParams.toString();
            const url = `${API_BASE_URL}/guides${queryString ? `?${queryString}` : ''}`;
            
            console.log(`🌐 Llamando a API: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const guides = await response.json();
                console.log(`✅ API devolvió ${guides.length} guías`);
                return guides;
            } else {
                console.warn('⚠️ API no respondió, usando datos de ejemplo');
                return this.getSampleGuides(filters);
            }
            
        } catch (error) {
            console.error('❌ Error obteniendo guías de API:', error);
            console.log('🔄 Usando datos de ejemplo');
            return this.getSampleGuides(filters);
        }
    }

    async getGuideById(guideId) {
        console.log(`👤 Obteniendo guía con ID: ${guideId}`);
        
        try {
            // Intentar obtener de la API real
            const response = await fetch(`${API_BASE_URL}/guides/${guideId}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const guide = await response.json();
                console.log('✅ Guía obtenido de API');
                return guide;
            } else {
                console.warn('⚠️ Guía no encontrado en API, buscando en datos de ejemplo');
                const guides = await this.getGuides();
                const guide = guides.find(g => g.id == guideId);
                
                if (guide) {
                    return guide;
                } else {
                    throw new Error('Guía no encontrado');
                }
            }
            
        } catch (error) {
            console.error('❌ Error obteniendo guía:', error);
            
            if (showNotification) {
                showNotification('No se pudo cargar la información del guía', 'error');
            }
            
            return null;
        }
    }

    async registerAsGuide(guideData) {
        console.log('📝 Registrando como guía:', guideData);
        
        try {
            // Verificar autenticación
            const token = localStorage.getItem('pesca_token');
            if (!token) {
                if (showNotification) {
                    showNotification('Debes iniciar sesión primero', 'error');
                }
                return null;
            }

            // Preparar datos
            const dataToSend = {
                ...guideData,
                user_id: JSON.parse(localStorage.getItem('pesca_user')).id
            };
            
            console.log('📤 Enviando datos a API:', dataToSend);
            
            // Llamar a API real
            const response = await fetch(`${API_BASE_URL}/guides/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Registro exitoso:', result);
                
                // Actualizar datos locales
                const userData = JSON.parse(localStorage.getItem('pesca_user'));
                userData.user_type = 'guide';
                userData.is_guide = true;
                localStorage.setItem('pesca_user', JSON.stringify(userData));
                
                // Actualizar estado
                this.userType = 'guide';
                this.currentGuide = result.guide || dataToSend;
                
                // Mostrar notificación
                if (showNotification) {
                    showNotification('¡Registrado como guía exitosamente!', 'success');
                }
                
                // Emitir evento
                if (emitEvent) {
                    emitEvent('guideRegistered', { guide: this.currentGuide });
                    emitEvent('userTypeUpdated', { userType: 'guide' });
                }
                
                return result;
                
            } else {
                const errorData = await response.json();
                console.error('❌ Error en registro:', errorData);
                
                if (showNotification) {
                    showNotification(errorData.error || 'Error al registrarse como guía', 'error');
                }
                
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error registrando guía:', error);
            
            if (showNotification) {
                showNotification('Error de conexión al servidor', 'error');
            }
            
            return null;
        }
    }

    async addReview(guideId, reviewData) {
        console.log(`⭐ Agregando reseña al guía ${guideId}:`, reviewData);
        
        try {
            const token = localStorage.getItem('pesca_token');
            if (!token) {
                if (showNotification) {
                    showNotification('Debes iniciar sesión para calificar', 'error');
                }
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/guides/${guideId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(reviewData)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (showNotification) {
                    showNotification('Reseña agregada correctamente', 'success');
                }
                
                return result;
            } else {
                const errorData = await response.json();
                
                if (showNotification) {
                    showNotification(errorData.error || 'Error al agregar reseña', 'error');
                }
                
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error agregando reseña:', error);
            
            if (showNotification) {
                showNotification('Error de conexión', 'error');
            }
            
            return null;
        }
    }

    async getGuideSpots() {
        console.log('📍 Obteniendo spots de guías');
        
        try {
            const response = await fetch(`${API_BASE_URL}/guide-spots`);
            
            if (response.ok) {
                return await response.json();
            }
            
            return this.getSampleGuideSpots();
            
        } catch (error) {
            console.error('❌ Error obteniendo spots:', error);
            return this.getSampleGuideSpots();
        }
    }

    async createGuideSpot(spotData) {
        console.log('📍 Creando spot de guía:', spotData);
        
        try {
            const token = localStorage.getItem('pesca_token');
            if (!token) {
                if (showNotification) {
                    showNotification('Debes iniciar sesión', 'error');
                }
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/guide-spots`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(spotData)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (showNotification) {
                    showNotification('Spot de guía creado correctamente', 'success');
                }
                
                return result;
            } else {
                const errorData = await response.json();
                
                if (showNotification) {
                    showNotification(errorData.error || 'Error al crear spot', 'error');
                }
                
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error creando spot:', error);
            
            if (showNotification) {
                showNotification('Error de conexión', 'error');
            }
            
            return null;
        }
    }

    async getMyGuideSpots() {
        console.log('📍 Obteniendo mis spots de guía');
        
        if (!this.isGuide()) {
            if (showNotification) {
                showNotification('Debes ser guía para ver tus spots', 'error');
            }
            return [];
        }
        
        try {
            const token = localStorage.getItem('pesca_token');
            if (!token) return [];
            
            const response = await fetch(`${API_BASE_URL}/guide-spots/my-spots`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ Error obteniendo mis spots:', error);
            return [];
        }
    }

    async getNearbyGuides(lat, lng, radius = 50) {
        console.log(`📍 Buscando guías cerca de ${lat}, ${lng} (radio: ${radius}km)`);
        
        try {
            const response = await fetch(
                `${API_BASE_URL}/guides/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
            );
            
            if (response.ok) {
                return await response.json();
            }
            
            return await this.getGuides();
            
        } catch (error) {
            console.error('❌ Error obteniendo guías cercanos:', error);
            return await this.getGuides();
        }
    }

    // ==================================================
    // MÉTODOS DE UTILIDAD
    // ==================================================

    isGuide() {
        return this.userType === 'guide';
    }

    getCurrentGuide() {
        return this.currentGuide;
    }

    getUserType() {
        return this.userType;
    }

    // ==================================================
    // DATOS DE EJEMPLO (FALLBACK)
    // ==================================================

    getSampleGuides(filters = {}) {
        console.log('📋 Generando datos de ejemplo para guías');
        
        const sampleGuides = [
            {
                id: 1,
                name: "Juan Pérez",
                email: "juan@pesca.com",
                location: "Mar del Plata, Buenos Aires",
                experience: "15 años",
                specialties: ["Pesca de costa", "Pesca embarcada"],
                price_per_day: 150,
                rating: 4.8,
                total_reviews: 47,
                description: "Guía especializado en pesca costera y embarcada. Más de 15 años de experiencia en la zona de Mar del Plata.",
                profile_pic: null,
                is_verified: true,
                years_experience: 15,
                license_number: "ARG-GUIA-001",
                zones: ["Mar del Plata", "Miramar", "Necochea"],
                services: ["Guía personalizado", "Equipo incluido", "Transporte"],
                contact_phone: "+54 9 223 123-4567",
                contact_email: "juan@pescaprofesional.com",
                created_at: "2023-01-15T10:30:00Z",
                updated_at: "2023-12-01T14:20:00Z"
            },
            {
                id: 2,
                name: "Carlos Gómez",
                email: "carlos@pesca.com",
                location: "Bariloche, Río Negro",
                experience: "10 años",
                specialties: ["Fly Fishing", "Pesca de truchas"],
                price_per_day: 200,
                rating: 4.9,
                total_reviews: 32,
                description: "Experto en fly fishing en ríos y lagos de la Patagonia. Especialista en truchas.",
                profile_pic: null,
                is_verified: true,
                years_experience: 10,
                license_number: "ARG-GUIA-002",
                zones: ["Bariloche", "San Martín de los Andes", "Villa La Angostura"],
                services: ["Fly fishing", "Clases para principiantes", "Alquiler de equipo"],
                contact_phone: "+54 9 294 456-7890",
                contact_email: "carlos@patagoniafly.com",
                created_at: "2023-03-20T09:15:00Z",
                updated_at: "2023-11-30T16:45:00Z"
            },
            {
                id: 3,
                name: "Ana Rodríguez",
                email: "ana@pesca.com",
                location: "Tigre, Buenos Aires",
                experience: "8 años",
                specialties: ["Pesca deportiva", "Pesca con mosca"],
                price_per_day: 120,
                rating: 4.5,
                total_reviews: 18,
                description: "Guía especializada en pesca en el Delta del Paraná. Conocimiento profundo de la zona.",
                profile_pic: null,
                is_verified: false,
                years_experience: 8,
                license_number: "ARG-GUIA-003",
                zones: ["Tigre", "San Fernando", "Campana"],
                services: ["Pesca en kayak", "Pesca con mosca", "Tours familiares"],
                contact_phone: "+54 9 11 234-5678",
                contact_email: "ana@deltafishing.com",
                created_at: "2023-05-10T11:00:00Z",
                updated_at: "2023-12-05T10:30:00Z"
            }
        ];
        
        // Aplicar filtros básicos
        let filteredGuides = [...sampleGuides];
        
        if (filters.zone) {
            filteredGuides = filteredGuides.filter(g => 
                g.location.toLowerCase().includes(filters.zone.toLowerCase()) ||
                (g.zones && g.zones.some(z => z.toLowerCase().includes(filters.zone.toLowerCase())))
            );
        }
        
        if (filters.min_price) {
            filteredGuides = filteredGuides.filter(g => 
                g.price_per_day >= parseFloat(filters.min_price)
            );
        }
        
        if (filters.max_price) {
            filteredGuides = filteredGuides.filter(g => 
                g.price_per_day <= parseFloat(filters.max_price)
            );
        }
        
        return filteredGuides;
    }

    getSampleGuideSpots() {
        return [
            {
                id: 1,
                guide_id: 1,
                name: "Mejor punto de costa - Mar del Plata",
                description: "Excelente punto para pesca costera con corvina y pescadilla",
                latitude: -38.028,
                longitude: -57.531,
                fish_species: ["corvina", "pescadilla", "lenguado"],
                best_season: "verano",
                access_type: "public",
                created_at: "2023-10-15T08:30:00Z"
            },
            {
                id: 2,
                guide_id: 2,
                name: "Río Limay - Bariloche",
                description: "Ideal para fly fishing de truchas",
                latitude: -41.133,
                longitude: -71.310,
                fish_species: ["trucha arcoíris", "trucha marrón"],
                best_season: "primavera",
                access_type: "public",
                created_at: "2023-09-20T10:15:00Z"
            }
        ];
    }
}

// ==================================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==================================================

// Crear instancia
const guidesModuleInstance = new GuidesModule();

// Función para obtener la instancia (para uso asíncrono)
export const getGuidesModule = async () => {
    if (!guidesModuleInstance.isInitialized) {
        await guidesModuleInstance.init();
    }
    return guidesModuleInstance;
};

// Exportar instancia directa (puede no estar inicializada completamente)
export const guidesModule = guidesModuleInstance;

// Hacer disponible globalmente
window.guidesModule = guidesModuleInstance;

// Exportar también por defecto
export default guidesModuleInstance;

console.log('✅ guides.js cargado y listo para usar');