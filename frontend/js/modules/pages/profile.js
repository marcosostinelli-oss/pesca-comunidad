// ==================================================
// MÓDULO DE PÁGINA DE PERFIL - VERSIÓN CORREGIDA
// ==================================================

export class ProfilePage {
    constructor(app) {
        this.app = app;
        this.currentUser = null;
        this.isEditing = false;
    }

    show(userId = null) {
        const targetUserId = userId || (this.app.getCurrentUser() && this.app.getCurrentUser().id);
        
        if (!targetUserId) {
            this.app.auth.showLogin();
            return;
        }

        const currentUser = this.app.getCurrentUser();
        this.currentUser = currentUser;
        const isOwnProfile = currentUser && currentUser.id == targetUserId;

        if (isOwnProfile) {
            this.showOwnProfile(currentUser);
        } else {
            this.showOtherUserProfile(targetUserId);
        }
    }

    showOwnProfile(currentUser) {
        this.currentUser = currentUser;
        this.isEditing = false;
        const app = document.getElementById('app');
        app.innerHTML = this.getProfileViewHTML(currentUser);
        this.setupEventListeners();
    }

    async showOtherUserProfile(userId) {
        try {
            // Intentar cargar el perfil
            const user = await this.loadUserProfile(userId);
            const currentUser = this.app.getCurrentUser();
            
            if (!user) {
                // Si no se pudo cargar el perfil (por ejemplo, 403), mostrar acceso denegado
                this.showPermissionDenied({ profile_privacy: 'private' });
                return;
            }
            
            const isOwnProfile = currentUser && currentUser.id == userId;
            
            // Verificar si el usuario actual tiene permisos para ver este perfil
            const hasPermission = await this.checkViewPermission(user, currentUser);
            
            if (!hasPermission) {
                this.showPermissionDenied(user);
                return;
            }
            
            // Si tiene permiso, mostrar el perfil
            const areFriends = await this.areFriends(currentUser.id, userId);
            const app = document.getElementById('app');
            app.innerHTML = this.getProfileHTML(user, false, currentUser, areFriends);
            this.setupEventListeners();
        } catch (error) {
            console.error('❌ Error cargando perfil de usuario:', error);
            
            // Si hay error 403 (acceso denegado), mostrar pantalla de privacidad
            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                this.showPermissionDenied({ profile_privacy: 'private' });
            } else {
                const app = document.getElementById('app');
                app.innerHTML = `
                    <div class="row">
                        <div class="col-md-8 mx-auto">
                            <div class="alert alert-danger">
                                <h4>❌ Error</h4>
                                <p>No se pudo cargar el perfil del usuario.</p>
                                <button class="btn btn-secondary" onclick="app.router.navigate('/mapa')">
                                    Volver al Mapa
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    async checkViewPermission(profileUser, currentUser) {
        if (!profileUser) return false;
        
        const privacy = profileUser.profile_privacy || 'public';
        
        console.log('🔐 Verificando permisos de visualización:');
        console.log('- Perfil usuario:', profileUser.id, profileUser.name);
        console.log('- Privacidad:', privacy);
        console.log('- Usuario actual:', currentUser?.id, currentUser?.name);
        
        // Si no hay usuario actual (no está logueado)
        if (!currentUser) {
            return privacy === 'public';
        }
        
        // Si es su propio perfil
        if (currentUser.id == profileUser.id) {
            console.log('✅ Es su propio perfil - Acceso permitido');
            return true;
        }
        
        // Según la privacidad del perfil
        switch(privacy) {
            case 'public':
                console.log('✅ Perfil público - Acceso permitido');
                return true;
                
            case 'friends-only':
                // Verificar si son amigos usando tu sistema de amigos
                const areFriends = await this.areFriends(currentUser.id, profileUser.id);
                console.log('👥 Verificación de amigos:', areFriends ? 'Son amigos' : 'No son amigos');
                
                if (areFriends) {
                    console.log('✅ Son amigos - Acceso permitido');
                    return true;
                } else {
                    console.log('❌ No son amigos - Acceso denegado');
                    return false;
                }
                
            case 'private':
                console.log('❌ Perfil privado - Acceso denegado');
                return false;
                
            default:
                console.log('⚠️ Privacidad desconocida, acceso denegado por seguridad');
                return false;
        }
    }
    
    async areFriends(userId1, userId2) {
        try {
            if (!userId1 || !userId2) return false;
            
            // Usar el endpoint /api/friends/list para obtener la lista de amigos del usuario actual
            const token = this.app.getAuthToken();
            if (!token) return false;
            
            console.log(`👥 Verificando amistad entre ${userId1} y ${userId2}...`);
            
            // Obtener lista de amigos del usuario actual (userId1)
            const response = await fetch('/api/friends/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.friends) {
                    // Verificar si userId2 está en la lista de amigos
                    const isFriend = result.friends.some(friend => 
                        parseInt(friend.friend_id) === parseInt(userId2)
                    );
                    
                    console.log(`👥 ${userId1} y ${userId2} son amigos: ${isFriend}`);
                    return isFriend;
                }
            }
            
            console.log(`⚠️ No se pudo verificar amistad, asumiendo que no son amigos`);
            return false;
            
        } catch (error) {
            console.error('❌ Error verificando amistad:', error);
            return false;
        }
    }
    
    showPermissionDenied(user) {
        const privacy = user?.profile_privacy || 'private';
        const app = document.getElementById('app');
        
        let message = '';
        let title = '';
        let icon = '';
        
        switch(privacy) {
            case 'private':
                title = '🔒 Perfil Privado';
                message = 'El usuario ha configurado su perfil como privado.';
                icon = 'fa-lock';
                break;
                
            case 'friends-only':
                title = '👥 Solo para Amigos';
                message = 'Debes ser amigo de este usuario para ver su perfil.';
                icon = 'fa-user-friends';
                break;
                
            default:
                title = '⚠️ Acceso Denegado';
                message = 'No tienes permiso para ver este perfil.';
                icon = 'fa-ban';
        }
        
        app.innerHTML = `
            <div class="row">
                <div class="col-md-8 mx-auto">
                    <div class="card fishing-card">
                        <div class="card-header bg-warning text-dark">
                            <h3 class="mb-0">${title}</h3>
                        </div>
                        <div class="card-body text-center">
                            <i class="fas ${icon} fa-4x text-muted mb-3"></i>
                            <h4>${title.replace(/[🔒👥⚠️]/g, '')}</h4>
                            <p class="text-muted">${message}</p>
                            <button class="btn btn-outline-secondary mt-2" id="back-to-map-btn">
                                🗺️ Volver al Mapa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }

    showEditProfile() {
        if (!this.currentUser) return;
        
        this.isEditing = true;
        const app = document.getElementById('app');
        app.innerHTML = this.getProfileEditHTML(this.currentUser);
        this.setupEditFormListeners();
    }

    async loadUserProfile(userId) {
        try {
            const token = this.app.getAuthToken();
            if (!token) {
                console.log('❌ No hay token de autenticación');
                return null;
            }
            
            console.log(`🔍 Cargando perfil del usuario ID: ${userId}`);
            
            const response = await fetch(`/api/auth/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('📥 Status de respuesta:', response.status);
            
            // Si es 403 (Forbidden), el perfil es privado y no tenemos acceso
            if (response.status === 403) {
                console.log('🔒 Acceso denegado - Perfil privado o sin permisos');
                return null;
            }

            if (!response.ok) {
                throw new Error(`Error ${response.status} al cargar perfil`);
            }

            const result = await response.json();
            console.log('📥 Respuesta del backend:', result);
            
            if (result.success && result.data) {
                // DEBUG: Mostrar datos recibidos
                console.log('📊 Datos del usuario recibidos:');
                console.log('- Nombre:', result.data.name);
                console.log('- Facebook URL:', result.data.facebook_url);
                console.log('- Instagram URL:', result.data.instagram_url);
                console.log('- TikTok URL:', result.data.tiktok_url);
                console.log('- Privacidad:', result.data.profile_privacy);
                return result.data;
            } else {
                throw new Error(result.error || 'Error cargando perfil');
            }
            
        } catch (error) {
            console.error('❌ Error cargando perfil:', error);
            // Si es error 403, devolver null para manejar específicamente
            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                return null;
            }
            throw error;
        }
    }

    getProfileViewHTML(user) {
        return `
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
                                <div class="btn-group">
                                    <button class="btn btn-primary me-2" id="edit-profile-btn">
                                        <i class="fas fa-edit me-2"></i>Editar Perfil
                                    </button>
                                    <button class="btn btn-outline-secondary" id="home-profile-btn">
                                        <i class="fas fa-home me-2"></i>🏠 Inicio
                                    </button>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Nombre completo</label>
                                        <div class="profile-value">${user.name || 'No especificado'}</div>
                                    </div>
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Email</label>
                                        <div class="profile-value">${user.email}</div>
                                    </div>
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">WhatsApp</label>
                                        <div class="profile-value">${user.whatsapp || 'No especificado'}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Experiencia</label>
                                        <div class="profile-value">${this.getExperienceText(user.experience)}</div>
                                    </div>
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Especies favoritas</label>
                                        <div class="profile-value">${user.favorite_species || 'No especificado'}</div>
                                    </div>
                                    <div class="profile-field mb-3">
                                        <label class="form-label text-muted">Ubicación</label>
                                        <div class="profile-value">${this.getLocationText(user.city, user.province, user.country)}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Redes Sociales - SIEMPRE VISIBLES EN PROPIO PERFIL -->
                            ${this.getSocialMediaHTML(user, true)}

                            <!-- Configuración de Privacidad -->
                            <div class="profile-field mb-3 mt-4">
                                <label class="form-label text-muted">Privacidad del Perfil</label>
                                <div class="profile-value">
                                    ${this.getPrivacyBadge(user.profile_privacy || 'public')}
                                    <small class="d-block text-muted mt-1">${this.getPrivacyDescription(user.profile_privacy || 'public')}</small>
                                </div>
                            </div>

                            <div class="profile-field mb-3">
                                <label class="form-label text-muted">Miembro desde</label>
                                <div class="profile-value">${this.formatDate(user.created_at)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Botones de Navegación -->
                    <div class="card fishing-card mt-4">
                        <div class="card-body text-center">
                            <div class="btn-group" role="group">
                                <a href="/mapa" class="btn btn-primary me-2">
                                    <i class="fas fa-map me-2"></i>🗺️ Ver Mapa de Spots
                                </a>
                                <a href="/amigos" class="btn btn-info me-2">
                                    <i class="fas fa-user-friends me-2"></i>👥 Mis Amigos
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProfileHTML(user, isOwnProfile = false, currentUser = null, areFriends = false) {
        const privacy = user.profile_privacy || 'public';
        
        // Determinar si se deben mostrar las redes sociales
        const showSocialMedia = isOwnProfile || privacy === 'public' || (privacy === 'friends-only' && areFriends);
        
        return `
            <div class="row">
                <div class="col-md-8 mx-auto">
                    <div class="card fishing-card">
                        <div class="card-header bg-primary text-white">
                            <h3 class="mb-0">
                                ${isOwnProfile ? '🎣 Mi Perfil de Pesca' : `👤 Perfil de ${user.name || 'Usuario'}`}
                                ${!isOwnProfile ? `<span class="badge bg-light text-dark float-end">${this.getPrivacyBadge(privacy)}</span>` : ''}
                            </h3>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label"><strong>👤 Nombre:</strong></label>
                                        <p class="form-control-plaintext">${user.name || 'No especificado'}</p>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label"><strong>📧 Email:</strong></label>
                                        <p class="form-control-plaintext">${user.email}</p>
                                    </div>
                                    ${user.whatsapp ? `
                                        <div class="mb-3">
                                            <label class="form-label"><strong>📱 WhatsApp:</strong></label>
                                            <p class="form-control-plaintext">${user.whatsapp}</p>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="col-md-6">
                                    ${user.experience ? `
                                        <div class="mb-3">
                                            <label class="form-label"><strong>⭐ Experiencia:</strong></label>
                                            <p class="form-control-plaintext">${this.getExperienceText(user.experience)}</p>
                                        </div>
                                    ` : ''}
                                    ${user.city || user.province || user.country ? `
                                        <div class="mb-3">
                                            <label class="form-label"><strong>📍 Ubicación:</strong></label>
                                            <p class="form-control-plaintext">${this.getLocationText(user.city, user.province, user.country)}</p>
                                        </div>
                                    ` : ''}
                                    ${user.favorite_species ? `
                                        <div class="mb-3">
                                            <label class="form-label"><strong>🎣 Especies favoritas:</strong></label>
                                            <p class="form-control-plaintext">${user.favorite_species}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- Redes Sociales - VISIBLES SOLO SI TIENE PERMISO -->
                            ${showSocialMedia ? this.getSocialMediaHTML(user, false) : ''}
                            
                            <div class="mt-4 p-3 bg-light rounded">
                                <h5>👥 Acciones</h5>
                                <div class="btn-group">
                                    <button class="btn btn-outline-primary me-2" id="view-user-spots-btn">
                                        🎣 Ver Spots de ${user.name || 'Usuario'}
                                    </button>
                                    <button class="btn btn-outline-secondary" id="back-to-map-btn">
                                        🗺️ Volver al Mapa
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProfileEditHTML(user) {
        const privacy = user.profile_privacy || 'public';
        
        return `
            <div class="row">
                <div class="col-md-8 mx-auto">
                    <div class="card fishing-card">
                        <div class="card-header bg-success text-white">
                            <h3 class="mb-0">
                                <i class="fas fa-edit me-2"></i>Editar Perfil
                            </h3>
                        </div>
                        <div class="card-body">
                            <form id="profile-edit-form">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-name" class="form-label">Nombre completo *</label>
                                            <input type="text" class="form-control" id="edit-name" 
                                                   value="${user.name || ''}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" 
                                                   value="${user.email}" disabled>
                                            <div class="form-text">El email no se puede modificar</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-whatsapp" class="form-label">WhatsApp</label>
                                            <input type="tel" class="form-control" id="edit-whatsapp" 
                                                   value="${user.whatsapp || ''}" 
                                                   placeholder="+549 11 1234-5678">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-experience" class="form-label">Experiencia en pesca</label>
                                            <select class="form-select" id="edit-experience">
                                                <option value="">Seleccionar experiencia</option>
                                                <option value="beginner" ${user.experience === 'beginner' ? 'selected' : ''}>Principiante</option>
                                                <option value="intermediate" ${user.experience === 'intermediate' ? 'selected' : ''}>Intermedio</option>
                                                <option value="advanced" ${user.experience === 'advanced' ? 'selected' : ''}>Avanzado</option>
                                                <option value="expert" ${user.experience === 'expert' ? 'selected' : ''}>Experto</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-favorite-species" class="form-label">Especies favoritas</label>
                                            <input type="text" class="form-control" id="edit-favorite-species" 
                                                   value="${user.favorite_species || ''}" 
                                                   placeholder="Ej: trucha, pejerrey, dorado">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-country" class="form-label">País</label>
                                            <select class="form-select" id="edit-country">
                                                <option value="">Seleccionar país</option>
                                                <option value="Argentina" ${user.country === 'Argentina' ? 'selected' : ''}>Argentina</option>
                                                <option value="Uruguay" ${user.country === 'Uruguay' ? 'selected' : ''}>Uruguay</option>
                                                <option value="Chile" ${user.country === 'Chile' ? 'selected' : ''}>Chile</option>
                                                <option value="Brasil" ${user.country === 'Brasil' ? 'selected' : ''}>Brasil</option>
                                                <option value="Paraguay" ${user.country === 'Paraguay' ? 'selected' : ''}>Paraguay</option>
                                                <option value="Bolivia" ${user.country === 'Bolivia' ? 'selected' : ''}>Bolivia</option>
                                                <option value="Perú" ${user.country === 'Perú' ? 'selected' : ''}>Perú</option>
                                                <option value="Otro" ${!user.country || user.country === 'Otro' ? 'selected' : ''}>Otro</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-province" class="form-label">Provincia/Estado</label>
                                            <input type="text" class="form-control" id="edit-province" 
                                                   value="${user.province || ''}" 
                                                   placeholder="Ej: Buenos Aires, Córdoba, etc.">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-city" class="form-label">Ciudad</label>
                                            <input type="text" class="form-control" id="edit-city" 
                                                   value="${user.city || ''}" 
                                                   placeholder="Ej: Mar del Plata, Bariloche, etc.">
                                        </div>
                                    </div>
                                </div>

                                <!-- Redes Sociales -->
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <h5 class="border-bottom pb-2 mb-3">
                                            <i class="fas fa-share-alt me-2"></i>Redes Sociales
                                        </h5>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="edit-facebook" class="form-label">
                                                <i class="fab fa-facebook text-primary me-1"></i>Facebook
                                            </label>
                                            <input type="url" class="form-control" id="edit-facebook" 
                                                   value="${user.facebook_url || ''}" 
                                                   placeholder="https://facebook.com/tu-usuario">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="edit-instagram" class="form-label">
                                                <i class="fab fa-instagram text-danger me-1"></i>Instagram
                                            </label>
                                            <input type="url" class="form-control" id="edit-instagram" 
                                                   value="${user.instagram_url || ''}" 
                                                   placeholder="https://instagram.com/tu-usuario">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="edit-tiktok" class="form-label">
                                                <i class="fab fa-tiktok me-1"></i>TikTok
                                            </label>
                                            <input type="url" class="form-control" id="edit-tiktok" 
                                                   value="${user.tiktok_url || ''}" 
                                                   placeholder="https://tiktok.com/@tu-usuario">
                                        </div>
                                    </div>
                                </div>

                                <!-- Privacidad del Perfil CON 3 OPCIONES -->
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <h5 class="border-bottom pb-2 mb-3">
                                            <i class="fas fa-lock me-2"></i>Privacidad del Perfil
                                        </h5>
                                        <div class="mb-3">
                                            <label for="edit-privacy" class="form-label">¿Quién puede ver tu perfil?</label>
                                            <select class="form-select" id="edit-privacy">
                                                <option value="public" ${privacy === 'public' ? 'selected' : ''}>
                                                    🌍 Público (todos pueden ver)
                                                </option>
                                                <option value="friends-only" ${privacy === 'friends-only' ? 'selected' : ''}>
                                                    👥 Solo amigos
                                                </option>
                                                <option value="private" ${privacy === 'private' ? 'selected' : ''}>
                                                    🔒 Privado (solo tú)
                                                </option>
                                            </select>
                                            <div class="form-text">
                                                <span class="text-success">🟢 Público</span> - Cualquiera puede ver tu perfil<br>
                                                <span class="text-warning">🟡 Solo amigos</span> - Solo tus amigos pueden ver tu perfil<br>
                                                <span class="text-danger">🔴 Privado</span> - Solo tú puedes ver tu perfil
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex gap-2 justify-content-end mt-4">
                                    <button type="button" class="btn btn-outline-secondary" id="cancel-edit-btn">
                                        <i class="fas fa-times me-2"></i>Cancelar
                                    </button>
                                    <button type="submit" class="btn btn-success" id="save-profile-btn">
                                        <i class="fas fa-save me-2"></i>Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
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

    getLocationText(city, province, country) {
        const parts = [];
        if (city) parts.push(city);
        if (province) parts.push(province);
        if (country && country !== 'Otro') parts.push(country);
        return parts.length > 0 ? parts.join(', ') : 'No especificado';
    }

    getSocialMediaHTML(user, showEmpty = true) {
        console.log('🔍 Generando HTML de redes sociales para usuario:');
        console.log('- Facebook URL:', user.facebook_url);
        console.log('- Instagram URL:', user.instagram_url);
        console.log('- TikTok URL:', user.tiktok_url);
        
        const socialLinks = [];
        
        if (user.facebook_url) {
            socialLinks.push(`
                <a href="${user.facebook_url}" target="_blank" class="btn btn-outline-primary btn-sm me-2">
                    <i class="fab fa-facebook me-1"></i> Facebook
                </a>
            `);
        } else if (showEmpty) {
            socialLinks.push(`
                <span class="btn btn-outline-secondary btn-sm me-2 disabled">
                    <i class="fab fa-facebook me-1"></i> Facebook
                </span>
            `);
        }
        
        if (user.instagram_url) {
            socialLinks.push(`
                <a href="${user.instagram_url}" target="_blank" class="btn btn-outline-danger btn-sm me-2">
                    <i class="fab fa-instagram me-1"></i> Instagram
                </a>
            `);
        } else if (showEmpty) {
            socialLinks.push(`
                <span class="btn btn-outline-secondary btn-sm me-2 disabled">
                    <i class="fab fa-instagram me-1"></i> Instagram
                </span>
            `);
        }
        
        if (user.tiktok_url) {
            socialLinks.push(`
                <a href="${user.tiktok_url}" target="_blank" class="btn btn-outline-dark btn-sm me-2">
                    <i class="fab fa-tiktok me-1"></i> TikTok
                </a>
            `);
        } else if (showEmpty) {
            socialLinks.push(`
                <span class="btn btn-outline-secondary btn-sm me-2 disabled">
                    <i class="fab fa-tiktok me-1"></i> TikTok
                </span>
            `);
        }
        
        if (socialLinks.length === 0) {
            console.log('⚠️ No hay redes sociales para mostrar');
            return '';
        }
        
        console.log(`✅ Se mostrarán ${socialLinks.length} redes sociales`);
        
        return `
            <div class="profile-field mb-3 mt-4">
                <label class="form-label text-muted">Redes Sociales</label>
                <div class="profile-value">
                    <div class="d-flex flex-wrap">
                        ${socialLinks.join('')}
                    </div>
                </div>
            </div>
        `;
    }

    getPrivacyBadge(privacy) {
        switch(privacy) {
            case 'public':
                return '<span class="badge bg-success">🌍 Público</span>';
            case 'friends-only':
                return '<span class="badge bg-warning text-dark">👥 Solo Amigos</span>';
            case 'private':
                return '<span class="badge bg-danger">🔒 Privado</span>';
            default:
                return '<span class="badge bg-secondary">No especificado</span>';
        }
    }

    getPrivacyDescription(privacy) {
        switch(privacy) {
            case 'public':
                return 'Tu perfil es visible para todos los usuarios de PescaComunidad';
            case 'friends-only':
                return 'Solo tus amigos pueden ver tu perfil';
            case 'private':
                return 'Solo tú puedes ver tu perfil';
            default:
                return 'Configura quién puede ver tu perfil';
        }
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

    setupEventListeners() {
        const editProfileBtn = document.getElementById('edit-profile-btn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                this.showEditProfile();
            });
        }

        const homeBtn = document.getElementById('home-profile-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                this.app.router.navigate('/');
            });
        }

        const viewUserSpotsBtn = document.getElementById('view-user-spots-btn');
        if (viewUserSpotsBtn) {
            viewUserSpotsBtn.addEventListener('click', () => {
                this.app.router.navigate('/mapa');
                this.app.showNotification('🔍 Filtrando spots del usuario...', 'info');
            });
        }

        const backToMapBtn = document.getElementById('back-to-map-btn');
        if (backToMapBtn) {
            backToMapBtn.addEventListener('click', () => {
                this.app.router.navigate('/mapa');
            });
        }
    }

    setupEditFormListeners() {
        const editForm = document.getElementById('profile-edit-form');
        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleProfileUpdate();
            });
        }

        const cancelBtn = document.getElementById('cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.showOwnProfile(this.currentUser);
            });
        }
    }

    async handleProfileUpdate() {
        try {
            console.log('🔧 Iniciando actualización de perfil...');
            
            const profileData = {
                name: document.getElementById('edit-name').value.trim(),
                whatsapp: document.getElementById('edit-whatsapp').value.trim() || null,
                experience: document.getElementById('edit-experience').value || 'beginner',
                favorite_species: document.getElementById('edit-favorite-species').value.trim() || null,
                country: document.getElementById('edit-country').value || 'Argentina',
                province: document.getElementById('edit-province').value.trim() || null,
                city: document.getElementById('edit-city').value.trim() || null,
                
                profile_privacy: document.getElementById('edit-privacy').value,
                
                facebook_url: document.getElementById('edit-facebook').value.trim() || null,
                instagram_url: document.getElementById('edit-instagram').value.trim() || null,
                tiktok_url: document.getElementById('edit-tiktok').value.trim() || null
            };

            console.log('📤 Datos a enviar al backend:', profileData);
            
            if (!profileData.name) {
                this.app.showNotification('⚠️ El nombre es obligatorio', 'warning');
                return;
            }

            const saveBtn = document.getElementById('save-profile-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
            }

            this.app.showNotification('🔄 Actualizando perfil...', 'info');

            const token = this.app.getAuthToken();
            if (!token) {
                throw new Error('No se encontró token de autenticación');
            }

            console.log('🔄 Enviando petición POST a /api/auth/update-profile ...');
            const response = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            console.log('📥 Respuesta recibida, status:', response.status);
            const result = await response.json();
            console.log('📥 Resultado:', result);

            if (result.success) {
                const updatedUser = { 
                    ...this.currentUser, 
                    ...profileData,
                    privacy: profileData.profile_privacy,
                    social_media: {
                        facebook: profileData.facebook_url,
                        instagram: profileData.instagram_url,
                        tiktok: profileData.tiktok_url
                    }
                };
                this.app.setCurrentUser(updatedUser);
                
                this.app.showNotification('✅ Perfil actualizado correctamente', 'success');
                this.showOwnProfile(updatedUser);
            } else {
                throw new Error(result.message || 'Error al actualizar perfil');
            }
            
        } catch (error) {
            console.error('❌ Error actualizando perfil:', error);
            this.app.showNotification(`❌ Error: ${error.message}`, 'error');
            
            const saveBtn = document.getElementById('save-profile-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Cambios';
            }
        }
    }
}