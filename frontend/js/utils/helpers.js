// ==================================================
// MÓDULO DE UTILIDADES
// ==================================================

export class Helpers {
    static formatCoordinates(lat, lng) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static getCurrentTime() {
        return new Date().toLocaleTimeString('es-AR');
    }

    static getCurrentDate() {
        return new Date().toLocaleDateString('es-AR');
    }
}
