// ==================================================
// MÓDULO DE MANEJO DE EVENTOS - VERSIÓN COMPLETA
// ==================================================

// ==================================================
// SISTEMA DE EVENTOS GLOBAL (PUB/SUB)
// ==================================================

class GlobalEventManager {
    constructor() {
        this.events = new Map();
        console.log('🎯 GlobalEventManager inicializado');
    }

    // Emitir un evento global
    emit(eventName, data = {}) {
        console.log(`🔊 Emitiendo evento global: ${eventName}`, data);
        
        // Disparar evento nativo del DOM para que otros módulos puedan escucharlo
        const customEvent = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(customEvent);

        // Ejecutar listeners registrados directamente
        if (this.events.has(eventName)) {
            const listeners = this.events.get(eventName);
            listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`❌ Error en listener de ${eventName}:`, error);
                }
            });
        }
    }

    // Escuchar un evento global
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);
        
        console.log(`👂 Escuchando evento global: ${eventName}`);
        
        // Retornar función para remover el listener
        return () => this.off(eventName, callback);
    }

    // Dejar de escuchar un evento global
    off(eventName, callback) {
        if (this.events.has(eventName)) {
            const listeners = this.events.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
                console.log(`🔇 Dejando de escuchar evento global: ${eventName}`);
            }
        }
    }

    // Escuchar un evento global una sola vez
    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        this.on(eventName, onceCallback);
    }

    // Limpiar todos los listeners de un evento
    clear(eventName) {
        this.events.delete(eventName);
        console.log(`🧹 Limpiando todos los listeners de: ${eventName}`);
    }
}

// Instancia global del sistema de eventos
const globalEventManager = new GlobalEventManager();

// Función que tu guides.js está tratando de importar
export function emitEvent(eventName, data = {}) {
    return globalEventManager.emit(eventName, data);
}

// Funciones adicionales para el sistema de eventos global
export function onEvent(eventName, callback) {
    return globalEventManager.on(eventName, callback);
}

export function offEvent(eventName, callback) {
    return globalEventManager.off(eventName, callback);
}

export function onceEvent(eventName, callback) {
    return globalEventManager.once(eventName, callback);
}

// ==================================================
// GESTOR DE EVENTOS DE UI (TU CÓDIGO ORIGINAL)
// ==================================================

export class EventManager {
    constructor(app) {
        this.app = app;
    }

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
        
        switch (form.id) {
            case 'login-form':
                this.handleLoginForm();
                break;
            case 'register-form':
                this.handleRegisterForm();
                break;
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

        // Navegación principal
        if (id === 'login-nav-btn' || texto === 'Ingresar') {
            event.preventDefault();
            this.app.auth.showLogin();
            return;
        }
        
        if (id === 'register-nav-btn' || texto === 'Registrarse' || texto.includes('Únete')) {
            event.preventDefault();
            this.app.auth.showRegister();
            return;
        }
        
        if (id === 'logout-btn' || texto === 'Cerrar Sesión') {
            event.preventDefault();
            this.app.auth.logout();
            return;
        }

        if (id === 'view-map-btn' || texto.includes('Ver Mapa') || texto.includes('🗺️')) {
            event.preventDefault();
            // Usar el router en lugar de llamar directamente
            if (this.app.router && typeof this.app.router.navigate === 'function') {
                this.app.router.navigate('/mapa');
            } else if (this.app.mapPage) {
                this.app.mapPage.show();
            }
            return;
        }
        
        if (id === 'profile-home-btn' || texto.includes('Mi Perfil') || texto.includes('👤')) {
            event.preventDefault();
            if (this.app.router && typeof this.app.router.navigate === 'function') {
                this.app.router.navigate('/perfil');
            } else if (this.app.profilePage) {
                this.app.profilePage.show();
            }
            return;
        }
        
        if (id === 'home-profile-btn' || texto.includes('Inicio') || texto.includes('🏠')) {
            event.preventDefault();
            if (this.app.router && typeof this.app.router.navigate === 'function') {
                this.app.router.navigate('/');
            } else if (this.app.homePage) {
                this.app.homePage.show();
            }
            return;
        }

        // Eventos para guías
        if (id === 'guides-nav-btn' || texto.includes('Guías') || texto.includes('👨‍🏭')) {
            event.preventDefault();
            if (this.app.router && typeof this.app.router.navigate === 'function') {
                this.app.router.navigate('/guias');
            }
            return;
        }

        // Eventos para amigos
        if (id === 'friends-nav-btn' || texto.includes('Amigos') || texto.includes('👥')) {
            event.preventDefault();
            if (this.app.router && typeof this.app.router.navigate === 'function') {
                this.app.router.navigate('/amigos');
            }
            return;
        }
    }

    async handleLoginForm() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        
        const success = await this.app.auth.login({ email, password });
        if (success) {
            // Emitir evento global de login exitoso
            emitEvent('userLoggedIn', { email });
            
            if (this.app.router && typeof this.app.router.navigate === 'function') {
                this.app.router.navigate('/perfil');
            } else if (this.app.profilePage) {
                this.app.profilePage.show();
            }
        }
    }

    async handleRegisterForm() {
        const name = document.getElementById('register-name')?.value;
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;
        const whatsapp = document.getElementById('register-whatsapp')?.value;
        
        const success = await this.app.auth.register({ name, email, password, whatsapp });
        if (success) {
            // Emitir evento global de registro exitoso
            emitEvent('userRegistered', { name, email });
            
            if (this.app.router && typeof this.app.router.navigate === 'function') {
                this.app.router.navigate('/perfil');
            } else if (this.app.profilePage) {
                this.app.profilePage.show();
            }
        }
    }
}

// ==================================================
// HACER DISPONIBLE GLOBALMENTE
// ==================================================

// Para compatibilidad con código existente
window.emitEvent = emitEvent;
window.onEvent = onEvent;
window.globalEventManager = globalEventManager;

// Exportar la instancia global para módulos que la necesiten
export default globalEventManager;