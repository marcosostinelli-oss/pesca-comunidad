// ==================================================
// CONSTANTES DE LA APLICACIÓN PESCA COMUNIDAD
// ==================================================

// 🔗 URL BASE DE LA API
export const API_BASE_URL = 'http://localhost:5001/api';

// 📱 CONFIGURACIÓN DE LA APLICACIÓN
export const APP_CONFIG = {
    NAME: 'Pesca Comunidad',
    VERSION: '1.0.0',
    DEBUG: true,
    DEFAULT_LANGUAGE: 'es'
};

// 👥 TIPOS DE USUARIO
export const USER_TYPES = {
    FISHERMAN: 'fisherman',
    GUIDE: 'guide',
    ADMIN: 'admin'
};

// 🗺️ CONFIGURACIÓN DEL MAPA
export const MAP_CONFIG = {
    DEFAULT_CENTER: {
        lat: -34.6037,  // Buenos Aires
        lng: -58.3816
    },
    DEFAULT_ZOOM: 12,
    MAX_ZOOM: 18,
    MIN_ZOOM: 3,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

// 📍 TIPOS DE SPOTS
export const SPOT_TYPES = {
    RIVER: 'río',
    LAKE: 'lago',
    SEA: 'mar',
    RESERVOIR: 'embalse',
    STREAM: 'arroyo',
    DAM: 'presa',
    CHANNEL: 'canal'
};

// 👁️ VISIBILIDAD DE SPOTS
export const SPOT_VISIBILITY = {
    PUBLIC: 'public',
    FRIENDS_ONLY: 'friends-only',
    PRIVATE: 'private'
};

// 🚻 ACCESIBILIDAD
export const ACCESSIBILITY_TYPES = {
    EASY: 'fácil',
    MODERATE: 'moderado',
    DIFFICULT: 'difícil',
    VEHICLE_ONLY: 'solo con vehículo',
    PRIVATE_CLUB: 'club privado'
};

// 🐟 ESPECIES COMUNES
export const FISH_SPECIES = [
    'trucha',
    'dorado',
    'surubí',
    'carpa',
    'pejerrey',
    'corvina',
    'lenguado',
    'bagre',
    'boga',
    'tararira',
    'pacú',
    'salmón'
];

// ⏰ HORARIOS DE PESCA
export const FISHING_TIMES = {
    MORNING: 'mañana',
    AFTERNOON: 'tarde',
    NIGHT: 'noche',
    SUNRISE: 'amanecer',
    SUNSET: 'atardecer',
    ALL_DAY: 'todo el día'
};

// 🏪 FACILIDADES
export const FACILITIES = {
    PARKING: 'estacionamiento',
    BATHROOMS: 'baños',
    CAMPING: 'camping',
    PIER: 'muelle',
    RESTAURANT: 'restaurante'
};

// 🔑 CLAVES DE LOCALSTORAGE
export const STORAGE_KEYS = {
    USER: 'pesca_user',
    TOKEN: 'pesca_token',
    LAST_LOCATION: 'pesca_last_location',
    FAVORITE_SPOTS: 'pesca_favorite_spots',
    THEME: 'pesca_theme'
};

// 🎣 CONFIGURACIÓN DE GRILLA
export const GRID_CONFIG = {
    ITEMS_PER_PAGE: 10,
    DEFAULT_SORT: 'created_at',
    SORT_DIRECTION: 'DESC'
};

// 📊 ESTADOS DE SOLICITUD
export const REQUEST_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled'
};

// 🌤️ CONDICIONES CLIMÁTICAS
export const WEATHER_CONDITIONS = {
    SUNNY: 'soleado',
    CLOUDY: 'nublado',
    RAINY: 'lluvioso',
    WINDY: 'ventoso',
    STORMY: 'tormentoso',
    FOGGY: 'neblinoso'
};

// 🚨 MENSAJES DE ERROR COMUNES
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
    SERVER_ERROR: 'Error del servidor. Intenta nuevamente.',
    UNAUTHORIZED: 'Debes iniciar sesión para acceder.',
    NOT_FOUND: 'Recurso no encontrado.',
    VALIDATION_ERROR: 'Datos inválidos. Verifica los campos.'
};

// ✅ MENSAJES DE ÉXITO
export const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Inicio de sesión exitoso.',
    REGISTER_SUCCESS: 'Registro completado.',
    SPOT_ADDED: 'Spot agregado correctamente.',
    PROFILE_UPDATED: 'Perfil actualizado.',
    FRIEND_REQUEST_SENT: 'Solicitud de amistad enviada.'
};

// 📍 ENDPOINTS DE LA API
export const API_ENDPOINTS = {
    // Autenticación
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    AUTH_LOGOUT: '/auth/logout',
    AUTH_ME: '/auth/me',
    
    // Spots
    SPOTS: '/spots',
    SPOT_BY_ID: '/spots/:id',
    USER_SPOTS: '/spots/user/:userId',
    NEARBY_SPOTS: '/spots/nearby',
    
    // Amigos
    FRIENDS: '/friends',
    FRIEND_REQUESTS: '/friends/requests',
    SEARCH_USERS: '/friends/search',
    
    // Guías
    GUIDES: '/guides',
    GUIDE_BY_ID: '/guides/:id',
    GUIDE_REGISTER: '/guides/register',
    GUIDE_SPOTS: '/guides/spots',
    GUIDE_REVIEWS: '/guides/:id/reviews',
    
    // Clima
    WEATHER: '/weather',
    WEATHER_FORECAST: '/weather/forecast',
    
    // Utilidades
    HEALTH: '/health',
    STATS: '/stats'
};

// 🌈 TEMAS DE COLORES
export const COLORS = {
    PRIMARY: '#007bff',
    SECONDARY: '#6c757d',
    SUCCESS: '#28a745',
    DANGER: '#dc3545',
    WARNING: '#ffc107',
    INFO: '#17a2b8',
    LIGHT: '#f8f9fa',
    DARK: '#343a40'
};

// 🔄 INTERVALOS DE TIEMPO
export const TIME_INTERVALS = {
    AUTO_LOGOUT: 60 * 60 * 1000, // 1 hora
    NOTIFICATION_DURATION: 5000, // 5 segundos
    REFRESH_INTERVAL: 30000, // 30 segundos
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutos
};

// 🎮 CONFIGURACIÓN DE JUEGO/PESCA
export const FISHING_CONFIG = {
    MAX_SPOTS_PER_USER: 50,
    MAX_FRIENDS: 200,
    MIN_PASSWORD_LENGTH: 6,
    MAX_NAME_LENGTH: 50,
    MAX_DESCRIPTION_LENGTH: 500
};

// ==================================================
// FUNCIONES UTILITARIAS
// ==================================================

// Obtener URL completa de un endpoint
export function getApiUrl(endpoint, params = {}) {
    let url = `${API_BASE_URL}${endpoint}`;
    
    // Reemplazar parámetros en la URL
    Object.keys(params).forEach(key => {
        if (url.includes(`:${key}`)) {
            url = url.replace(`:${key}`, params[key]);
        }
    });
    
    return url;
}

// Verificar si estamos en desarrollo
export function isDevelopment() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

// Obtener configuración según entorno
export function getConfig() {
    const baseConfig = {
        ...APP_CONFIG,
        API_BASE_URL: isDevelopment() ? API_BASE_URL : 'https://api.pescacomunidad.com/api',
        DEBUG: isDevelopment()
    };
    
    return baseConfig;
}

// Formatear fecha para la API
export function formatDateForAPI(date) {
    if (!date) return null;
    return new Date(date).toISOString();
}

// Exportar objeto completo para compatibilidad
const constants = {
    API_BASE_URL,
    APP_CONFIG,
    USER_TYPES,
    MAP_CONFIG,
    SPOT_TYPES,
    SPOT_VISIBILITY,
    ACCESSIBILITY_TYPES,
    FISH_SPECIES,
    FISHING_TIMES,
    FACILITIES,
    STORAGE_KEYS,
    GRID_CONFIG,
    REQUEST_STATUS,
    WEATHER_CONDITIONS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    API_ENDPOINTS,
    COLORS,
    TIME_INTERVALS,
    FISHING_CONFIG,
    getApiUrl,
    isDevelopment,
    getConfig,
    formatDateForAPI
};

// Exportación por defecto para importaciones más fáciles
export default constants;