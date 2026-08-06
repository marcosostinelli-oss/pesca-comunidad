// frontend/js/modules/auth/auth.js
export class Auth {
    constructor(app) {
        this.app = app;
        this.API_BASE = 'http://localhost:5001/api';
    }

    checkAuth() {
        const token = localStorage.getItem('pesca_token');
        
        if (token) {
            this.verifyToken()
                .then(user => {
                    this.app.setCurrentUser(user);
                    console.log('✅ Usuario autenticado:', user.name);
                })
                .catch(error => {
                    console.error('❌ Token inválido:', error);
                    this.forceLogout();
                });
        }
        return false;
    }

    async verifyToken() {
        try {
            const token = localStorage.getItem('pesca_token');
            if (!token) throw new Error('No token');
            
            const response = await fetch(`${this.API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.user;
            } else {
                throw new Error('Token inválido');
            }
        } catch (error) {
            throw error;
        }
    }

    renderAuthButtons() {
        const authContainer = document.getElementById('auth-buttons');
        if (!authContainer) return;
        
        const user = this.app.getCurrentUser();
        
        if (user) {
            authContainer.innerHTML = `
                <div class="d-flex gap-2 align-items-center">
                    <a href="/perfil" class="btn btn-outline-light btn-sm" 
                       style="border: none; background: transparent; color: white; cursor: pointer; text-decoration: none;">
                        <i class="fas fa-user me-1"></i> Hola, ${user.name}
                    </a>
                    <button class="btn btn-outline-light btn-sm" onclick="app.auth.logout()">
                        <i class="fas fa-sign-out-alt me-1"></i> Salir
                    </button>
                </div>
            `;
        } else {
            authContainer.innerHTML = `
                <div class="d-flex gap-2">
                    <a href="/auth" class="btn btn-outline-light btn-sm">
                        <i class="fas fa-sign-in-alt me-1"></i> Ingresar
                    </a>
                </div>
            `;
        }
    }

    async handleAuth(authData, isLogin = true) {
        try {
            if (isLogin) {
                return await this.login(authData);
            } else {
                return await this.register(authData);
            }
        } catch (error) {
            this.app.showNotification('❌ Error en la autenticación. Intenta nuevamente.', 'error');
            throw error;
        }
    }

    async login(loginData) {
        try {
            console.log('🔐 Iniciando login para:', loginData.email);
            
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();
            console.log('📨 Respuesta del login:', data);
            
            if (data.success && data.token) {
                console.log('✅ Login exitoso. Token JWT recibido:', data.token.substring(0, 30) + '...');
                
                // 🛡️ Guardar token JWT seguro
                localStorage.setItem('pesca_token', data.token);
                
                if (data.user) {
                    localStorage.setItem('pesca_user', JSON.stringify(data.user));
                    this.app.setCurrentUser(data.user);
                }
                
                // ✅ FORZAR REINICIALIZACIÓN DE GRILLA DESPUÉS DEL LOGIN
                setTimeout(() => {
                    if (this.app.reinitializeGrid) {
                        console.log('🎯 Forzando reinicialización de grilla después del login...');
                        this.app.reinitializeGrid();
                    }
                }, 500);
                
                // ✅ REDIRIGIR CON ROUTER
                this.app.router.goTo('/home');
                
                this.app.showNotification(`✅ ${data.message}`, 'success');
                return true;
            } else {
                console.error('❌ Login falló:', data.message);
                this.app.showNotification(`❌ ${data.message}`, 'error');
                return false;
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            this.app.showNotification('❌ Error de conexión con el servidor', 'error');
            return false;
        }
    }

    async register(registerData) {
        try {
            console.log('📝 Iniciando registro para:', registerData.email);
            
            const response = await fetch(`${this.API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registerData)
            });

            const data = await response.json();
            console.log('📨 Respuesta del registro:', data);
            
            if (data.success && data.token) {
                console.log('✅ Registro exitoso. Token JWT recibido:', data.token.substring(0, 30) + '...');
                
                // 🛡️ Guardar token JWT seguro
                localStorage.setItem('pesca_token', data.token);
                
                if (data.user) {
                    localStorage.setItem('pesca_user', JSON.stringify(data.user));
                    this.app.setCurrentUser(data.user);
                }
                
                // ✅ FORZAR REINICIALIZACIÓN DE GRILLA DESPUÉS DEL REGISTRO
                setTimeout(() => {
                    if (this.app.reinitializeGrid) {
                        console.log('🎯 Forzando reinicialización de grilla después del registro...');
                        this.app.reinitializeGrid();
                    }
                }, 500);
                
                // ✅ REDIRIGIR CON ROUTER
                this.app.router.goTo('/home');
                
                this.app.showNotification(`✅ ${data.message}`, 'success');
                return true;
            } else {
                console.error('❌ Registro falló:', data.message);
                this.app.showNotification(`❌ ${data.message}`, 'error');
                return false;
            }
            
        } catch (error) {
            console.error('Error en registro:', error);
            this.app.showNotification('❌ Error de conexión con el servidor', 'error');
            return false;
        }
    }

    // ✅ MÉTODO CORREGIDO: Actualizar perfil de usuario
    async updateProfile(profileData) {
        try {
            console.log('🔧 Actualizando perfil con datos:', profileData);
            
            // Obtener el token CORRECTO
            const token = localStorage.getItem('pesca_token');
            console.log('🔑 Token usado para update-profile:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN');
            
            // Usar el endpoint CORRECTO: /api/auth/update-profile
            const response = await fetch('http://localhost:5001/api/auth/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            console.log('📡 Respuesta del servidor (status):', response.status);
            
            const data = await response.json();
            console.log('📦 Respuesta completa del servidor:', data);
            
            if (response.ok && data.success) {
                // Actualizar usuario en localStorage y estado
                if (data.user) {
                    localStorage.setItem('pesca_user', JSON.stringify(data.user));
                    this.app.setCurrentUser(data.user);
                } else {
                    // Si el backend no devuelve el usuario, actualizar localmente
                    const currentUser = this.app.getCurrentUser();
                    const updatedUser = { ...currentUser, ...profileData };
                    localStorage.setItem('pesca_user', JSON.stringify(updatedUser));
                    this.app.setCurrentUser(updatedUser);
                }
                
                this.app.showNotification('✅ Perfil actualizado exitosamente', 'success');
                return data.user || this.app.getCurrentUser();
            } else {
                this.app.showNotification(`❌ ${data.message || 'Error al actualizar perfil'}`, 'error');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error actualizando perfil:', error);
            this.app.showNotification('❌ Error de conexión al actualizar el perfil', 'error');
            return false;
        }
    }

    async resetPassword(email) {
        try {
            const response = await fetch(`${this.API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Error al procesar la solicitud');
            }

            return true;

        } catch (error) {
            console.error('Error en recuperación:', error);
            this.app.showNotification('❌ Error de conexión con el servidor', 'error');
            return false;
        }
    }

    // 🔐 Confirmar la nueva contraseña usando el token del link del email
    async confirmPasswordReset(token, newPassword) {
        try {
            const response = await fetch(`${this.API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'No se pudo restablecer la contraseña');
            }

            return { success: true };

        } catch (error) {
            console.error('Error confirmando nueva contraseña:', error);
            return { success: false, message: error.message };
        }
    }

    logout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this._clearSession();
            this.app.showNotification('👋 ¡Sesión cerrada correctamente!', 'success');
            setTimeout(() => {
                this.app.router.goTo('/home');
            }, 500);
        }
    }

    // ✅ Logout silencioso, SIN pedir confirmación — para usar cuando el
    // token expiró o es inválido, no cuando el usuario decide cerrar sesión.
    // Evita el bug de mostrar "¿Estás seguro...?" dos veces.
    forceLogout(message = '⚠️ Tu sesión expiró, iniciá sesión de nuevo') {
        console.log('🚪 Cerrando sesión automáticamente (token inválido/expirado)...');
        this._clearSession();
        this.app.showNotification(message, 'warning');
        this.app.router.goTo('/home');
    }

    _clearSession() {
        console.log('🚪 Limpiando sesión...');

        // 1. Limpiar localStorage COMPLETAMENTE
        localStorage.removeItem('pesca_token');
        localStorage.removeItem('pesca_user');
        localStorage.removeItem('spotToView'); // Limpiar spots temporales

        // 2. Limpiar sessionStorage
        sessionStorage.clear();

        // 3. Limpiar estado de la aplicación
        this.app.currentUser = null;

        // 4. ✅ LIMPIAR GRILLA SI EXISTE - CRÍTICO PARA SEGURIDAD
        if (this.app.simpleGrid) {
            console.log('🗑️ Limpiando grilla...');
            this.app.simpleGrid.cleanup();
            this.app.simpleGrid = null;
        }

        // 5. Limpiar mapa si es necesario
        if (this.app.mapCore && typeof this.app.mapCore.cleanup === 'function') {
            this.app.mapCore.cleanup();
        }

        // 6. Actualizar UI
        this.renderAuthButtons();

        console.log('✅ Sesión completamente limpiada');
    }

    async authenticatedFetch(endpoint, options = {}) {
        const token = localStorage.getItem('pesca_token');
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            }
        };

        const response = await fetch(`${this.API_BASE}${endpoint}`, config);
        
        if (response.status === 401) {
            this.forceLogout();
            throw new Error('Sesión expirada');
        }
        
        return response;
    }
}