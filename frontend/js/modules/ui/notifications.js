// ==================================================
// MÓDULO DE NOTIFICACIONES - VERSIÓN COMPLETA
// ==================================================

export class NotificationManager {
    constructor(app) {
        this.app = app;
    }

    show(message, type = 'info') {
        console.log(`📢 Notificación [${type}]: ${message}`);
        
        // Eliminar notificaciones existentes del mismo tipo
        const existingNotifications = document.querySelectorAll(`.alert.position-fixed[data-type="${type}"]`);
        existingNotifications.forEach(notification => notification.remove());

        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `alert alert-${this.getAlertClass(type)} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease-out;
        `;
        notification.setAttribute('data-type', type);
        
        // Icono según tipo
        const icon = this.getIcon(type);
        const title = this.getTitle(type);
        
        notification.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="me-2" style="font-size: 1.5rem;">${icon}</div>
                <div style="flex: 1;">
                    <div class="d-flex justify-content-between align-items-start">
                        <strong class="mb-1">${title}</strong>
                        <button type="button" class="btn-close btn-sm" data-bs-dismiss="alert" aria-label="Cerrar"></button>
                    </div>
                    <div>${message}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);

        // Manejar cierre manual
        const closeBtn = notification.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            });
        }

        return notification;
    }

    getAlertClass(type) {
        const typeMap = {
            'error': 'danger',
            'success': 'success',
            'warning': 'warning',
            'info': 'info'
        };
        return typeMap[type] || 'info';
    }

    getIcon(type) {
        const iconMap = {
            'error': '❌',
            'success': '✅',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return iconMap[type] || 'ℹ️';
    }

    getTitle(type) {
        const titleMap = {
            'error': 'Error',
            'success': 'Éxito',
            'warning': 'Advertencia',
            'info': 'Información'
        };
        return titleMap[type] || 'Notificación';
    }

    // Métodos rápidos para tipos específicos
    success(message) {
        return this.show(message, 'success');
    }

    error(message) {
        return this.show(message, 'error');
    }

    warning(message) {
        return this.show(message, 'warning');
    }

    info(message) {
        return this.show(message, 'info');
    }
}

// ==================================================
// FUNCIÓN GLOBAL PARA MÓDULOS
// ==================================================

// Función que tu guides.js está tratando de importar
export function showNotification(message, type = 'info') {
    // Si existe una instancia de NotificationManager en la app, usarla
    if (window.app && window.app.notifications && typeof window.app.notifications.show === 'function') {
        return window.app.notifications.show(message, type);
    }
    
    // Si no, crear una instancia temporal
    const tempManager = new NotificationManager();
    return tempManager.show(message, type);
}

// Funciones específicas para conveniencia
export function showSuccessNotification(message) {
    return showNotification(message, 'success');
}

export function showErrorNotification(message) {
    return showNotification(message, 'error');
}

export function showWarningNotification(message) {
    return showNotification(message, 'warning');
}

// ==================================================
// AGREGAR ESTILOS DE ANIMACIÓN
// ==================================================

// Inyectar estilos CSS para las animaciones
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .alert.position-fixed {
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

// ==================================================
// HACER DISPONIBLE GLOBALMENTE
// ==================================================

// Para compatibilidad con código existente
window.showNotification = showNotification;
window.showSuccessNotification = showSuccessNotification;
window.showErrorNotification = showErrorNotification;