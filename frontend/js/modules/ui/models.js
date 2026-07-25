// ==================================================
// MÓDULO DE MODALES - VERSIÓN COMPLETA
// ==================================================

// ==================================================
// GESTOR DE MODALES
// ==================================================

class ModalManager {
    constructor() {
        this.modals = new Map(); // Para múltiples modales
        this.currentModal = null;
        this.modalStack = [];
        this.zIndex = 1050; // Bootstrap modals start at 1050
        console.log('🎪 ModalManager inicializado');
    }

    // Crear un modal
    createModal(options = {}) {
        const modalId = options.id || `modal-${Date.now()}`;
        
        // Si ya existe un modal con este ID, cerrarlo primero
        if (this.modals.has(modalId)) {
            this.closeModal(modalId);
        }

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-hidden', 'true');
        
        // Estilos personalizables
        const style = options.style || {};
        modal.style.cssText = `
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: ${this.zIndex + this.modalStack.length};
            overflow-x: hidden;
            overflow-y: auto;
            outline: 0;
            background-color: rgba(0, 0, 0, 0.5);
            opacity: 0;
            transition: opacity 0.15s linear;
        `;

        // Diálogo del modal
        const modalDialog = document.createElement('div');
        modalDialog.className = 'modal-dialog';
        if (options.size) {
            modalDialog.classList.add(`modal-${options.size}`);
        }
        modalDialog.style.cssText = `
            margin: 1.75rem auto;
            max-width: ${options.width || '500px'};
            pointer-events: none;
            transform: translate(0, -50px);
            transition: transform 0.3s ease-out;
        `;

        // Contenido del modal
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            position: relative;
            display: flex;
            flex-direction: column;
            width: 100%;
            pointer-events: auto;
            background-color: #fff;
            background-clip: padding-box;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 0.3rem;
            outline: 0;
        `;

        // Cabecera del modal
        if (options.title || options.showCloseButton !== false) {
            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            modalHeader.style.cssText = `
                display: flex;
                flex-shrink: 0;
                align-items: center;
                justify-content: space-between;
                padding: 1rem 1rem;
                border-bottom: 1px solid #dee2e6;
                border-top-left-radius: calc(0.3rem - 1px);
                border-top-right-radius: calc(0.3rem - 1px);
            `;

            if (options.title) {
                const title = document.createElement('h5');
                title.className = 'modal-title';
                title.textContent = options.title;
                modalHeader.appendChild(title);
            }

            if (options.showCloseButton !== false) {
                const closeButton = document.createElement('button');
                closeButton.type = 'button';
                closeButton.className = 'btn-close';
                closeButton.setAttribute('aria-label', 'Close');
                closeButton.onclick = () => this.closeModal(modalId);
                modalHeader.appendChild(closeButton);
            }

            modalContent.appendChild(modalHeader);
        }

        // Cuerpo del modal
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.style.cssText = `
            position: relative;
            flex: 1 1 auto;
            padding: 1rem;
        `;

        if (typeof options.content === 'string') {
            modalBody.innerHTML = options.content;
        } else if (options.content instanceof HTMLElement) {
            modalBody.appendChild(options.content);
        } else if (typeof options.content === 'function') {
            const content = options.content();
            if (typeof content === 'string') {
                modalBody.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                modalBody.appendChild(content);
            }
        }

        modalContent.appendChild(modalBody);

        // Pie del modal (opcional)
        if (options.buttons || options.footer) {
            const modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            modalFooter.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                flex-shrink: 0;
                align-items: center;
                justify-content: flex-end;
                padding: 0.75rem;
                border-top: 1px solid #dee2e6;
                border-bottom-right-radius: calc(0.3rem - 1px);
                border-bottom-left-radius: calc(0.3rem - 1px);
            `;

            if (options.buttons && Array.isArray(options.buttons)) {
                options.buttons.forEach(buttonConfig => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = `btn ${buttonConfig.class || 'btn-secondary'}`;
                    button.textContent = buttonConfig.text;
                    button.onclick = (e) => {
                        if (buttonConfig.onClick) {
                            buttonConfig.onClick(e);
                        }
                        if (buttonConfig.closeOnClick !== false) {
                            this.closeModal(modalId);
                        }
                    };
                    modalFooter.appendChild(button);
                });
            } else if (typeof options.footer === 'string') {
                modalFooter.innerHTML = options.footer;
            } else if (options.footer instanceof HTMLElement) {
                modalFooter.appendChild(options.footer);
            }

            modalContent.appendChild(modalFooter);
        }

        // Ensamblar modal
        modalDialog.appendChild(modalContent);
        modal.appendChild(modalDialog);

        // Agregar al documento
        document.body.appendChild(modal);

        // Forzar reflow para la animación
        modal.offsetHeight;

        // Mostrar modal con animación
        modal.style.opacity = '1';
        modalDialog.style.transform = 'translate(0, 0)';

        // Configurar eventos
        if (options.closeOnOutsideClick !== false) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modalId);
                }
            });
        }

        if (options.closeOnEsc !== false) {
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeModal(modalId);
                }
            };
            document.addEventListener('keydown', escHandler);
            modal._escHandler = escHandler;
        }

        // Guardar referencia
        this.modals.set(modalId, modal);
        this.currentModal = modal;
        this.modalStack.push(modal);
        this.zIndex++;

        console.log(`📦 Modal creado: ${modalId}`);
        return modalId;
    }

    // Cerrar un modal específico
    closeModal(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal) return;

        console.log(`📦 Cerrando modal: ${modalId}`);

        // Remover evento ESC si existe
        if (modal._escHandler) {
            document.removeEventListener('keydown', modal._escHandler);
        }

        // Animación de salida
        modal.style.opacity = '0';
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.transform = 'translate(0, -50px)';
        }

        // Remover después de la animación
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            this.modals.delete(modalId);

            // Actualizar pila
            const index = this.modalStack.indexOf(modal);
            if (index > -1) {
                this.modalStack.splice(index, 1);
            }

            // Actualizar modal actual
            if (this.modalStack.length > 0) {
                this.currentModal = this.modalStack[this.modalStack.length - 1];
            } else {
                this.currentModal = null;
                this.zIndex = 1050; // Resetear z-index
            }
        }, 300);
    }

    // Cerrar el modal actual
    closeCurrentModal() {
        if (this.currentModal) {
            this.closeModal(this.currentModal.id);
        }
    }

    // Cerrar todos los modales
    closeAllModals() {
        console.log('📦 Cerrando todos los modales');
        this.modals.forEach((modal, modalId) => {
            this.closeModal(modalId);
        });
    }

    // Verificar si hay modales abiertos
    hasOpenModals() {
        return this.modals.size > 0;
    }

    // Obtener modal por ID
    getModal(modalId) {
        return this.modals.get(modalId);
    }

    // Actualizar contenido de un modal
    updateModalContent(modalId, content) {
        const modal = this.getModal(modalId);
        if (!modal) return;

        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            if (typeof content === 'string') {
                modalBody.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                modalBody.innerHTML = '';
                modalBody.appendChild(content);
            }
        }
    }

    // Métodos rápidos para modales comunes
    showAlert(message, title = 'Alerta', options = {}) {
        const modalId = this.createModal({
            title,
            content: `
                <div class="alert-message">
                    <p>${message}</p>
                </div>
            `,
            buttons: [{
                text: 'Aceptar',
                class: 'btn-primary',
                closeOnClick: true
            }],
            closeOnOutsideClick: false,
            closeOnEsc: false,
            ...options
        });

        return modalId;
    }

    showConfirm(message, title = 'Confirmar', onConfirm, options = {}) {
        const modalId = this.createModal({
            title,
            content: `
                <div class="confirm-message">
                    <p>${message}</p>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancelar',
                    class: 'btn-secondary',
                    closeOnClick: true
                },
                {
                    text: 'Aceptar',
                    class: 'btn-primary',
                    onClick: onConfirm,
                    closeOnClick: true
                }
            ],
            closeOnOutsideClick: false,
            closeOnEsc: false,
            ...options
        });

        return modalId;
    }

    showLoading(message = 'Cargando...', title = '', options = {}) {
        const modalId = this.createModal({
            title,
            content: `
                <div class="loading-modal text-center">
                    <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-3">${message}</p>
                </div>
            `,
            showCloseButton: false,
            closeOnOutsideClick: false,
            closeOnEsc: false,
            ...options
        });

        return modalId;
    }
}

// ==================================================
// INSTANCIA GLOBAL
// ==================================================

const modalManager = new ModalManager();

// ==================================================
// FUNCIONES DE CONVENIENCIA PARA MÓDULOS
// ==================================================

// Función que tu guides-ui.js está tratando de importar
export function showModal(content, options = {}) {
    // Si content es una string, usarla como contenido
    // Si es un objeto, asumir que es un objeto de opciones completo
    let modalOptions = {};

    if (typeof content === 'string') {
        modalOptions = {
            content,
            ...options
        };
    } else if (typeof content === 'object') {
        modalOptions = { ...content, ...options };
    }

    // Establecer valores por defecto
    modalOptions = {
        showCloseButton: true,
        closeOnOutsideClick: true,
        closeOnEsc: true,
        width: '500px',
        ...modalOptions
    };

    return modalManager.createModal(modalOptions);
}

// Función para cerrar modal
export function closeModal(modalId) {
    if (modalId) {
        modalManager.closeModal(modalId);
    } else {
        modalManager.closeCurrentModal();
    }
}

// Funciones específicas
export function showAlertModal(message, title = 'Alerta') {
    return modalManager.showAlert(message, title);
}

export function showConfirmModal(message, title = 'Confirmar', onConfirm) {
    return modalManager.showConfirm(message, title, onConfirm);
}

export function showLoadingModal(message = 'Cargando...') {
    return modalManager.showLoading(message);
}

export function closeAllModals() {
    return modalManager.closeAllModals();
}

// ==================================================
// HACER DISPONIBLE GLOBALMENTE
// ==================================================

// Para compatibilidad con código existente
window.showModal = showModal;
window.closeModal = closeModal;
window.showAlertModal = showAlertModal;
window.showConfirmModal = showConfirmModal;
window.showLoadingModal = showLoadingModal;
window.closeAllModals = closeAllModals;
window.modalManager = modalManager;

// Exportar la instancia para módulos que la necesiten
export default modalManager;