// js/modules/auth/auth-ui.js
export class AuthUI {
    constructor(app) {
        this.app = app;
        this.isLoginMode = true;
        this.handleAuthSubmit = this.handleAuthSubmit.bind(this);
    }

    show() {
        const app = document.getElementById('app');
        app.innerHTML = this.getAuthHTML();
        this.attachEvents();
    }

    getAuthHTML() {
        return `
            <div class="row justify-content-center">
                <div class="col-md-6 col-lg-5">
                    <div class="card fishing-card shadow">
                        <div class="card-body p-4">
                            <!-- Logo y Título -->
                            <div class="text-center mb-4">
                                <h3 class="card-title fishing-text-primary mb-2">PescaComunidad</h3>
                                <p class="text-muted">${this.isLoginMode ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}</p>
                            </div>

                            <!-- Tabs para Login/Registro -->
                            <div class="auth-tabs mb-4">
                                <div class="nav nav-pills nav-justified" role="tablist">
                                    <button class="nav-link ${this.isLoginMode ? 'active' : ''}" 
                                            data-auth-mode="login">
                                        Ingresar
                                    </button>
                                    <button class="nav-link ${!this.isLoginMode ? 'active' : ''}" 
                                            data-auth-mode="register">
                                        Registrarse
                                    </button>
                                </div>
                            </div>

                            <!-- Formulario Único -->
                            <form id="auth-form" novalidate>
                                <!-- Campo Nombre (solo en registro) -->
                                <div class="mb-3 ${this.isLoginMode ? 'd-none' : ''}" id="name-field">
                                    <label for="auth-name" class="form-label">Nombre completo *</label>
                                    <input type="text" class="form-control" id="auth-name" name="name"
                                           placeholder="Ej: Juan Pérez" ${!this.isLoginMode ? 'required' : ''}>
                                </div>

                                <!-- Campo Email -->
                                <div class="mb-3">
                                    <label for="auth-email" class="form-label">Email *</label>
                                    <input type="email" class="form-control" id="auth-email" name="email"
                                           placeholder="tu@email.com" required>
                                </div>

                                <!-- Campo Contraseña -->
                                <div class="mb-3">
                                    <label for="auth-password" class="form-label">Contraseña *</label>
                                    <input type="password" class="form-control" id="auth-password" name="password"
                                           placeholder="${this.isLoginMode ? 'Tu contraseña' : 'Mínimo 8 caracteres'}" 
                                           required minlength="${this.isLoginMode ? 6 : 8}">
                                    ${!this.isLoginMode ? `
                                    <div class="form-text">Mínimo 8 caracteres, con al menos 1 mayúscula, 1 número y 1 carácter especial ($ % & . -)</div>
                                    ` : ''}
                                </div>

                                <!-- Campo Confirmar Contraseña (solo en registro) -->
                                <div class="mb-3 ${this.isLoginMode ? 'd-none' : ''}" id="confirm-password-field">
                                    <label for="auth-confirm-password" class="form-label">Confirmar contraseña *</label>
                                    <input type="password" class="form-control" id="auth-confirm-password" name="confirmPassword"
                                           placeholder="Repetí tu contraseña" ${!this.isLoginMode ? 'required' : ''}>
                                </div>

                                <!-- Check para mostrar ambas contraseñas -->
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="show-password">
                                    <label class="form-check-label" for="show-password">
                                        Mostrar contraseña${!this.isLoginMode ? 's' : ''}
                                    </label>
                                </div>

                                <!-- Campo WhatsApp (solo en registro) -->
                                <div class="mb-3 ${this.isLoginMode ? 'd-none' : ''}" id="whatsapp-field">
                                    <label for="auth-whatsapp" class="form-label">WhatsApp (opcional)</label>
                                    <input type="tel" class="form-control" id="auth-whatsapp" name="whatsapp"
                                           placeholder="+549 11 1234-5678">
                                    <div class="form-text">Para contactarte sobre tus spots de pesca</div>
                                </div>

                                <!-- Input oculto para acción -->
                                <input type="hidden" name="action" value="${this.isLoginMode ? 'login' : 'register'}">

                                <!-- Botón Submit -->
                                <button type="submit" class="btn btn-fishing w-100 py-2" id="auth-submit-btn">
                                    <i class="fas ${this.isLoginMode ? 'fa-sign-in-alt' : 'fa-user-plus'} me-2"></i>
                                    ${this.isLoginMode ? 'Ingresar' : 'Registrarse'}
                                </button>

                                <!-- Spinner de carga -->
                                <div id="auth-loading" class="text-center mt-3" style="display: none;">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Cargando...</span>
                                    </div>
                                    <p class="mt-2 text-muted">Procesando...</p>
                                </div>
                            </form>

                            <!-- Enlaces Adicionales -->
                            <div class="text-center mt-4">
                                ${this.isLoginMode ? `
                                    <div class="mb-2">
                                        <button type="button" class="btn btn-link p-0 text-decoration-none" data-action="recovery">
                                            <i class="fas fa-key me-1"></i>¿Olvidaste tu contraseña?
                                        </button>
                                    </div>
                                    <div class="text-muted">
                                        ¿No tienes cuenta? 
                                        <button type="button" class="btn btn-link p-0 text-decoration-none fishing-text-primary" data-action="switch-to-register">
                                            Regístrate aquí
                                        </button>
                                    </div>
                                ` : `
                                    <div class="text-muted">
                                        ¿Ya tienes cuenta? 
                                        <button type="button" class="btn btn-link p-0 text-decoration-none fishing-text-primary" data-action="switch-to-login">
                                            Ingresa aquí
                                        </button>
                                    </div>
                                `}
                            </div>

                            <!-- Enlace para volver al inicio -->
                            <div class="text-center mt-3">
                                <a href="/home" class="btn btn-outline-secondary btn-sm">
                                    <i class="fas fa-arrow-left me-1"></i>Volver al Inicio
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Recuperación de Contraseña -->
            <div class="modal fade" id="passwordRecoveryModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Recuperar Contraseña</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Ingresa tu email y te enviaremos instrucciones para recuperar tu contraseña.</p>
                            <form id="password-recovery-form">
                                <div class="mb-3">
                                    <label for="recovery-email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="recovery-email" 
                                           placeholder="tu@email.com" required>
                                </div>
                                <button type="submit" class="btn btn-fishing w-100">
                                    <i class="fas fa-paper-plane me-2"></i>Enviar Instrucciones
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setMode(isLogin) {
        this.isLoginMode = isLogin;
        this.show();
    }

    attachEvents() {
        // Evento del formulario de autenticación con bind correcto
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', this.handleAuthSubmit);
            console.log('✅ Formulario de auth inicializado');
        } else {
            console.warn('⚠️ Formulario de auth no encontrado');
        }

        // Evento para mostrar/ocultar contraseña
        const showPasswordCheckbox = document.getElementById('show-password');
        if (showPasswordCheckbox) {
            showPasswordCheckbox.addEventListener('change', (e) => {
                const passwordInput = document.getElementById('auth-password');
                const confirmPasswordInput = document.getElementById('auth-confirm-password');
                if (passwordInput) {
                    passwordInput.type = e.target.checked ? 'text' : 'password';
                }
                if (confirmPasswordInput) {
                    confirmPasswordInput.type = e.target.checked ? 'text' : 'password';
                }
            });
        }

        // Evento del formulario de recuperación
        const recoveryForm = document.getElementById('password-recovery-form');
        if (recoveryForm) {
            recoveryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordRecovery();
            });
        }

        // Eventos para botones con data attributes
        this.attachDataAttributeEvents();
    }

    // Manejar eventos con data attributes
    attachDataAttributeEvents() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Manejar tabs de login/registro
            if (target.hasAttribute('data-auth-mode')) {
                event.preventDefault();
                const mode = target.getAttribute('data-auth-mode') === 'login';
                this.setMode(mode);
                return;
            }

            // Manejar acciones de enlaces
            if (target.hasAttribute('data-action')) {
                event.preventDefault();
                const action = target.getAttribute('data-action');
                
                switch (action) {
                    case 'recovery':
                        this.showPasswordRecovery();
                        break;
                    case 'switch-to-register':
                        this.setMode(false);
                        break;
                    case 'switch-to-login':
                        this.setMode(true);
                        break;
                }
                return;
            }
        });
    }

    // ✅ MÉTODO COMPLETAMENTE CORREGIDO: handleAuthSubmit
    async handleAuthSubmit(event) {
        event.preventDefault();
        
        console.log('🔄 Procesando formulario de autenticación...');
        
        // ✅ OBTENER FORMULARIO POR ID EN LUGAR DE event.target
        const form = document.getElementById('auth-form');
        if (!form) {
            console.error('❌ Formulario no encontrado, no se puede procesar');
            this.app.showNotification('❌ Error del sistema: formulario no disponible', 'error');
            return;
        }
        
        const formData = new FormData(form);
        const action = this.isLoginMode ? 'login' : 'register';
        
        // Obtener valores del formulario
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const name = formData.get('name');
        const whatsapp = formData.get('whatsapp');

        // Validaciones básicas
        if (!email || !password) {
            this.app.showNotification('❌ Email y contraseña son requeridos', 'error');
            return;
        }

        if (action === 'register') {
            if (!name) {
                this.app.showNotification('❌ El nombre es requerido para registrarse', 'error');
                return;
            }

            // ✅ Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.app.showNotification('❌ Por favor ingresá un email válido', 'error');
                return;
            }

            // ✅ Validar fortaleza de contraseña
            if (password.length < 8) {
                this.app.showNotification('❌ La contraseña debe tener al menos 8 caracteres', 'error');
                return;
            }
            if (!/[A-Z]/.test(password)) {
                this.app.showNotification('❌ La contraseña debe tener al menos una mayúscula', 'error');
                return;
            }
            if (!/[0-9]/.test(password)) {
                this.app.showNotification('❌ La contraseña debe tener al menos un número', 'error');
                return;
            }
            if (!/[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/;']/.test(password)) {
                this.app.showNotification('❌ La contraseña debe tener al menos un carácter especial (ej: $ % & . -)', 'error');
                return;
            }

            // ✅ Validar que coincidan las contraseñas
            if (password !== confirmPassword) {
                this.app.showNotification('❌ Las contraseñas no coinciden', 'error');
                return;
            }
        }

        try {
            this.showLoading(true);

            const authData = this.isLoginMode ? 
                { email, password } : 
                { name, email, password, whatsapp: whatsapp || null };

            console.log('🔄 Enviando datos de autenticación...', { ...authData, password: '***' });
            const success = await this.app.auth.handleAuth(authData, this.isLoginMode);
            
            if (success) {
                console.log('✅ Autenticación exitosa');
                this.app.showNotification(
                    this.isLoginMode ? '✅ ¡Bienvenido de nuevo!' : '🎉 ¡Cuenta creada exitosamente!',
                    'success'
                );
                
                // ✅ CORREGIDO: Reset seguro del formulario obtenido por ID
                try {
                    if (form && form.nodeName === 'FORM' && typeof form.reset === 'function') {
                        form.reset();
                        console.log('✅ Formulario reseteado correctamente');
                    } else {
                        console.warn('⚠️ No se pudo resetear el formulario: elemento no válido');
                    }
                } catch (resetError) {
                    console.error('❌ Error al resetear el formulario:', resetError);
                }
                
                // Redirigir al home después de un breve delay
                setTimeout(() => {
                    console.log('🔄 Redirigiendo a /home...');
                    this.app.router.goTo('/home');
                }, 1500);
                
            } else {
                throw new Error('Error en la autenticación');
            }

        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            
            // ✅ CORREGIDO: Mensajes de error más específicos
            let errorMessage = 'Error en la autenticación';
            
            if (error.message.includes('Credenciales inválidas')) {
                errorMessage = '❌ Email o contraseña incorrectos';
            } else if (error.message.includes('ya está registrado')) {
                errorMessage = '❌ Este email ya está registrado';
            } else if (error.message.includes('email debe ser válido')) {
                errorMessage = '❌ Por favor ingresa un email válido';
            } else if (error.message.includes('contraseña debe tener') || 
                       error.message.includes('mayúscula') || 
                       error.message.includes('número') || 
                       error.message.includes('carácter especial')) {
                errorMessage = `❌ ${error.message}`;
            } else {
                errorMessage = `❌ ${error.message}`;
            }
            
            this.app.showNotification(errorMessage, 'error');
            
        } finally {
            this.showLoading(false);
        }
    }

    // ✅ MÉTODO MEJORADO: showLoading
    showLoading(loading) {
        const submitButton = document.getElementById('auth-submit-btn');
        const loadingSpinner = document.getElementById('auth-loading');
        
        if (submitButton) {
            if (loading) {
                submitButton.disabled = true;
                submitButton.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </span>
                    Procesando...
                `;
            } else {
                submitButton.disabled = false;
                submitButton.innerHTML = this.isLoginMode ? 
                    '<i class="fas fa-sign-in-alt me-2"></i>Ingresar' : 
                    '<i class="fas fa-user-plus me-2"></i>Registrarse';
            }
        }
        
        // Mostrar/ocultar spinner general si existe
        if (loadingSpinner) {
            loadingSpinner.style.display = loading ? 'block' : 'none';
        }
    }

    showPasswordRecovery() {
        const modalElement = document.getElementById('passwordRecoveryModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            
            setTimeout(() => {
                const emailInput = document.getElementById('recovery-email');
                if (emailInput) emailInput.focus();
            }, 500);
        }
    }

    async handlePasswordRecovery() {
        const emailInput = document.getElementById('recovery-email');
        const email = emailInput?.value;
        
        if (!email) {
            this.app.showNotification('❌ Por favor ingresa tu email', 'error');
            return;
        }

        try {
            this.showLoading(true);
            const success = await this.app.auth.resetPassword(email);
            
            if (success) {
                const modalElement = document.getElementById('passwordRecoveryModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }
                }
                
                // ✅ CORREGIDO: Reset seguro del formulario de recuperación
                const recoveryForm = document.getElementById('password-recovery-form');
                if (recoveryForm && typeof recoveryForm.reset === 'function') {
                    recoveryForm.reset();
                }
                
                // Mostrar mensaje de éxito
                this.app.showNotification('📧 Si el email existe, recibirás instrucciones para recuperar tu contraseña', 'success');
            }
        } catch (error) {
            console.error('❌ Error en recuperación de contraseña:', error);
            this.app.showNotification('❌ Error al procesar la solicitud', 'error');
        } finally {
            this.showLoading(false);
        }
    }
}