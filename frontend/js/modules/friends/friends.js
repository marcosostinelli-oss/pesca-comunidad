// frontend/js/modules/friends/friends.js
export class FriendsManager {
    constructor(app) {
        this.app = app;
    }

    // Obtener estadísticas de amigos
    async getFriendsStats() {
        try {
            const response = await this.app.auth.authenticatedFetch('/friends/stats');
            if (!response.ok) {
                throw new Error(`Error ${response.status} obteniendo estadísticas`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            throw new Error(`Error obteniendo estadísticas: ${error.message}`);
        }
    }

    // Obtener lista de amigos
    async getFriendsList() {
        try {
            const response = await this.app.auth.authenticatedFetch('/friends/list');
            if (!response.ok) {
                throw new Error(`Error ${response.status} obteniendo amigos`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error obteniendo lista de amigos:', error);
            throw new Error(`Error obteniendo amigos: ${error.message}`);
        }
    }

    // Obtener solicitudes pendientes
    async getPendingRequests() {
        try {
            const response = await this.app.auth.authenticatedFetch('/friends/pending-requests');
            if (!response.ok) {
                throw new Error(`Error ${response.status} obteniendo solicitudes`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error obteniendo solicitudes pendientes:', error);
            throw new Error(`Error obteniendo solicitudes: ${error.message}`);
        }
    }

    // Obtener solicitudes enviadas
    async getSentRequests() {
        try {
            const response = await this.app.auth.authenticatedFetch('/friends/sent-requests');
            if (!response.ok) {
                throw new Error(`Error ${response.status} obteniendo solicitudes enviadas`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error obteniendo solicitudes enviadas:', error);
            throw new Error(`Error obteniendo solicitudes enviadas: ${error.message}`);
        }
    }

    // Enviar solicitud de amistad
    async sendFriendRequest(email) {
        try {
            console.log('🔍 [DEBUG] sendFriendRequest');
            console.log('📧 Email recibido:', email);
            
            if (!email || email.trim() === '') {
                throw new Error('El email no puede estar vacío');
            }

            const emailTrimmed = email.trim();
            
            const requestBody = {
                friendEmail: emailTrimmed
            };

            console.log('📧 Request body:', requestBody);
            
            const response = await this.app.auth.authenticatedFetch('/friends/send-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📧 Respuesta del servidor - Status:', response.status);
            console.log('📧 Respuesta del servidor - OK:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response text:', errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                
                throw new Error(errorData.message || errorData.error || `Error ${response.status} enviando solicitud`);
            }

            const result = await response.json();
            console.log('✅ Resultado exitoso:', result);
            return result;
        } catch (error) {
            console.error('❌ Error enviando solicitud de amistad:', error);
            throw error;
        }
    }

    // Aceptar solicitud de amistad - CORREGIDO: requestId en lugar de request_id
    async acceptFriendRequest(requestId) {
        try {
            console.log('✅ Aceptando solicitud ID:', requestId);
            
            const requestBody = {
                requestId: requestId // CORREGIDO: camelCase
            };

            const response = await this.app.auth.authenticatedFetch('/friends/accept-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status} aceptando solicitud`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error aceptando solicitud de amistad:', error);
            throw error;
        }
    }

    // Rechazar solicitud de amistad - CORREGIDO: requestId en lugar de request_id
    async rejectFriendRequest(requestId) {
        try {
            console.log('❌ Rechazando solicitud ID:', requestId);
            
            const requestBody = {
                requestId: requestId // CORREGIDO: camelCase
            };

            const response = await this.app.auth.authenticatedFetch('/friends/reject-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status} rechazando solicitud`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error rechazando solicitud de amistad:', error);
            throw error;
        }
    }

    // Cancelar solicitud enviada - CORREGIDO: requestId en lugar de request_id
    async cancelFriendRequest(requestId) {
        try {
            console.log('🗑️ Cancelando solicitud ID:', requestId);
            
            const requestBody = {
                requestId: requestId // CORREGIDO: camelCase
            };

            const response = await this.app.auth.authenticatedFetch('/friends/cancel-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status} cancelando solicitud`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error cancelando solicitud de amistad:', error);
            throw error;
        }
    }

    // Eliminar amigo - CORREGIDO: friendId en lugar de friend_id
    async removeFriend(friendId) {
        try {
            console.log('🗑️ Eliminando amigo ID:', friendId);
            
            const requestBody = {
                friendId: friendId // CORREGIDO: camelCase
            };

            const response = await this.app.auth.authenticatedFetch('/friends/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status} eliminando amigo`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error eliminando amigo:', error);
            throw error;
        }
    }

    // Buscar usuarios
    async searchUsers(query) {
        try {
            const response = await this.app.auth.authenticatedFetch(`/friends/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status} buscando usuarios`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error buscando usuarios:', error);
            throw error;
        }
    }
}