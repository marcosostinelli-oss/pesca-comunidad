// ==================================================
// INTERFAZ DE USUARIO PARA GESTIÓN DE AMIGOS
// ==================================================

export class FriendsUI {
    constructor(app) {
        this.app = app;
        this.friendsManager = app.friendsManager;
    }

    // 🏠 MOSTRAR PÁGINA DE AMIGOS
    showFriendsPage() {
        const app = document.getElementById('app');
        app.innerHTML = this.getFriendsPageHTML();
        this.loadFriendsData();
        this.setupEventListeners();
    }

    // 🎨 HTML DE LA PÁGINA DE AMIGOS
    getFriendsPageHTML() {
        const currentUser = this.app.getCurrentUser();
        
        if (!currentUser) {
            return `
                <div class="container text-center">
                    <div class="alert alert-warning">
                        <h4>🔒 Acceso restringido</h4>
                        <p>Debes iniciar sesión para gestionar tus amigos.</p>
                        <button class="btn btn-primary" onclick="app.router.navigate('/auth')">
                            Iniciar Sesión
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="container">
                <div class="row mb-4">
                    <div class="col-12">
                        <h1>
                            <i class="fas fa-user-friends me-2"></i>
                            Gestión de Amigos
                        </h1>
                        <p class="text-muted">Conecta con otros pescadores y comparte tus spots</p>
                    </div>
                </div>

                <!-- 📊 ESTADÍSTICAS RÁPIDAS -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card fishing-card text-center">
                            <div class="card-body">
                                <h3 id="friends-count" class="text-primary">-</h3>
                                <p class="mb-0">Amigos</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card fishing-card text-center">
                            <div class="card-body">
                                <h3 id="pending-requests-count" class="text-warning">-</h3>
                                <p class="mb-0">Solicitudes Pendientes</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card fishing-card text-center">
                            <div class="card-body">
                                <h3 id="sent-requests-count" class="text-info">-</h3>
                                <p class="mb-0">Solicitudes Enviadas</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <!-- 👥 AGREGAR AMIGOS -->
                    <div class="col-lg-4 mb-4">
                        <div class="card fishing-card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-user-plus me-2"></i>
                                    Agregar Amigos
                                </h5>
                            </div>
                            <div class="card-body">
                                <form id="add-friend-form">
                                    <div class="mb-3">
                                        <label for="friend-email" class="form-label">
                                            <i class="fas fa-envelope me-1"></i>
                                            Email del usuario
                                        </label>
                                        <input 
                                            type="email" 
                                            class="form-control" 
                                            id="friend-email" 
                                            placeholder="ejemplo@email.com"
                                            required
                                        >
                                        <div class="form-text">
                                            Ingresa el email del usuario que quieres agregar como amigo
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">
                                        <i class="fas fa-paper-plane me-1"></i>
                                        Enviar Solicitud
                                    </button>
                                </form>

                                <hr class="my-4">
                            </div>
                        </div>
                    </div>

                    <!-- 📥 SOLICITUDES PENDIENTES -->
                    <div class="col-lg-4 mb-4">
                        <div class="card fishing-card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-clock me-2"></i>
                                    Solicitudes Pendientes
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="pending-requests-list">
                                    <div class="text-center py-3">
                                        <div class="loading-spinner"></div>
                                        <p class="text-muted mt-2">Cargando solicitudes...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 📤 SOLICITUDES ENVIADAS -->
                        <div class="card fishing-card mt-4">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-share me-2"></i>
                                    Solicitudes Enviadas
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="sent-requests-list">
                                    <div class="text-center py-3">
                                        <div class="loading-spinner"></div>
                                        <p class="text-muted mt-2">Cargando solicitudes enviadas...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 👪 LISTA DE AMIGOS -->
                    <div class="col-lg-4 mb-4">
                        <div class="card fishing-card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-users me-2"></i>
                                    Mis Amigos
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="friends-list">
                                    <div class="text-center py-3">
                                        <div class="loading-spinner"></div>
                                        <p class="text-muted mt-2">Cargando amigos...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 📊 CARGAR DATOS DE AMIGOS
    async loadFriendsData() {
        try {
            await Promise.all([
                this.loadFriendsStats(),
                this.loadFriendsList(),
                this.loadPendingRequests(),
                this.loadSentRequests()
            ]);
        } catch (error) {
            console.error('❌ Error cargando datos de amigos:', error);
            this.app.showNotification('Error cargando datos de amigos', 'error');
        }
    }

    // 📈 CARGAR ESTADÍSTICAS
    async loadFriendsStats() {
        try {
            const statsData = await this.friendsManager.getFriendsStats();
            console.log('📊 Respuesta de estadísticas:', statsData);
            
            if (statsData && (statsData.success || statsData.friends !== undefined)) {
                const friendsCount = statsData.friends || statsData.stats?.friends || 0;
                const pendingCount = statsData.pendingRequests || statsData.stats?.pendingRequests || 0;
                const sentCount = statsData.sentRequests || statsData.stats?.sentRequests || 0;
                
                document.getElementById('friends-count').textContent = friendsCount;
                document.getElementById('pending-requests-count').textContent = pendingCount;
                document.getElementById('sent-requests-count').textContent = sentCount;
            }
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    }

    // 👪 CARGAR LISTA DE AMIGOS
    async loadFriendsList() {
        try {
            const friendsData = await this.friendsManager.getFriendsList();
            console.log('👥 Respuesta de amigos:', friendsData);
            
            const friendsList = document.getElementById('friends-list');
            
            const friendsArray = this.extractArrayFromResponse(friendsData, 'friends');
            
            if (friendsArray && friendsArray.length > 0) {
                friendsList.innerHTML = friendsArray.map(friend => {
                    const friendId = friend.id || friend.friend_id || friend.user_id;
                    return `
                    <div class="friend-item d-flex justify-content-between align-items-center p-3 border-bottom">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${friend.name || friend.email}</h6>
                            <p class="mb-1 text-muted small">${friend.email}</p>
                            ${friend.city ? `<p class="mb-0 text-muted small"><i class="fas fa-map-marker-alt me-1"></i>${friend.city}${friend.province ? ', ' + friend.province : ''}</p>` : ''}
                            ${friend.experience ? `<p class="mb-0 text-muted small"><i class="fas fa-star me-1"></i>${friend.experience}</p>` : ''}
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-outline-primary btn-sm" onclick="app.friendsUI.viewFriendSpots(${friendId})" title="Ver spots">
                                <i class="fas fa-map-marker-alt"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="app.friendsUI.removeFriend(${friendId})" title="Eliminar amigo">
                                <i class="fas fa-user-times"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('');
            } else {
                friendsList.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-users fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No tienes amigos agregados aún.</p>
                        <small class="text-muted">Agrega amigos para compartir tus spots de pesca.</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error cargando lista de amigos:', error);
            document.getElementById('friends-list').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error cargando la lista de amigos
                </div>
            `;
        }
    }

    // 📥 CARGAR SOLICITUDES PENDIENTES
    async loadPendingRequests() {
        try {
            const requestsData = await this.friendsManager.getPendingRequests();
            console.log('📥 Respuesta de solicitudes pendientes:', requestsData);
            
            const requestsList = document.getElementById('pending-requests-list');
            
            const requestsArray = this.extractArrayFromResponse(requestsData, 'requests', 'pendingRequests');
            
            if (requestsArray && requestsArray.length > 0) {
                requestsList.innerHTML = requestsArray.map(request => {
                    const requestId = request.id || request.request_id;
                    return `
                    <div class="request-item d-flex justify-content-between align-items-center p-3 border-bottom">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${request.from_user_name || request.fromUserName || request.fromUserEmail || 'Usuario'}</h6>
                            <p class="mb-1 text-muted small">${request.from_user_email || request.fromUserEmail}</p>
                            <p class="mb-0 text-muted small"><i class="fas fa-clock me-1"></i>${new Date(request.created_at || request.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-success btn-sm" onclick="app.friendsUI.acceptRequest(${requestId})" title="Aceptar">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="app.friendsUI.rejectRequest(${requestId})" title="Rechazar">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('');
            } else {
                requestsList.innerHTML = `
                    <div class="text-center py-3">
                        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay solicitudes pendientes</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error cargando solicitudes pendientes:', error);
            document.getElementById('pending-requests-list').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error cargando las solicitudes pendientes
                </div>
            `;
        }
    }

    // 📤 CARGAR SOLICITUDES ENVIADAS
    async loadSentRequests() {
        try {
            const requestsData = await this.friendsManager.getSentRequests();
            console.log('📤 Respuesta de solicitudes enviadas:', requestsData);
            
            const requestsList = document.getElementById('sent-requests-list');
            
            const requestsArray = this.extractArrayFromResponse(requestsData, 'requests', 'sentRequests');
            
            if (requestsArray && requestsArray.length > 0) {
                requestsList.innerHTML = requestsArray.map(request => `
                    <div class="request-item d-flex justify-content-between align-items-center p-3 border-bottom">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${request.to_user_name || request.toUserName || request.toUserEmail || 'Usuario'}</h6>
                            <p class="mb-1 text-muted small">${request.to_user_email || request.toUserEmail}</p>
                            <p class="mb-0 text-muted small"><i class="fas fa-clock me-1"></i>${new Date(request.created_at || request.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div class="text-warning">
                            <i class="fas fa-clock" title="Pendiente"></i>
                        </div>
                    </div>
                `).join('');
            } else {
                requestsList.innerHTML = `
                    <div class="text-center py-3">
                        <i class="fas fa-paper-plane fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay solicitudes enviadas</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error cargando solicitudes enviadas:', error);
            document.getElementById('sent-requests-list').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error cargando las solicitudes enviadas
                </div>
            `;
        }
    }

    // ✅ MÉTODO: Extraer array de diferentes estructuras de respuesta
    extractArrayFromResponse(response, ...possibleKeys) {
        if (!response) return null;
        
        if (Array.isArray(response)) {
            return response;
        }
        
        for (const key of possibleKeys) {
            if (response[key] && Array.isArray(response[key])) {
                return response[key];
            }
        }
        
        if (response.success && response.data && Array.isArray(response.data)) {
            return response.data;
        }
        
        console.warn('⚠️ No se pudo extraer array de la respuesta:', response);
        return null;
    }

    // 🎯 CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        const addFriendForm = document.getElementById('add-friend-form');
        if (addFriendForm) {
            addFriendForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSendFriendRequest();
            });
        }

        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            let searchTimeout;
            userSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length >= 3) {
                    searchTimeout = setTimeout(() => {
                        this.handleUserSearch(query);
                    }, 500);
                } else {
                    document.getElementById('search-results').innerHTML = '';
                }
            });
        }
    }

    // 🔍 MANEJAR BÚSQUEDA DE USUARIOS
    async handleUserSearch(query) {
        try {
            const searchResults = document.getElementById('search-results');
            searchResults.innerHTML = `
                <div class="text-center">
                    <div class="loading-spinner small"></div>
                    <p class="text-muted mt-2">Buscando usuarios...</p>
                </div>
            `;

            const searchData = await this.friendsManager.searchUsers(query);
            console.log('🔍 Respuesta de búsqueda:', searchData);
            
            const usersArray = this.extractArrayFromResponse(searchData, 'users', 'results');
            
            if (usersArray && usersArray.length > 0) {
                searchResults.innerHTML = `
                    <h6 class="mb-3">Resultados de búsqueda:</h6>
                    ${usersArray.map(user => `
                        <div class="user-result d-flex justify-content-between align-items-center p-2 border rounded mb-2">
                            <div>
                                <strong>${user.name || 'Usuario'}</strong>
                                <br>
                                <small class="text-muted">${user.email}</small>
                                ${user.city ? `<br><small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i>${user.city}</small>` : ''}
                            </div>
                            <button class="btn btn-primary btn-sm" onclick="app.friendsUI.sendRequestToUser('${user.email}')">
                                <i class="fas fa-user-plus me-1"></i>Agregar
                            </button>
                        </div>
                    `).join('')}
                `;
            } else {
                searchResults.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No se encontraron usuarios para "${query}"
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error en búsqueda de usuarios:', error);
            document.getElementById('search-results').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error en la búsqueda
                </div>
            `;
        }
    }

    // 📤 MANEJAR ENVÍO DE SOLICITUD DE AMISTAD - COMPLETAMENTE CORREGIDO
    async handleSendFriendRequest() {
        const emailInput = document.getElementById('friend-email');
        const email = emailInput.value.trim();

        console.log('🔍 [DEBUG] handleSendFriendRequest iniciado');
        console.log('📧 Valor del input:', emailInput.value);
        console.log('📧 Email después de trim:', email);
        console.log('📧 Longitud del email:', email.length);

        if (!email) {
            console.log('❌ Email está vacío en la validación');
            this.app.showNotification('Por favor ingresa un email válido', 'warning');
            emailInput.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ Email no pasa la validación regex');
            this.app.showNotification('Por favor ingresa un email válido', 'warning');
            emailInput.focus();
            return;
        }

        console.log('✅ Email válido, procediendo a enviar...');

        try {
            const result = await this.friendsManager.sendFriendRequest(email);
            console.log('📧 Resultado del envío:', result);
            
            if (result.success) {
                this.app.showNotification('✅ Solicitud de amistad enviada', 'success');
                emailInput.value = '';
                this.loadFriendsData();
            } else {
                this.app.showNotification(`❌ ${result.message || 'Error enviando solicitud'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error enviando solicitud:', error);
            this.app.showNotification(`❌ ${error.message || 'Error enviando solicitud de amistad'}`, 'error');
        }
    }

    // 🎯 ENVIAR SOLICITUD A USUARIO ESPECÍFICO
    async sendRequestToUser(email) {
        console.log('🎯 Enviando solicitud a usuario específico:', email);
        
        if (!email) {
            this.app.showNotification('Email no válido', 'error');
            return;
        }

        try {
            const result = await this.friendsManager.sendFriendRequest(email);
            
            if (result.success) {
                this.app.showNotification('✅ Solicitud de amistad enviada', 'success');
                document.getElementById('search-results').innerHTML = '';
                document.getElementById('user-search').value = '';
                this.loadFriendsData();
            } else {
                this.app.showNotification(`❌ ${result.message || 'Error enviando solicitud'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error enviando solicitud:', error);
            this.app.showNotification(`❌ ${error.message || 'Error enviando solicitud de amistad'}`, 'error');
        }
    }

    // ✅ ACEPTAR SOLICITUD - ACTUALIZADO PARA RECARGAR SPOTS
    async acceptRequest(requestId) {
        try {
            const result = await this.friendsManager.acceptFriendRequest(requestId);
            
            if (result.success) {
                this.app.showNotification('✅ Solicitud de amistad aceptada. Actualizando spots...', 'success');
                
                // Recargar datos de amigos
                await this.loadFriendsData();
                
                // 🔄 ACTUALIZAR SPOTS EN EL MAPA SI ESTÁ DISPONIBLE
                if (this.app.mapModule && typeof this.app.mapModule.loadSpots === 'function') {
                    console.log('🔄 Recargando spots en el mapa...');
                    setTimeout(() => {
                        this.app.mapModule.loadSpots();
                        this.app.showNotification('🗺️ Spots actualizados con los nuevos spots de amigos', 'info');
                    }, 1000);
                } else {
                    console.log('ℹ️ Módulo de mapa no disponible, no se pueden recargar spots automáticamente');
                    this.app.showNotification('✅ Amistad aceptada. Ve al mapa para ver los nuevos spots.', 'info');
                }
                
            } else {
                this.app.showNotification(`❌ ${result.message || 'Error aceptando solicitud'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error aceptando solicitud:', error);
            this.app.showNotification('❌ Error aceptando solicitud de amistad', 'error');
        }
    }

    // ❌ RECHAZAR SOLICITUD
    async rejectRequest(requestId) {
        try {
            const result = await this.friendsManager.rejectFriendRequest(requestId);
            
            if (result.success) {
                this.app.showNotification('✅ Solicitud de amistad rechazada', 'success');
                this.loadFriendsData();
            } else {
                this.app.showNotification(`❌ ${result.message || 'Error rechazando solicitud'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error rechazando solicitud:', error);
            this.app.showNotification('❌ Error rechazando solicitud de amistad', 'error');
        }
    }

    // 🗑️ ELIMINAR AMIGO
    async removeFriend(friendId) {
        if (!confirm('¿Estás seguro de que quieres eliminar a este amigo?')) {
            return;
        }

        try {
            const result = await this.friendsManager.removeFriend(friendId);
            
            if (result.success) {
                this.app.showNotification('✅ Amigo eliminado correctamente', 'success');
                this.loadFriendsData();
                
                // 🔄 ACTUALIZAR SPOTS EN EL MAPA SI ESTÁ DISPONIBLE
                if (this.app.mapModule && typeof this.app.mapModule.loadSpots === 'function') {
                    console.log('🔄 Recargando spots después de eliminar amigo...');
                    setTimeout(() => {
                        this.app.mapModule.loadSpots();
                    }, 1000);
                }
            } else {
                this.app.showNotification(`❌ ${result.message || 'Error eliminando amigo'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error eliminando amigo:', error);
            this.app.showNotification('❌ Error eliminando amigo', 'error');
        }
    }

    // 🎣 VER SPOTS DE AMIGO - ACTUALIZADO
    async viewFriendSpots(friendId) {
        this.app.showNotification('🔍 Cargando spots del amigo...', 'info');
        
        // 🔄 ACTUALIZAR SPOTS EN EL MAPA SI ESTÁ DISPONIBLE
        if (this.app.mapModule && typeof this.app.mapModule.loadSpots === 'function') {
            // Podrías implementar aquí un filtro para mostrar solo los spots de este amigo
            setTimeout(() => {
                this.app.mapModule.loadSpots();
                this.app.showNotification('🗺️ Mostrando spots del amigo', 'info');
            }, 500);
        }
        
        this.app.router.navigate('/mapa');
    }
}